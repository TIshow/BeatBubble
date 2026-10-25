// Are the companion's lines true to the song, friendly, and free of praise —
// and are its suggestions things to try rather than answers? (#151, #161)
//
//   pnpm friend-check
//
// Each song is asked about once (about 15 requests, around a yen). Like the
// questions check this is reviewed by hand: the page puts each song's score
// beside the line the companion would say, and the candidates the filter
// dropped, so every premise can be checked against the notes.
//
// Same switches as the other checks: dry without a key or with
// LISTEN_CHECK_DRY_RUN=1, and a dry run writes to its own folder.

import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { askFriend, type FriendResult } from "@/ai/askFriend";
import { FRIEND_KINDS, type FriendKind, type FriendLine } from "@/ai/friend";
import { AI_MODEL, type ModelClient } from "@/ai/model";
import { scoreToText } from "@/ai/scoreText";
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

const KIND_LABEL: Record<FriendKind, string> = {
  notice: "気づき",
  impression: "感想",
  suggestion: "ためしてみる",
};

// Marked for the reviewer, not dropped: where a line may slip from the
// companion's reaction into deciding the song's mood or scene (which the model
// can't hear), or the companion talks about itself as ぼく／わたし.
const MOOD_OR_SCENE = ["かなし", "悲し", "さみし", "さびし", "こわ", "怖", "たのし", "楽し", "うれし", "あかる", "くら", "みたい", "ような"];
const SELF = ["ぼく", "わたし", "おれ"];
const marks = (line: FriendLine) =>
  [
    MOOD_OR_SCENE.some((w) => line.line.includes(w)) ? "mood" : "",
    SELF.some((w) => line.line.includes(w)) ? "self" : "",
  ].filter(Boolean);

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

it("friend check", async () => {
  const dryRun = isDryRun();
  const client: ModelClient = dryRun
    ? dryRunClient((tempo) => ({
        notices: [{ beats: "1拍目", line: `（おためし）テンポ ${tempo} だね` }],
        impressions: [{ beats: "1拍目", line: "（おためし）さいしょで びっくりした！" }],
        suggestions: [{ beats: "1拍目", line: "（おためし）さいしょを ながく したら どうなるかな？" }],
      }))
    : new Anthropic();
  const subjects: Subject[] = [...writtenSongs(), ...(await teacherTemplates())];
  const DIR = outputDir();
  mkdirSync(DIR, { recursive: true });

  // How long each request took: what a child spends looking at 「どれどれ…」.
  const rows: (Omit<Subject, "song"> & { score: string; result: FriendResult; ms: number })[] = [];
  for (const { song, ...subject } of subjects) {
    const started = Date.now();
    const result = await askFriend(client, song);
    rows.push({ ...subject, score: scoreToText(song), result, ms: Date.now() - started });
  }

  const sections = rows
    .map((row, i) => {
      const listen = row.listenUrl ? ` <a href="${escapeHtml(row.listenUrl)}" target="_blank">▶ ひらく</a>` : "";
      const said =
        row.result.lines.length === 0
          ? "<p>（ひとことなし）</p>"
          : `<ol>${row.result.lines
              .map(
                (l) =>
                  `<li class="line ${marks(l).join(" ")}"><span class="kind">${KIND_LABEL[l.kind]}</span> <b>${escapeHtml(l.place)}</b> ${escapeHtml(l.line)}</li>`
              )
              .join("")}</ol>`;
      const dropped =
        row.result.dropped.length === 0
          ? ""
          : `<p class="dropped">落とした候補: ${row.result.dropped
              .map((d) => `${KIND_LABEL[d.line.kind]} ${escapeHtml(d.line.place)}「${escapeHtml(d.line.line)}」(${d.reason})`)
              .join(" ／ ")}</p>`;
      return `<section><h2>${i + 1}. ${escapeHtml(row.id)}</h2><p>${escapeHtml(row.reference)}${listen}</p>
${said}${dropped}
<details><summary>楽譜</summary><pre>${escapeHtml(row.score)}</pre></details></section>`;
    })
    .join("\n");
  writeFileSync(
    join(DIR, "friend.html"),
    `<!doctype html><meta charset="utf-8"><title>相棒のひとことの確認</title>
<style>body{font-family:sans-serif;max-width:860px;margin:2em auto;padding:0 1em}
section{border-top:1px solid #ccc;padding:1em 0}pre{font-size:12px;white-space:pre-wrap}
.line{font-size:18px;margin:.4em 0}.kind{font-size:12px;padding:1px 6px;border-radius:8px;background:#eee}
.mood,.self{background:#fff3cd}.dropped{color:#a33;font-size:13px}</style>
<h1>相棒のひとことの確認</h1>
<p>タップするごとに上から順に1つずつ出ます（気づき → 感想 → ためしてみる）。それぞれについて、① 楽譜の事実（前提）が合っているか、② ほめたり評価したりしていないか、③ 友だちらしい話しかけか、を見てください。感想は、曲の気持ちや場面を決めつけていないか（相棒自身の反応か）。ためしてみるは、答え（どの音に・そのほうが良い）になっていないか。黄色は、気持ち・場面のことばか「ぼく／わたし」を含む行です。</p>
${sections}`
  );
  writeFileSync(join(DIR, "friend.json"), JSON.stringify(rows, null, 2));

  const results = rows.map((r) => r.result);
  const summary = [
    `${dryRun ? "DRY RUN — no API key, stand-in companion, nothing spent" : `model: ${AI_MODEL}`} / songs: ${rows.length} / requests: ${results.length}`,
    `songs with no line: ${results.filter((r) => r.lines.length === 0).length} (refused: ${results.filter((r) => r.refused).length})`,
    `lines kept: ${results.reduce((n, r) => n + r.lines.length, 0)} (${FRIEND_KINDS.map((k) => `${k} ${results.filter((r) => r.lines.some((l) => l.kind === k)).length}`).join(" / ")} songs)`,
    `marked for review: mood or scene words ${results.flatMap((r) => r.lines).filter((l) => marks(l).includes("mood")).length} / ぼく・わたし ${results.flatMap((r) => r.lines).filter((l) => marks(l).includes("self")).length}`,
    `candidates dropped by the filter: ${countReasons(results.flatMap((r) => r.dropped.map((d) => d.reason)))}`,
    `seconds per request: median ${(median(rows.map((r) => r.ms)) / 1000).toFixed(1)} / slowest ${(Math.max(...rows.map((r) => r.ms)) / 1000).toFixed(1)}`,
    costLine(results.map((r) => r.usage)),
  ].join("\n");
  writeFileSync(join(DIR, "friend-summary.txt"), summary);
  console.log(summary);
}, 30 * 60_000);
