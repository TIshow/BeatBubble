import { placeInSong, textProblem, type DropReason } from "./guard";

// The companion's lines (#151, #161). Tapping the creature the child chose in
// the editor gets one short thing from it, the way a friend sitting beside
// them would — and tapping again, the next kind:
//
// - notice:     something in the score, perhaps with a light question
// - impression: a fact in the score, and the companion's own reaction to it
// - suggestion: one thing to try there, ending by asking what happens
//
// Everything rests on the shape of the score, which the model reads correctly;
// not on a scene or a mood, which the listener check showed it can't hear
// (#151). It never praises or judges: a friend who grades turns playing into
// looking for the right answer. A suggestion proposes a change to try, never
// the answer — which note, or that it would be better — because choosing is
// the child's part.

export type FriendKind = "notice" | "impression" | "suggestion";
// The order a child hears them in, one per tap.
export const FRIEND_KINDS: FriendKind[] = ["notice", "impression", "suggestion"];
// Spares of each kind, so one dropped line still leaves one of its kind.
export const CANDIDATES_PER_KIND = 2;
// Asked for, then capped at twice that: a model can't count Japanese
// characters reliably (see LISTEN_ASK_* in listen.ts).
export const ASK_FRIEND_LENGTH = 30;
export const MAX_FRIEND_LENGTH = ASK_FRIEND_LENGTH * 2;

// `place` names beats and is for checking only; the line says where in words.
export type FriendLine = { kind: FriendKind; place: string; line: string };

// The prompt never names ここ, though the check below drops it: naming it made
// the model write it more — a second check got lines that were only 「ここ」.
const FRIEND_RULES = `あなたは、子どもが音楽をつくるアプリの中にいる小さないきもので、その子の相棒です。子どもがあなたをタップしたので、いまの曲を見て、となりで聴いている友だちとして話しかけます。曲は楽譜のテキストで渡されます。

3つの種類の ひとことを作ってください。
- notices（気づいたこと）：曲の中の1か所について、楽譜に書かれている事実を言います。そのあとに、軽く たずねても かまいません（例：「さいごの ほう、高い ドが ずーっと のびてるね。どんな つもり？」）。
- impressions（感想）：曲の中の1か所の事実と、それを聴いた あなた自身の反応を言います。反応は、その事実に あうものに してください（れいは さいごに あります）。曲が どんな気持ちか、どんな場面か（かなしい曲、雨みたい、など）は決めないでください。それを決めるのは、作った子です。
- suggestions（ためしてみる）：曲の中の1か所で、そこで 起きていることを もとに、ためしに ちょっと ちがう ようにする ことを1つ言い、「どうなるかな？」のように 結果を子どもに たずねて おわります。なにを ためすかは、その場所に あうものに してください（れいは さいごに あります）。どの音に変えるか（「ソに」など）は言わないでください。それを えらぶのは子どもです。「〜したほうがいい」「〜すると いいよ」のように、よくなる とも言わないでください。

どの種類でも:
- 楽譜にないことは言わないでください。音の名前はドレミで書いてください。
- ほめないでください（いいね、すごい、じょうず、かっこいい、など）。評価もしないでください。あなたは先生ではなく友だちです。ほめられると、子どもは「正解」を探しはじめてしまいます。
- 拍の番号（「13拍目」など）は使わないでください。子どもの画面には拍の番号が出ていません。「さいしょ」「まんなかあたり」「さいごの ほう」「いちばん 高い 音の ところ」のように、楽譜を見て見つけられることばで場所を言ってください。
- 自分のことを「ぼく」「わたし」とは言わず、主語を はぶいてください。
- 友だちどうしの話しことばで、小学生が読める やさしい ことばにしてください。1つ ${ASK_FRIEND_LENGTH}文字くらいの、短い ひとことにしてください。
- 種類ごとに、ちがう場所について${CANDIDATES_PER_KIND}つずつ作ってください。beats には、その場所の拍を「5拍目」や「13〜16拍目」のように 数字で書いてください。これは確認用で、子どもには見せません。`;

