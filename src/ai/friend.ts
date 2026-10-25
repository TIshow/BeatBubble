import { placeInSong, textProblem, type DropReason } from "./guard";

// The companion's line (#151). Tapping the creature the child chose in the
// editor gets one short thing from it, the way a friend sitting beside them
// would: something it noticed in the song, and perhaps a light question.
//
// What it may notice is the shape of the score — what the listener check
// showed the model reads correctly — not a scene, which it couldn't. It never
// praises or judges: a friend who grades turns playing into looking for the
// right answer. And it never says what to change.

// Several candidates about different places. All that pass are kept: the
// editor says one per tap, so tapping again hears about another place without
// another request.
export const FRIEND_CANDIDATES = 3;
// Asked for, then capped at twice that: a model can't count Japanese
// characters reliably (see LISTEN_ASK_* in listen.ts).
export const ASK_FRIEND_LENGTH = 30;
export const MAX_FRIEND_LENGTH = ASK_FRIEND_LENGTH * 2;

// `place` names beats and is for checking only; the line says where in words.
export type FriendLine = { place: string; line: string };

// The prompt never names ここ, though the check below drops it: naming it made
// the model write it more — a second check got lines that were only 「ここ」.
export const FRIEND_SYSTEM_PROMPT = `あなたは、子どもが音楽をつくるアプリの中にいる小さないきもので、その子の相棒です。子どもがあなたをタップしたので、いまの曲を見て、となりで聴いている友だちとして、ひとこと話しかけます。曲は楽譜のテキストで渡されます。

ひとことの作り方:
- 曲の中の1か所について、気づいたことを、楽譜に書かれている事実から言ってください（例：「さいごの ほう、高い ドが ずーっと のびてるね」）。楽譜にないことは言わないでください。音の名前はドレミで書いてください。
- そのあとに、軽く たずねても かまいません（例：「どんな つもり？」「どうやって 思いついたの？」）。
- ほめないでください（いいね、すごい、じょうず、かっこいい、など）。評価もしないでください。あなたは先生ではなく友だちです。ほめられると、子どもは「正解」を探しはじめてしまいます。
- どの音を変えればよいか、どう直せばよいかは言わないでください。
- 拍の番号（「13拍目」など）は使わないでください。子どもの画面には拍の番号が出ていません。「さいしょ」「まんなかあたり」「さいごの ほう」「いちばん 高い 音の ところ」のように、楽譜を見て見つけられることばで場所を言ってください。
- 友だちどうしの話しことばで、小学生が読める やさしい ことばにしてください。${ASK_FRIEND_LENGTH}文字くらいの、短い ひとことにしてください。
- ちがう場所について、候補を${FRIEND_CANDIDATES}つ作ってください。place には、その場所を「5拍目」や「13〜16拍目」のように書いてください。これは確認用で、子どもには見せません。`;

export function friendUserMessage(score: string): string {
  return `次の曲を見て、ひとこと話しかけてください。\n\n<score>\n${score}\n</score>`;
}

// A line that points with ここ, or by a beat or cell number, leaves the child
// hunting: it arrives in a bubble, not on the grid, and the grid shows no
// numbers. In the first check a third of the lines said ここ. (こころ and ここち
// are words, not pointing.)
const UNCLEAR_PLACE = /ここ(?![ろち])|[\d０-９]\s*(?:拍|マス)/;

function dropReason({ place, line }: FriendLine, beats: number): DropReason | null {
  const problem = textProblem(line, MAX_FRIEND_LENGTH);
  if (problem) return problem;
  if (!placeInSong(place, beats)) return "off-the-score";
  if (UNCLEAR_PLACE.test(line)) return "unclear-place";
  return null;
}

// The candidates that pass, in the model's order. Same contract as
// sortQuestions: a line is dropped whole, never trimmed, with its reason.
export function pickFriendLines(
  items: FriendLine[],
  beats: number
): { lines: FriendLine[]; dropped: { line: FriendLine; reason: DropReason }[] } {
  const lines: FriendLine[] = [];
  const dropped: { line: FriendLine; reason: DropReason }[] = [];
  for (const item of items) {
    const candidate = { place: item.place.trim(), line: item.line.trim() };
    const reason = dropReason(candidate, beats);
    if (reason) dropped.push({ line: candidate, reason });
    else lines.push(candidate);
  }
  return { lines: lines.slice(0, FRIEND_CANDIDATES), dropped };
}
