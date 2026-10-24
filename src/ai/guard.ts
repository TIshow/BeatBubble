import { containsBlockedWord, containsSensitiveWord, normalizeForMatch } from "@/lib/validation";

// Checks for any text an AI writes for a child to read (#151): the listener's
// impressions, the questioner's questions. The prompts ask for the right thing;
// these make it true, because whether a song is good and what to change are the
// child's to decide, whatever a model was told.

// Words that turn a sentence into a verdict or an instruction. Matched on
// the same normalized form as the title word lists (width, kana and spacing
// folded), so カタカナ and ひらがな spellings are both caught.
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
  // instructions
  "音をかえ",
  "音を変え",
  "音をなお",
  "音を直",
  "おとをかえ",
  "おとをなお",
  "変えて",
  "変えると",
  "直して",
  "直すと",
  "ほうがいい",
  "方がいい",
  "するといい",
  "といいよ",
].map(normalizeForMatch);

export function soundsLikeVerdictOrInstruction(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return VERDICT_OR_INSTRUCTION.some((word) => normalized.includes(word));
}

export type DropReason =
  | "missing"
  | "too-long"
  | "word-list"
  | "verdict-or-instruction"
  | "not-a-question"
  | "off-the-score";

// One piece of text a child will read: present, not a wall of text, clear of
// the title word lists, and neither a verdict nor an instruction.
export function textProblem(text: string, max: number): DropReason | null {
  if (!text) return "missing";
  if (text.length > max) return "too-long";
  if (containsBlockedWord(text) || containsSensitiveWord(text)) return "word-list";
  if (soundsLikeVerdictOrInstruction(text)) return "verdict-or-instruction";
  return null;
}
