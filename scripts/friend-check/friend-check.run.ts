// Is the companion's line true to the song, friendly, and free of praise?
// (#151)
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

it("friend check", async () => {
  const dryRun = isDryRun();
  const client: ModelClient = dryRun
    ? dryRunClient((tempo) => ({ lines: [{ place: "1拍目", line: `（おためし）テンポ ${tempo} だね` }] }))
    : new Anthropic();
  const subjects: Subject[] = [...writtenSongs(), ...(await teacherTemplates())];
  const DIR = outputDir();
  mkdirSync(DIR, { recursive: true });

  const rows: (Omit<Subject, "song"> & { score: string; result: FriendResult })[] = [];
  for (const { song, ...subject } of subjects) {
    rows.push({ ...subject, score: scoreToText(song), result: await askFriend(client, song) });
  }

  const sections = rows
    .map((row, i) => {
      const listen = row.listenUrl ? ` <a href="${escapeHtml(row.listenUrl)}" target="_blank">▶ ひらく</a>` : "";
      const said =
        row.result.lines.length === 0
          ? "<p>（ひとことなし）</p>"
          : `<ol>${row.result.lines
              .map((l) => `<li class="line"><b>${escapeHtml(l.place)}</b> ${escapeHtml(l.line)}</li>`)
              .join("")}</ol>`;
      const dropped =
        row.result.dropped.length === 0
          ? ""
          : `<p class="dropped">落とした候補: ${row.result.dropped
              .map((d) => `${escapeHtml(d.line.place)}「${escapeHtml(d.line.line)}」(${d.reason})`)
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
.line{font-size:18px}.dropped{color:#a33;font-size:13px}</style>
<h1>相棒のひとことの確認</h1>
<p>タップするごとに上から順に1つずつ出ます。それぞれのひとことについて、① 気づいたこと（前提）が楽譜と合っているか、② ほめたり評価したりしていないか、③ 友だちらしい話しかけになっているか、を見てください。</p>
${sections}`
  );
  writeFileSync(join(DIR, "friend.json"), JSON.stringify(rows, null, 2));

  const results = rows.map((r) => r.result);
  const summary = [
    `${dryRun ? "DRY RUN — no API key, stand-in companion, nothing spent" : `model: ${AI_MODEL}`} / songs: ${rows.length} / requests: ${results.length}`,
    `songs with no line: ${results.filter((r) => r.lines.length === 0).length} (refused: ${results.filter((r) => r.refused).length})`,
    `lines kept: ${results.reduce((n, r) => n + r.lines.length, 0)} / asking a question: ${results.flatMap((r) => r.lines).filter((l) => /[？?]/.test(l.line)).length}`,
    `candidates dropped by the filter: ${countReasons(results.flatMap((r) => r.dropped.map((d) => d.reason)))}`,
    costLine(results.map((r) => r.usage)),
  ].join("\n");
  writeFileSync(join(DIR, "friend-summary.txt"), summary);
  console.log(summary);
}, 30 * 60_000);
