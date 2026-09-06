// Client-side validation for the public song feed.
//
// NOTE: this is a UX guardrail, not security. The anon key lets anyone POST
// directly to Supabase, so the real enforcement must live server-side
// (RLS / Postgres CHECK / trigger / a moderation service). See issue #31.

export const MAX_TITLE_LENGTH = 60;
export const MAX_AUTHOR_LENGTH = 40;
// A sentence or two from a child about what they were going for. The card shows
// the first three lines and the rest opens in place, so this bounds how tall an
// opened card can get — roughly one card's worth of text. Saves made before this
// limit dropped from 200 keep their longer note: it still displays and opens in
// full, and only editing one asks for it to be shortened.
export const MAX_DESCRIPTION_LENGTH = 120;
// Generous ceiling on the serialized song to stop abusive payloads.
export const MAX_SONG_BYTES = 100_000;

// Two tiers of word matching, both applied to the title and author:
//
//   BLOCKED   — never publishable on a classroom feed (explicit sexual terms,
//               slurs, "die/kill"). Hard-stops the save.
//   SENSITIVE — the mischief kids reach for (toilet words, mild jabs). NOT
//               blocked: the save modal shows a one-time reflection nudge
//               ("could this hurt someone?") and lets them proceed. The point
//               is the pause, not censorship — and because it only warns, the
//               occasional false positive costs nothing.
//
// Lists are deliberately short and starter-grade; expand in review, or move to
// a server-side service. Kept low-false-positive on purpose: e.g. はげ / けつ /
// カス are omitted because they collide with 激しい / 結末 / かすみ (a name).
const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "slut",
  "cunt",
  "死ね",
  "しね",
  "ころす",
  "殺す",
  "きえろ",
  "消えろ",
  "まんこ",
  "セックス",
  "きちがい",
];

const SENSITIVE_WORDS = [
  "うんこ",
  "うんち",
  "おしっこ",
  "ゲロ",
  "おなら",
  "ちんこ",
  "ちんちん",
  "おちんちん",
  "ばか",
  "あほ",
  "きもい",
  "きしょい",
  "うざい",
  "ぶす",
  "でぶ",
  "くそ",
  "だまれ",
  "あっちいけ",
];

// Fold away the ways a kid dodges a word list: full/half width, upper case,
// katakana vs hiragana, and any spaces or symbols wedged between characters
// (し ね, し☆ね). Matching then runs on this normalized form.
export function normalizeForMatch(text: string): string {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      // katakana → hiragana (so シネ / ｼﾈ match しね)
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      // drop everything that isn't a letter or number: spaces, punctuation,
      // symbols wedged between characters
      .replace(/[^\p{L}\p{N}]/gu, "")
  );
}

const BLOCKED_NORMALIZED = BLOCKED_WORDS.map(normalizeForMatch);
const SENSITIVE_NORMALIZED = SENSITIVE_WORDS.map(normalizeForMatch);

function matchesAny(text: string, normalizedList: string[]): boolean {
  const normalized = normalizeForMatch(text);
  return normalizedList.some((word) => word.length > 0 && normalized.includes(word));
}

export function containsBlockedWord(text: string): boolean {
  return matchesAny(text, BLOCKED_NORMALIZED);
}

// A sensitive (but not blocked) word — the save flow turns this into a
// reflection nudge rather than a hard stop.
export function containsSensitiveWord(text: string): boolean {
  return matchesAny(text, SENSITIVE_NORMALIZED);
}

export type MetaValidationReason =
  | "title-empty"
  | "title-too-long"
  | "author-empty"
  | "author-too-long"
  | "description-too-long"
  | "blocked-word";

export type MetaValidation = { ok: true } | { ok: false; reason: MetaValidationReason };

// `description` is optional — the child may just save. It is checked like the
// rest because it is published text a child writes: a new public field that
// skipped the word lists would be a hole in the same wall.
export function validateSongMeta(input: {
  title: string;
  author: string;
  description?: string;
}): MetaValidation {
  const title = input.title.trim();
  const author = input.author.trim();
  const description = (input.description ?? "").trim();

  if (title.length === 0) return { ok: false, reason: "title-empty" };
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, reason: "title-too-long" };
  if (author.length === 0) return { ok: false, reason: "author-empty" };
  if (author.length > MAX_AUTHOR_LENGTH) return { ok: false, reason: "author-too-long" };
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, reason: "description-too-long" };
  }
  if (
    containsBlockedWord(title) ||
    containsBlockedWord(author) ||
    containsBlockedWord(description)
  ) {
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
