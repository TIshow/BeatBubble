import { containsBlockedWord, containsSensitiveWord, normalizeForMatch } from "@/lib/validation";

// The listener (#151, idea ①): a model that "hears" a child's song from its
// score and says what scene it called up. A listener's turn is the only one it
// takes. Whether the song is good, and which note to change, stay the child's
// to decide — so the prompt asks for neither, and anything that slips through
// is dropped before a child sees it.

export const LISTEN_IMPRESSIONS = 3;
export const LISTEN_MAX_SCENE = 40;
export const LISTEN_MAX_BECAUSE = 50;

export type Impression = { scene: string; because: string };

export const LISTEN_SYSTEM_PROMPT = `あなたは、小学生がつくった短い曲を聴く「聴き手」です。曲は楽譜のテキストで渡されます。テンポ、楽器、拍ごとの音（ドレミ）、ドラム、休みが書かれています。

この曲を聴いて、どんな情景（ようす）が浮かんだかを、異なる聞こえ方で${LISTEN_IMPRESSIONS}つ返してください。それぞれに、楽譜のどこからそう聞こえたかを添えてください。

この返事は、子どもが自分の曲をもう一度聴き直すきっかけとして使います。正解はありません。そのため次のことを守ってください。

- 曲を評価しないでください。上手・下手、良い・悪い、まちがい、と言わないでください。ほめることもしないでください。子どもがあなたの言葉を「点数」として受け取ってしまうからです。
- どの音を変えればよいか、どう直せばよいかを言わないでください。変えるかどうかを決めるのは子どもです。
- 「そう聞こえたわけ」は、必ず楽譜に書かれていることから述べてください（テンポ、音の高さ・低さ、長い音・短い音、くり返し、休み、ドラムなど）。楽譜にないことは書かないでください。音の名前はドレミで書いてください。
- 小学4年生が読めることばで書いてください。難しい漢字や、音楽の専門用語は使わないでください。
- こわい、さみしい、かなしい、といった気持ちも、聞こえたままに書いてかまいません。
- 「ようす」は${LISTEN_MAX_SCENE}文字以内、「わけ」は${LISTEN_MAX_BECAUSE}文字以内にしてください。`;

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

function isSafe({ scene, because }: Impression): boolean {
  if (!scene || !because) return false;
  if (scene.length > LISTEN_MAX_SCENE || because.length > LISTEN_MAX_BECAUSE) return false;
  for (const text of [scene, because]) {
    if (containsBlockedWord(text) || containsSensitiveWord(text)) return false;
    if (soundsLikeVerdictOrInstruction(text)) return false;
  }
  return true;
}

// The prompt asks for the right thing; this is what makes it true. An
// impression that breaks a rule is dropped whole rather than trimmed — half a
// sentence reads worse than one fewer impression. The caller shows a neutral
// message if nothing survives.
export function keepSafeImpressions(items: Impression[]): Impression[] {
  return items
    .map((item) => ({ scene: item.scene.trim(), because: item.because.trim() }))
    .filter(isSafe)
    .slice(0, LISTEN_IMPRESSIONS);
}
