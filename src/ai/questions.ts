import { textProblem, type DropReason } from "./guard";

// The questioner (#151, idea ④): questions about particular places in a child's
// song, to help them put into words what they were going for. Writing the
// answer is the child's turn — the model writes no part of the note — so the
// questions ask, never assume: "what were you going for here?", never "was this
// the sad part?". Only the score goes in, never anything the child has written.
//
// It leans on what the listener check showed the model can do — read the shape
// of a score correctly — and not on what it couldn't: turn that shape into a
// scene.

export const QUESTION_COUNT = 3;
// Asked for, then capped at twice that: a model can't count Japanese
// characters reliably (see LISTEN_ASK_* in listen.ts).
export const ASK_QUESTION_LENGTH = 40;
export const MAX_QUESTION_LENGTH = ASK_QUESTION_LENGTH * 2;

export type Question = { place: string; question: string };

export const QUESTION_SYSTEM_PROMPT = `あなたは、小学生が自分のつくった曲について、どこを工夫したか・どんな思いでつくったかを、自分の言葉で書けるように手伝う役です。曲は楽譜のテキストで渡されます。

この曲の中から、子どもが意図をもって作ったかもしれない場所を${QUESTION_COUNT}か所選び、それぞれについて子どもへの質問を1つずつ作ってください。

質問の書き方:
- まず、その場所で楽譜の上で起きていることを、楽譜に書かれている事実だけで短く言ってください（例：「さいごの 4拍で、高い音が ながく つづいているね」）。楽譜にないことは書かないでください。音の名前はドレミで書いてください。
- 続けて、そこをどんなつもりで作ったのかを、答えが決まっていない聞き方でたずねてください（例：「そこは どんな ようすを イメージした？」「なんで そう したの？」）。
- 気持ちや情景を決めつけないでください。「かなしい場面にしたかったの？」のように答えを含む聞き方はしないでください。思ったことを言葉にするのは子どもです。
- 曲を評価しないでください。上手・下手、良い・悪い、まちがい、と言わないでください。ほめることもしないでください。
- どの音を変えればよいか、どう直せばよいかを言わないでください。
- 小学4年生が読めることばで、${ASK_QUESTION_LENGTH}文字くらいの短い1文にし、最後は「？」で終えてください。
- place には、その場所を「5拍目」や「13〜16拍目」のように書いてください。`;

export function questionUserMessage(score: string): string {
  return `次の曲について、子どもへの質問を作ってください。\n\n<score>\n${score}\n</score>`;
}

const PLACE = /^(\d+)拍目$|^(\d+)〜(\d+)拍目$/;

// Whether a place names beats that exist in the song. A question about beat 20
// of a 16-beat song stands on nothing, and it's the one part of a question's
// premise that can be checked mechanically.
function placeInSong(place: string, beats: number): boolean {
  const match = place.trim().match(PLACE);
  if (!match) return false;
  const from = Number(match[1] ?? match[2]);
  const to = Number(match[1] ?? match[3]);
  return from >= 1 && from <= to && to <= beats;
}

function dropReason({ place, question }: Question, beats: number): DropReason | null {
  const problem = textProblem(question, MAX_QUESTION_LENGTH);
  if (problem) return problem;
  if (!/[？?]$/.test(question)) return "not-a-question";
  if (!placeInSong(place, beats)) return "off-the-score";
  return null;
}

// Same contract as sortImpressions: dropped whole, never trimmed, and what was
// dropped comes back with its reason.
export function sortQuestions(
  items: Question[],
  beats: number
): { kept: Question[]; dropped: { question: Question; reason: DropReason }[] } {
  const kept: Question[] = [];
  const dropped: { question: Question; reason: DropReason }[] = [];
  for (const item of items) {
    const question = { place: item.place.trim(), question: item.question.trim() };
    const reason = dropReason(question, beats);
    if (reason) dropped.push({ question, reason });
    else kept.push(question);
  }
  return { kept: kept.slice(0, QUESTION_COUNT), dropped };
}