// What the companion might react with, and might suggest trying, each tied to
// something in the score. Shuffled for every request, because the model takes
// the first that fits: listed in a fixed order, 9 of 15 songs got 「びっくり」
// and 9 of 15 got "make the long note shorter". In the system prompt, as plain
// sentences: put in the user message, the model thought four times as long
// (about 7 seconds a request), and written with arrows it copied the arrows.
export const REACTION_SEEDS = [
  "音が いきなり 高く とぶと、びっくりする",
  "おなじ リズムが つづくと、からだが ゆれる",
  "ひくい 音が ずっと なると、ふしぎな きもちに なる",
  "音が どんどん 上がると、わくわくする",
  "音が どんどん 下がると、すーっと する",
  "お休みの あとに 音が くると、ドキッとする",
  "いくつもの 音が いっしょに なると、ふわっと ひろがる",
];
export const TRY_SEEDS = [
  "ながく のびる 音を、みじかく したら",
  "おなじ ことの くりかえしを、1かいだけ ちがう ように したら",
  "お休みに、音を ひとつ 入れたら",
  "音が つまっている ところに、お休みを 入れたら",
  "高い 音への ジャンプを、となりの 音へ すすむ ように したら",
  "ドラムが ない ところに、ドラムを 入れたら",
  "1つだけ 鳴る 音に、いっしょに 鳴る 音を たしたら",
  "上がっていく ところを、下がっていく ように したら",
];

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const examples = (items: string[]) => items.map((item) => `「${item}」`).join("、");

export function friendSystemPrompt(random: () => number = Math.random): string {
  return `${FRIEND_RULES}

感想の れい: ${examples(shuffled(REACTION_SEEDS, random))}

ためしてみる の れい: ${examples(shuffled(TRY_SEEDS, random))}`;
}

export function friendUserMessage(score: string): string {
  return `次の曲を見て、話しかけてください。\n\n<score>\n${score}\n</score>`;
}

// A line that points with ここ, or by a beat or cell number, leaves the child
// hunting: it arrives in a bubble, not on the grid, and the grid shows no
// numbers. In the first check a third of the lines said ここ. (こころ and ここち
// are words, not pointing.)
const UNCLEAR_PLACE = /ここ(?![ろち])|[\d０-９]\s*(?:拍|マス)/;

// The score's own notation — 「ド4×2」, 「[3]」, 「→」 — leaking into what a child
// reads. The model copies notation it is shown.
const NOTATION = /[→×＋+［］[\]]/;

// A suggestion that names the note to change to — 「ソに かえて」, 「ド5に したら」
// — has made the choice the child was meant to make. Not after other katakana,
// so the ラ of バラバラに is not a note.
const NAMES_A_NOTE = /(?<![ァ-ヺー])(?:ド|レ|ミ|ファ|ソ|ラ|シ)[♯#♭]?[\d０-９]?\s*に\s*(?:かえ|変え|し|す)/;

function dropReason({ kind, place, line }: FriendLine, beats: number): DropReason | null {
  const problem = textProblem(line, MAX_FRIEND_LENGTH, { allowChange: kind === "suggestion" });
  if (problem) return problem;
  if (!placeInSong(place, beats)) return "off-the-score";
  if (UNCLEAR_PLACE.test(line)) return "unclear-place";
  if (NOTATION.test(line)) return "notation";
  if (kind === "suggestion") {
    // Ending on a question leaves what happens for the child to find out.
    if (!/[？?]$/.test(line)) return "not-a-question";
    if (NAMES_A_NOTE.test(line)) return "names-the-answer";
  }
  return null;
}

// The first candidate of each kind that passes, in FRIEND_KINDS order; a kind
// with none is left out. Same contract as sortQuestions: a line is dropped
// whole, never trimmed, with its reason.
export function pickFriendLines(
  items: FriendLine[],
  beats: number
): { lines: FriendLine[]; dropped: { line: FriendLine; reason: DropReason }[] } {
  const lines: FriendLine[] = [];
  const dropped: { line: FriendLine; reason: DropReason }[] = [];
  for (const kind of FRIEND_KINDS) {
    for (const item of items.filter((i) => i.kind === kind)) {
      const candidate = { kind, place: item.place.trim(), line: item.line.trim() };
      const reason = dropReason(candidate, beats);
      if (!reason) {
        lines.push(candidate);
        break;
      }
      dropped.push({ line: candidate, reason });
    }
  }
  return { lines, dropped };
}
