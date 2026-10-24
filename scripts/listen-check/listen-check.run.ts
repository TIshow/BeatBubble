// Does the listener actually read the notes? (#151, step 1)
//
//   pnpm listen-check
//
// With ANTHROPIC_API_KEY set (shell or .env.local) it calls the API: about 45
// requests, a few yen. Without one — or with LISTEN_CHECK_DRY_RUN=1, which wins
// even when a key is configured — it runs end to end against a stand-in
// listener, so the sheet and summary can be checked before anything is spent.
//
// For each song the listener hears three things: the song, the song again, and
// a copy whose melody pitches and positions are shuffled (tempo, instrument,
// drums and the set of note lengths unchanged). If the model only reads tempo
// and instrument, the shuffled copy gets the same kind of scene.
//
// Two readings come out of it:
// - sheet.html — for a person: the song's intended scene (or a link to play a
//   template) and two impression sets, A and B, in random order. Which one came
//   from the real song is in answers.json, not on the sheet.
// - summary.txt — a rough automatic signal: how alike the impressions of the
//   song and its repeat are, against the song and its shuffled copy.
//
// Runs under Vitest only because that is what already resolves the "@/" paths;
// it is not part of the test suite (see vitest.scripts.config.ts).

import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Song } from "@/core/types";
import { totalSteps } from "@/core/utils";
import type { Impression } from "@/ai/listen";
import { askListener, type ListenResult } from "@/ai/askListener";
import { AI_MODEL, type ModelClient } from "@/ai/model";
import {
  costLine,
  countReasons,
  dryRunClient,
  escapeHtml,
  isDryRun,
  outputDir,
  teacherTemplates,
  writtenSongs,
  type Subject,
} from "../lib/aiCheck";

// Seeded so a rerun shuffles the same way.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shuffledMelody(song: Song, rand: () => number): Song {
  const notes = song.melody.notes;
  const pitches = shuffle(notes.map((n) => n.note), rand);
  const starts = shuffle(notes.map((n) => n.startStep), rand);
  const end = totalSteps(song);
  return {
    ...song,
    melody: {
      notes: notes.map((n, i) => ({
        ...n,
        note: pitches[i],
        startStep: starts[i],
        durationSteps: Math.min(n.durationSteps, end - starts[i]),
      })),
    },
  };
}

// Character-bigram overlap (Jaccard) of all scenes and reasons together. Crude,
// but it needs no second model to judge the first.
function similarity(a: Impression[], b: Impression[]): number {
  const grams = (items: Impression[]) => {
    const text = items.map((i) => i.scene + i.because).join("").replace(/\s/g, "");
    return new Set(Array.from({ length: Math.max(text.length - 1, 0) }, (_, k) => text.slice(k, k + 2)));
  };
  const x = grams(a);
  const y = grams(b);
  if (x.size === 0 || y.size === 0) return 0;
  const shared = [...x].filter((g) => y.has(g)).length;
  return shared / (x.size + y.size - shared);
}

function impressionList(result: ListenResult): string {
  if (result.impressions.length === 0) return "<p>（返事なし）</p>";
  return `<ol>${result.impressions
    .map((i) => `<li><b>${escapeHtml(i.scene)}</b><br><small>${escapeHtml(i.because)}</small></li>`)
    .join("")}</ol>`;
}

