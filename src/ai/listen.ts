import { containsBlockedWord, containsSensitiveWord, normalizeForMatch } from "@/lib/validation";

// The listener (#151, idea ①): a model that "hears" a child's song from its
// score and says what scene it called up. A listener's turn is the only one it
// takes. Whether the song is good, and which note to change, stay the child's
// to decide — so the prompt asks for neither, and anything that slips through
// is dropped before a child sees it.

export const LISTEN_IMPRESSIONS = 3;

// Two kinds of length. The prompt asks for roughly these...
export const LISTEN_ASK_SCENE = 30;
export const LISTEN_ASK_BECAUSE = 60;
// ...and the filter drops only past twice that. A model can't count Japanese
// characters reliably: asked for 50, Haiku wrote reasons of 51–84, and a cap at
// the asked length dropped every impression for half the songs. The cap is a
// guard against a wall of text, not a style rule.
export const LISTEN_MAX_SCENE = LISTEN_ASK_SCENE * 2;
export const LISTEN_MAX_BECAUSE = LISTEN_ASK_BECAUSE * 2;

export type Impression = { scene: string; because: string };

export const LISTEN_SYSTEM_PROMPT = `あなたは、小学生がつくった短い曲を聴く「聴き手」です。曲は楽譜のテキストで渡されます。テンポ、楽器、拍ごとの音（ドレミ）、ドラム、休みが書かれています。

この曲を聴いて、どんな情景（ようす）が浮かんだかを、異なる聞こえ方で${LISTEN_IMPRESSIONS}つ返してください。それぞれに、楽譜のどこからそう聞こえたかを添えてください。

この返事は、子どもが自分の曲をもう一度聴き直すきっかけとして使います。正解はありません。そのため次のことを守ってください。

- 曲を評価しないでください。上手・下手、良い・悪い、まちがい、と言わないでください。ほめることもしないでください。子どもがあなたの言葉を「点数」として受け取ってしまうからです。
- どの音を変えればよいか、どう直せばよいかを言わないでください。変えるかどうかを決めるのは子どもです。
- 「そう聞こえたわけ」は、必ず楽譜に書かれていることから述べてください（テンポ、音の高さ・低さ、長い音・短い音、くり返し、休み、ドラムなど）。楽譜にないことは書かないでください。音の名前はドレミで書いてください。
- 小学4年生が読めることばで書いてください。難しい漢字や、音楽の専門用語は使わないでください。
- こわい、さみしい、かなしい、といった気持ちも、聞こえたままに書いてかまいません。
- 「ようす」は${LISTEN_ASK_SCENE}文字くらい、「わけ」は${LISTEN_ASK_BECAUSE}文字くらいの、短い1文にしてください。`;

// The score goes in its own tags so it reads as material to listen to, never as
// instructions — it is generated from note data, but the boundary costs nothing.
export function listenUserMessage(score: string): string {
  return `次の曲を聴いた印象を教えてください。\n\n<score>\n${score}\n</score>`;
}

// Words that turn an impression into a verdict or an instruction. Matched on
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

function soundsLikeVerdictOrInstruction(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return VERDICT_OR_INSTRUCTION.some((word) => normalized.includes(word));
}

export type DropReason = "missing" | "too-long" | "word-list" | "verdict-or-instruction";

function dropReason({ scene, because }: Impression): DropReason | null {
  if (!scene || !because) return "missing";
  if (scene.length > LISTEN_MAX_SCENE || because.length > LISTEN_MAX_BECAUSE) return "too-long";
  for (const text of [scene, because]) {
    if (containsBlockedWord(text) || containsSensitiveWord(text)) return "word-list";
    if (soundsLikeVerdictOrInstruction(text)) return "verdict-or-instruction";
  }
  return null;
}

// The prompt asks for the right thing; this is what makes it true. An
// impression that breaks a rule is dropped whole rather than trimmed — half a
// sentence reads worse than one fewer impression. The caller shows a neutral
// message if nothing survives. What was dropped, and why, comes back too: a
// check that only reports survivors can't tell a strict filter from a model
// that ignored the rules (#151).
export function sortImpressions(items: Impression[]): {
  kept: Impression[];
  dropped: { impression: Impression; reason: DropReason }[];
} {
  const kept: Impression[] = [];
  const dropped: { impression: Impression; reason: DropReason }[] = [];
  for (const item of items) {
    const impression = { scene: item.scene.trim(), because: item.because.trim() };
    const reason = dropReason(impression);
    if (reason) dropped.push({ impression, reason });
    else kept.push(impression);
  }
  return { kept: kept.slice(0, LISTEN_IMPRESSIONS), dropped };
}

export function keepSafeImpressions(items: Impression[]): Impression[] {
  return sortImpressions(items).kept;
}
