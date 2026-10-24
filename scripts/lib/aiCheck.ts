// Shared by the AI checks (#151): the songs they run on, the cost of a run,
// and a stand-in model for running without spending anything.

import { migrateSong } from "@/core/legacy";
import type { Song } from "@/core/types";
import type { ModelClient, Usage } from "@/ai/model";
import { supabase } from "@/lib/supabase";
import { VALIDATION_SONGS } from "../listen-check/songs";

const CHECK_DIR = process.env.LISTEN_CHECK_DIR ?? ".listen-check";
// Where "open and listen" links point: the local dev server unless told
// otherwise (e.g. the deployed app).
const APP_URL = process.env.LISTEN_CHECK_APP_URL ?? "http://localhost:3000";

export type Subject = { id: string; reference: string; listenUrl?: string; song: Song };

// The songs written for the checks, each with the scene it was written to.
export function writtenSongs(): Subject[] {
  return VALIDATION_SONGS.map((s) => ({ id: s.id, reference: `つくった ねらい: ${s.intent}`, song: s.song }));
}

// The teachers' templates, read the way the app reads them: public rows, note
// data only. Titles and authors are never selected, just as they never reach
// the model.
export async function teacherTemplates(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("songs")
    .select("id, song_data")
    .eq("is_template", true)
    .eq("visibility", "public");
  if (error) throw error;
  return (data ?? []).map((row, i) => ({
    id: `template-${i + 1}`,
    reference: "先生のテンプレ（ひらいて聴く）",
    listenUrl: `${APP_URL}/?load=${row.id}`,
    song: migrateSong(row.song_data),
  }));
}

// A run is dry without a key, or with LISTEN_CHECK_DRY_RUN=1 — which wins even
// when a key is configured, so a check can be rehearsed without spending.
export const isDryRun = () =>
  process.env.LISTEN_CHECK_DRY_RUN === "1" || !process.env.ANTHROPIC_API_KEY;

// Where a run writes. A dry run gets its own folder: rehearsing a check must
// never overwrite the results of a real one (it did, once).
export const outputDir = () => (isDryRun() ? `${CHECK_DIR}/dry-run` : CHECK_DIR);

// Stands in for the API on a dry run: answers in the caller's shape, built
// from nothing but the tempo line, so a run exercises everything but the model.
export function dryRunClient(answer: (tempo: string) => unknown): ModelClient {
  return {
    messages: {
      parse: async (params: { messages: { content: string }[] }) => ({
        stop_reason: "end_turn",
        parsed_output: answer(params.messages[0].content.match(/テンポ: (\d+)/)?.[1] ?? "?"),
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    },
  } as unknown as ModelClient;
}

// Haiku 5.5, per million tokens (prompts under 100K tokens).
const PRICE = { input: 0.1, output: 0.5 };
const YEN_PER_DOLLAR = 150;

export function costLine(usages: Usage[]): string {
  const input = usages.reduce((sum, u) => sum + u.inputTokens, 0);
  const output = usages.reduce((sum, u) => sum + u.outputTokens, 0);
  const dollars = (input * PRICE.input + output * PRICE.output) / 1_000_000;
  return `tokens: input ${input} / output ${output} / ≈ $${dollars.toFixed(4)} (≈ ¥${(dollars * YEN_PER_DOLLAR).toFixed(1)})`;
}

export function countReasons(reasons: string[]): string {
  const counts = reasons.reduce<Record<string, number>>((acc, r) => {
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});
  return `${reasons.length}${Object.entries(counts)
    .map(([reason, n]) => ` / ${reason} ${n}`)
    .join("")}`;
}

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
