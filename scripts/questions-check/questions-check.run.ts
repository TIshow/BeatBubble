// Are the questioner's questions true to the song, and open? (#151, idea ④)
//
//   pnpm questions-check
//
// Each song is asked about once (about 15 requests, under a yen). Unlike the
// listener check this is not a blind test: a question's premise ("the last
// four beats hold a high ド") can be checked against the score, so the page
// puts each song's score next to its questions for a reviewer to verify.
// Questions using feeling or scene words are marked, because those are where
// a question can slip from asking into assuming ("was this the sad part?").
//
// Same switches as the listener check: dry without a key or with
// LISTEN_CHECK_DRY_RUN=1, and a dry run writes to its own folder.

import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { askQuestioner, type QuestionResult } from "@/ai/askQuestioner";
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

// Feeling and scene words: a question holding one may be suggesting the answer.
// Marked for the reviewer, not dropped — "どんな きもちで？" is the open form.
const FEELING_WORDS = ["かなし", "悲し", "こわ", "怖", "たのし", "楽し", "うれし", "さみし", "さびし", "しずか", "にぎやか", "げんき", "元気"];
const mentionsFeeling = (text: string) => FEELING_WORDS.some((w) => text.includes(w));

it("questions check", async () => {
  const dryRun = isDryRun();
  const client: ModelClient = dryRun
    ? dryRunClient((tempo) => ({
        questions: [{ place: "1拍目", question: `（おためし）テンポ ${tempo} の さいしょは どんな つもり？` }],
      }))
    : new Anthropic();
  const subjects: Subject[] = [...writtenSongs(), ...(await teacherTemplates())];
  const DIR = outputDir();
  mkdirSync(DIR, { recursive: true });

  const rows: (Omit<Subject, "song"> & { score: string; result: QuestionResult })[] = [];
  for (const { song, ...subject } of subjects) {
    rows.push({ ...subject, score: scoreToText(song), result: await askQuestioner(client, song) });
  }

  const sections = rows
    .map((row, i) => {
      const listen = row.listenUrl ? ` <a href="${escapeHtml(row.listenUrl)}" target="_blank">▶ ひらく</a>` : "";
      const questions =
        row.result.questions.length === 0
          ? "<p>（質問なし）</p>"
          : `<ol>${row.result.questions
              .map(
                (q) =>
                  `<li${mentionsFeeling(q.question) ? ' class="feeling"' : ""}><b>${escapeHtml(q.place)}</b> ${escapeHtml(q.question)}</li>`
              )
              .join("")}</ol>`;
      const dropped =
        row.result.dropped.length === 0
          ? ""
          : `<p class="dropped">検査で落とした: ${row.result.dropped
              .map((d) => `${escapeHtml(d.question.place)}「${escapeHtml(d.question.question)}」(${d.reason})`)
              .join(" ／ ")}</p>`;
      return `<section><h2>${i + 1}. ${escapeHtml(row.id)}</h2><p>${escapeHtml(row.reference)}${listen}</p>
${questions}${dropped}
<details><summary>楽譜</summary><pre>${escapeHtml(row.score)}</pre></details></section>`;
    })
    .join("\n");
  writeFileSync(
    join(DIR, "questions.html"),
    `<!doctype html><meta charset="utf-8"><title>問いかけの確認</title>
<style>body{font-family:sans-serif;max-width:860px;margin:2em auto;padding:0 1em}
section{border-top:1px solid #ccc;padding:1em 0}pre{font-size:12px;white-space:pre-wrap}
li{margin:.4em 0}.feeling{background:#fff3cd}.dropped{color:#a33;font-size:13px}</style>
<h1>問いかけの確認</h1>
<p>それぞれの質問について、① 前提（その場所で起きていること）が楽譜と合っているか、② 答えを決めつけていないか、を見てください。黄色は気持ちや情景のことばを含む質問です（決めつけになっていないか特に注意）。</p>
${sections}`
  );
  writeFileSync(join(DIR, "questions.json"), JSON.stringify(rows, null, 2));

  const results = rows.map((r) => r.result);
  const questions = results.flatMap((r) => r.questions);
  const summary = [
    `${dryRun ? "DRY RUN — no API key, stand-in questioner, nothing spent" : `model: ${AI_MODEL}`} / songs: ${rows.length} / requests: ${results.length}`,
    `songs with no question: ${results.filter((r) => r.questions.length === 0).length} (refused: ${results.filter((r) => r.refused).length})`,
    `questions kept: ${questions.length} / marked as feeling or scene words: ${questions.filter((q) => mentionsFeeling(q.question)).length}`,
    `questions dropped by the filter: ${countReasons(results.flatMap((r) => r.dropped.map((d) => d.reason)))}`,
    costLine(results.map((r) => r.usage)),
  ].join("\n");
  writeFileSync(join(DIR, "questions-summary.txt"), summary);
  console.log(summary);
}, 30 * 60_000);