it("listen check", async () => {
  const dryRun = isDryRun();
  const client: ModelClient = dryRun
    ? dryRunClient((tempo) => ({
        impressions: [{ scene: `（おためし）テンポ ${tempo} の ようす`, because: "おためし実行なので AI は使っていない" }],
      }))
    : new Anthropic();
  const subjects: Subject[] = [...writtenSongs(), ...(await teacherTemplates())];
  const DIR = outputDir();
  const rand = seeded(20261024);
  mkdirSync(DIR, { recursive: true });

  // What each song came back with. The song itself stays out: results.json is
  // for reading the answers, and the notes are in the source and the database.
  const rows: (Omit<Subject, "song"> & {
    real: ListenResult;
    again: ListenResult;
    shuffled: ListenResult;
    realIs: "A" | "B";
  })[] = [];
  for (const { song, ...subject } of subjects) {
    const [real, again, shuffled] = await Promise.all([
      askListener(client, song),
      askListener(client, song),
      askListener(client, shuffledMelody(song, rand)),
    ]);
    rows.push({ ...subject, real, again, shuffled, realIs: rand() < 0.5 ? "A" : "B" });
  }

  const sheet = rows
    .map((row, i) => {
      const [a, b] = row.realIs === "A" ? [row.real, row.shuffled] : [row.shuffled, row.real];
      const listen = row.listenUrl ? ` <a href="${escapeHtml(row.listenUrl)}" target="_blank">▶ ひらく</a>` : "";
      return `<section><h2>${i + 1}</h2><p>${escapeHtml(row.reference)}${listen}</p>
<div class="pair"><div><h3>A</h3>${impressionList(a)}</div><div><h3>B</h3>${impressionList(b)}</div></div>
<p>この曲に あうのは: <label><input type="radio" name="q${i + 1}" value="A"> A</label>
<label><input type="radio" name="q${i + 1}" value="B"> B</label>
<label><input type="radio" name="q${i + 1}" value="?"> わからない</label></p></section>`;
    })
    .join("\n");
  writeFileSync(
    join(DIR, "sheet.html"),
    `<!doctype html><meta charset="utf-8"><title>聴き手の判定シート</title>
<style>body{font-family:sans-serif;max-width:860px;margin:2em auto;padding:0 1em}
section{border-top:1px solid #ccc;padding:1em 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:1em}
small{color:#666}#out{width:100%;height:4em}</style>
<h1>どちらの印象が、この曲のもの？</h1>
<p>それぞれの曲について、AI が聴いた印象が A・B の2組あります。片方は元の曲、もう片方は音の高さと位置をばらばらにした曲（テンポ・楽器・ドラムは同じ）への印象です。ねらいに合う方、または曲を聴いて合う方を選んでください。わからなければ「わからない」で構いません。</p>
${sheet}
<h2>結果</h2><p>選び終わったら、下の行をコピーして送ってください。</p>
<textarea id="out" readonly></textarea>
<script>document.addEventListener("change",()=>{document.getElementById("out").value=
[...document.querySelectorAll("section")].map((s,i)=>(i+1)+":"+((s.querySelector("input:checked")||{}).value||"-")).join(" ")});</script>`
  );
  writeFileSync(join(DIR, "answers.json"), JSON.stringify(Object.fromEntries(rows.map((r, i) => [i + 1, r.realIs])), null, 2));
  writeFileSync(join(DIR, "results.json"), JSON.stringify(rows, null, 2));

  const all = rows.flatMap((r) => [r.real, r.again, r.shuffled]);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(xs.length, 1);
  const repeat = rows.map((r) => similarity(r.real.impressions, r.again.impressions));
  const vsShuffled = rows.map((r) => similarity(r.real.impressions, r.shuffled.impressions));

  const summary = [
    `${dryRun ? "DRY RUN — no API key, stand-in listener, nothing spent" : `model: ${AI_MODEL}`} / songs: ${rows.length} / requests: ${all.length}`,
    `requests with no usable impression: ${all.filter((r) => r.impressions.length === 0).length} (refused: ${all.filter((r) => r.refused).length})`,
    `impressions dropped by the filter: ${countReasons(all.flatMap((r) => r.dropped.map((d) => d.reason)))}`,
    costLine(all.map((r) => r.usage)),
    "",
    "similarity of impressions (character bigrams, 0–1):",
    `  same song twice      mean ${mean(repeat).toFixed(3)}`,
    `  song vs shuffled     mean ${mean(vsShuffled).toFixed(3)}`,
    "  If these are close, the listener isn't hearing the notes — only what the shuffle kept.",
    "",
    ...rows.map((r, i) => `  ${String(i + 1).padStart(2)} ${r.id.padEnd(12)} twice ${repeat[i].toFixed(3)}  vs shuffled ${vsShuffled[i].toFixed(3)}`),
  ].join("\n");
  writeFileSync(join(DIR, "summary.txt"), summary);
  console.log(summary);
}, 30 * 60_000);
