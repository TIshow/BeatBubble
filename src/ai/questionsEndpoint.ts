import { migrateSong } from "@/core/legacy";
import type { Song } from "@/core/types";
import { songWithinSizeLimit } from "@/lib/validation";
import type { QuestionResult } from "./askQuestioner";
import type { Question } from "./questions";

// What POST /api/ai/questions does, apart from the network (#151, idea ④).
// The route wires in the real quota check and model; tests wire in stand-ins.

// What ai_take_quota() (migration 0017) answers, plus "unavailable" for when
// it couldn't be asked.
export type QuotaStatus = "ok" | "signed-out" | "not-enabled" | "limit" | "unavailable";

export type EndpointDeps = {
  // Asked as the signed-in user whose token this is.
  takeQuota: (token: string) => Promise<QuotaStatus>;
  ask: (song: Song) => Promise<QuestionResult>;
};

export type EndpointReply =
  | { status: 200; body: { questions: Question[] } }
  | {
      status: 400 | 401 | 403 | 429 | 502 | 503;
      body: { error: Exclude<QuotaStatus, "ok"> | "bad-request" };
    };

function readSong(body: unknown): Song | null {
  const raw = (body as { song?: unknown } | null)?.song;
  if (!raw || typeof raw !== "object" || !songWithinSizeLimit(raw)) return null;
  try {
    return migrateSong(raw);
  } catch {
    return null;
  }
}

export async function answerQuestions(
  authorization: string | null,
  body: unknown,
  deps: EndpointDeps
): Promise<EndpointReply> {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return { status: 401, body: { error: "signed-out" } };

  // Checked before the quota, so a malformed request doesn't spend a class's
  // allowance.
  const song = readSong(body);
  if (!song) return { status: 400, body: { error: "bad-request" } };

  const quota = await deps.takeQuota(token);
  switch (quota) {
    case "ok":
      break;
    case "signed-out":
      return { status: 401, body: { error: quota } };
    case "not-enabled":
      return { status: 403, body: { error: quota } };
    case "limit":
      return { status: 429, body: { error: quota } };
    default:
      return { status: 503, body: { error: "unavailable" } };
  }

  try {
    const result = await deps.ask(song);
    // Only what passed the checks goes to the browser — not what was dropped,
    // not token counts.
    return { status: 200, body: { questions: result.questions } };
  } catch (error) {
    // The error class only: the song and the questions stay out of the logs.
    console.error("[BeatBubble] questioner failed:", (error as Error)?.name);
    return { status: 502, body: { error: "unavailable" } };
  }
}
