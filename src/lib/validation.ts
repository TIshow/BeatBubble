// Client-side validation for the public song feed.
//
// NOTE: this is a UX guardrail, not security. The anon key lets anyone POST
// directly to Supabase, so the real enforcement must live server-side
// (RLS / Postgres CHECK / trigger / a moderation service). See issue #31.

export const MAX_TITLE_LENGTH = 60;
export const MAX_AUTHOR_LENGTH = 40;
// Generous ceiling on the serialized song to stop abusive payloads.
export const MAX_SONG_BYTES = 100_000;

// Starter blocklist — intentionally small. Expand or, better, replace with a
// server-side moderation service. Matching is case-insensitive substring.
const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "slut",
  "しね",
  "ころす",
  "きもい",
];

export type MetaValidationReason =
  | "title-empty"
  | "title-too-long"
  | "author-empty"
  | "author-too-long"
  | "blocked-word";

export type MetaValidation = { ok: true } | { ok: false; reason: MetaValidationReason };

export function containsBlockedWord(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return BLOCKED_WORDS.some((word) => normalized.includes(word));
}

export function validateSongMeta(input: { title: string; author: string }): MetaValidation {
  const title = input.title.trim();
  const author = input.author.trim();

  if (title.length === 0) return { ok: false, reason: "title-empty" };
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, reason: "title-too-long" };
  if (author.length === 0) return { ok: false, reason: "author-empty" };
  if (author.length > MAX_AUTHOR_LENGTH) return { ok: false, reason: "author-too-long" };
  if (containsBlockedWord(title) || containsBlockedWord(author)) {
    return { ok: false, reason: "blocked-word" };
  }
  return { ok: true };
}

export function songWithinSizeLimit(song: unknown): boolean {
  try {
    return JSON.stringify(song).length <= MAX_SONG_BYTES;
  } catch {
    return false;
  }
}
