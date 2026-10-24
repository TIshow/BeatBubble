import type { Song } from "@/core/types";
import type { Question } from "@/ai/questions";
import { supabase } from "./supabase";

// The browser's side of POST /api/ai/questions (#151, idea ④). The server
// decides whether this user may ask now; this only carries the request and
// turns every way it can fail into one of a few reasons a child can be told.

export type QuestionsError = "signed-out" | "not-enabled" | "limit" | "unavailable";
export type QuestionsOutcome = { questions: Question[] } | { error: QuestionsError };

const KNOWN: QuestionsError[] = ["signed-out", "not-enabled", "limit"];

export async function requestQuestions(song: Song): Promise<QuestionsOutcome> {
  // The session token lets the server ask the database as this user — which
  // is how it knows their class without the browser saying.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "signed-out" };

  try {
    const response = await fetch("/api/ai/questions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      // Only the notes: no title, author or note travels with them.
      body: JSON.stringify({ song }),
    });
    const body = (await response.json()) as { questions?: Question[]; error?: string };
    if (response.ok && Array.isArray(body.questions)) return { questions: body.questions };
    const reason = KNOWN.find((k) => k === body.error);
    return { error: reason ?? "unavailable" };
  } catch {
    return { error: "unavailable" };
  }
}
