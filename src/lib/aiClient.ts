import type { Song } from "@/core/types";
import { supabase } from "./supabase";

// The browser's side of POST /api/ai/friend (#151). The server decides whether
// this user may ask now; this only carries the request and turns every way it
// can fail into one of a few reasons the companion can answer with.

export type FriendError = "signed-out" | "not-enabled" | "limit" | "unavailable";
export type FriendOutcome = { lines: string[] } | { error: FriendError };

const KNOWN: FriendError[] = ["signed-out", "not-enabled", "limit"];

// Past this the companion gives up rather than "thinking" indefinitely.
const TIMEOUT_MS = 20_000;

// Never throws: every failure comes back as a reason.
export async function requestFriendLines(song: Song): Promise<FriendOutcome> {
  try {
    // The session token lets the server ask the database as this user — which
    // is how it knows whether they may use AI without the browser saying.
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: "signed-out" };

    const response = await fetch("/api/ai/friend", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      // Only the notes: a Song carries no title, author or note.
      body: JSON.stringify({ song }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json()) as { lines?: unknown; error?: string };
    if (response.ok && Array.isArray(body.lines)) {
      return { lines: body.lines.filter((l): l is string => typeof l === "string") };
    }
    const reason = KNOWN.find((k) => k === body.error);
    return { error: reason ?? "unavailable" };
  } catch {
    return { error: "unavailable" };
  }
}
