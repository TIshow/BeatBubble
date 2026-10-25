import { containsBlockedWord, containsSensitiveWord, normalizeForMatch } from "@/lib/validation";

// Checks for any text an AI writes for a child to read (#151): the listener's
// impressions, the questioner's questions, the companion's lines. The prompts
// ask for the right thing; these make it true, because whether a song is good
// and what to change are the child's to decide, whatever a model was told.

// Words that turn a sentence into a verdict (praise included) or an
// instruction. Matched on the same normalized form as the title word lists
// (width, kana and spacing folded), so カタカナ and ひらがな spellings are both
// caught.
//
// Bare kana verbs are deliberately absent: かえると is also カエルと ("frog and"),
// かえて sits inside むかえて, and よくなる inside なかよくなる — all ordinary
// scenes. Instructions almost always name the sound, so they are caught as
// 音を+verb, or by the unambiguous kanji forms.
const VERDICT_OR_INSTRUCTION = [
  // verdicts
  "じょうず",
  "上手",
  "へた",
  "下手",
  "まちがい",
  "間違",
  "だめ",
  "失敗",
  "しっぱい",
  "正解",
  "せいかい",
  "点数",
  "てんすう",
  // praise — a verdict too: a child praised starts looking for the "right"
  // answer. Only forms that don't also describe: すごく ("very") stays out,
  // since "すごく はやい" is a fact about tempo.
  "いいね",
  "いい感じ",
  "いいかんじ",
  "すごい",
  "すてき",
  "素敵",
  "かっこいい",
  "さいこう",
  "最高",
  "天才",
  "うまい",
  // instructions that say the song is wrong or would be better another way
  "音をなお",
  "音を直",
  "おとをなお",
  "直して",
  "直すと",
  "ほうがいい",
  "方がいい",
  "するといい",
  "といいよ",
].map(normalizeForMatch);

// Telling a child to change something. Out of verdicts, descriptions and
// questions; in the companion's "try this" line it is the point, so that line
// may (#161) — the line above still keeps "better" and "fix" out of it.
const CHANGE = ["音をかえ", "音を変え", "おとをかえ", "変えて", "変えると"].map(normalizeForMatch);

export function soundsLikeVerdictOrInstruction(text: string, { allowChange = false } = {}): boolean {
  const normalized = normalizeForMatch(text);
  const found = (word: string) => normalized.includes(word);
  return VERDICT_OR_INSTRUCTION.some(found) || (!allowChange && CHANGE.some(found));
}

export type DropReason =
  | "missing"
  | "too-long"
  | "word-list"
  | "verdict-or-instruction"
  | "not-a-question"
  | "off-the-score"
  | "unclear-place"
  | "notation"
  | "names-the-answer";

// One piece of text a child will read: present, not a wall of text, clear of
// the title word lists, and neither a verdict nor an instruction (unless it is
// a suggestion to try a change — see CHANGE).
export function textProblem(
  text: string,
  max: number,
  { allowChange = false } = {}
): DropReason | null {
  if (!text) return "missing";
  if (text.length > max) return "too-long";
  if (containsBlockedWord(text) || containsSensitiveWord(text)) return "word-list";
  if (soundsLikeVerdictOrInstruction(text, { allowChange })) return "verdict-or-instruction";
  return null;
}

// The beat or range a place names. Read leniently — the model writes
// "1拍目〜2拍目", "9〜10拍目（まんなかより あと）", "8拍目 3マス目" or
// "さいごの ほう（13〜16拍目）" as often as "13〜16拍目" — because what matters
// is the numbers, and strict readings have twice dropped sound candidates. A
// number at the start counts on its own; further in it needs 拍目, so the 6
// of ド6 isn't taken for a beat.
const PLACE_AT_START = /^\s*(\d+)\s*(?:拍目)?\s*(?:[〜~～-]\s*(\d+)\s*拍目)?/;
const PLACE_FURTHER_IN = /(\d+)\s*(?:拍目)?\s*(?:[〜~～-]\s*(\d+)\s*)?拍目/;

// Whether a place names beats that exist in the song. A question about beat 20
// of a 16-beat song stands on nothing, and it's the one part of a question's
// premise that can be checked mechanically.
export function placeInSong(place: string, beats: number): boolean {
  const match = place.match(PLACE_AT_START) ?? place.match(PLACE_FURTHER_IN);
  if (!match) return false;
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  return from >= 1 && from <= to && to <= beats;
}
