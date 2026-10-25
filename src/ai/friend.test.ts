import { describe, expect, it } from "vitest";
import {
  ASK_FRIEND_LENGTH,
  CANDIDATES_PER_KIND,
  friendSystemPrompt,
  friendUserMessage,
  MAX_FRIEND_LENGTH,
  pickFriendLines,
  REACTION_SEEDS,
  TRY_SEEDS,
  type FriendLine,
} from "./friend";

const BEATS = 16;
const notice: FriendLine = {
  kind: "notice",
  place: "13〜16拍目",
  line: "さいごの ほう、高い ドが ずーっと のびてるね。どんな つもり？",
};
const impression: FriendLine = {
  kind: "impression",
  place: "1拍目",
  line: "さいしょに 高い ドが いきなり 出てきて、びっくりした！",
};
const suggestion: FriendLine = {
  kind: "suggestion",
  place: "13〜16拍目",
  line: "さいごの ほうだけ、ひくい 音に したら どうなるかな？",
};

const reasonFor = (line: FriendLine) => pickFriendLines([line], BEATS).dropped[0]?.reason ?? null;

describe("pickFriendLines", () => {
  it("keeps one of each kind, noticed → impression → suggestion, whatever order they came in", () => {
    const { lines } = pickFriendLines([suggestion, impression, notice], BEATS);
    expect(lines).toEqual([notice, impression, suggestion]);
  });

  it("falls through to a spare of the same kind, and leaves out a kind with none", () => {
    const praise = { ...impression, line: "さいしょの ド、すごい！" };
    const spare = { ...impression, place: "5拍目", line: "まんなかで ドラムが ふえて、からだが ゆれた！" };
    const { lines, dropped } = pickFriendLines([notice, praise, spare], BEATS);
    expect(lines).toEqual([notice, spare]);
    expect(dropped.map((d) => d.reason)).toEqual(["verdict-or-instruction"]);
  });

  it("trims what it keeps", () => {
    expect(pickFriendLines([{ ...notice, place: " 1拍目 ", line: ` ${notice.line} ` }], BEATS).lines).toEqual([
      { ...notice, place: "1拍目" },
    ]);
  });

  it("drops praise in every kind — a friend who grades turns play into looking for the right answer", () => {
    for (const line of ["その メロディ、いいね！", "すごい！ 高い ドが つづく", "かっこいい おわりかた", "いい感じだね"]) {
      for (const base of [notice, impression, suggestion]) {
        expect(reasonFor({ ...base, line })).toBe("verdict-or-instruction");
      }
    }
  });

  it("keeps a plain description that only sounds like praise", () => {
    // すごく = "very": a fact about tempo, not a verdict.
    expect(reasonFor({ ...notice, line: "さいしょ、すごく はやく 音が ならんでるね" })).toBeNull();
  });

  it("lets only a suggestion propose a change, and never as 'better' or a fix", () => {
    const tryIt = "さいごの 音を かえてみたら どうなるかな？";
    expect(reasonFor({ ...suggestion, line: tryIt })).toBeNull();
    expect(reasonFor({ ...notice, line: tryIt })).toBe("verdict-or-instruction");
    for (const line of ["さいごを ひくく したほうがいいよ？", "ドラムを ふやすと いいよ？", "さいごを 直してみたら？"]) {
      expect(reasonFor({ ...suggestion, line })).toBe("verdict-or-instruction");
    }
  });

  it("drops a suggestion that picks the note — choosing is the child's part", () => {
    for (const line of ["さいごを ソに かえたら どうなるかな？", "まんなかを ド5に したら どうなる？", "さいしょを ファ♯に すると どうなる？"]) {
      expect(reasonFor({ ...suggestion, line })).toBe("names-the-answer");
    }
    // A note it's talking about isn't a note it's choosing, and バラバラ isn't a ラ.
    expect(reasonFor({ ...suggestion, line: "さいごの ソだけ、みじかく したら どうなるかな？" })).toBeNull();
    expect(reasonFor({ ...suggestion, line: "まんなかの リズムを バラバラに したら どうなる？" })).toBeNull();
  });

  it("drops a suggestion that doesn't leave what happens to the child", () => {
    expect(reasonFor({ ...suggestion, line: "さいごの ほうだけ、ひくい 音に してみよう。" })).toBe("not-a-question");
  });

  it("drops places outside the song, however the place is worded", () => {
    expect(reasonFor({ ...notice, place: "20拍目" })).toBe("off-the-score");
    expect(reasonFor({ ...notice, place: "ド6 の ところ" })).toBe("off-the-score");
    for (const place of ["さいごの ほう（13〜16拍目）", "いちばん 高い 音の ところ（4〜5拍目）", "16拍目の ド♯6 と ド6"]) {
      expect(reasonFor({ ...notice, place })).toBeNull();
    }
  });

  it("drops a line that points with ここ or a number the child can't see", () => {
    for (const line of ["ここの ド6、ながーく のびてるね。", "4拍目の ドが のびてるね", "４拍目の ドが のびてるね", "3マス目から はじまるね"]) {
      expect(reasonFor({ ...notice, line })).toBe("unclear-place");
    }
    // ド6 is a note, and こころ a word.
    expect(reasonFor({ ...notice, line: "さいごの ほう、ド6が こころに のこるね" })).toBeNull();
  });

  it("drops a line that leaks the score's notation", () => {
    for (const line of ["さいしょの ド4×2、ながいね", "[3]の ところで 鳴るね", "ミ → ソと 上がるね"]) {
      expect(reasonFor({ ...notice, line })).toBe("notation");
    }
  });

  it("has nothing when no candidate passes", () => {
    expect(pickFriendLines([{ ...notice, line: "とても上手！" }], BEATS).lines).toEqual([]);
    expect(pickFriendLines([], BEATS).lines).toEqual([]);
  });

  it("keeps a line a little over the asked length, and drops a wall of text", () => {
    expect(reasonFor({ ...notice, line: "あ".repeat(ASK_FRIEND_LENGTH + 10) })).toBeNull();
    expect(reasonFor({ ...notice, line: "あ".repeat(MAX_FRIEND_LENGTH + 1) })).toBe("too-long");
  });
});

describe("prompt", () => {
  it("states the count and length it asks for, and the three kinds by their response names", () => {
    const prompt = friendSystemPrompt();
    expect(prompt).toContain(`${CANDIDATES_PER_KIND}つずつ`);
    expect(prompt).toContain(`${ASK_FRIEND_LENGTH}文字くらい`);
    for (const name of ["notices", "impressions", "suggestions", "beats"]) expect(prompt).toContain(name);
  });

  it("gives every seed as a plain example, with no arrow to copy", () => {
    const prompt = friendSystemPrompt();
    for (const seed of [...REACTION_SEEDS, ...TRY_SEEDS]) {
      expect(prompt).toContain(`「${seed}」`);
      expect(seed).not.toMatch(/→/);
    }
  });

  it("shuffles the seeds for each request, so no one seed always comes first", () => {
    const firstTry = (random: () => number) => friendSystemPrompt(random).split("ためしてみる の れい: 「")[1].split("」")[0];
    const firsts = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((r) => firstTry(() => r)));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("hands over the score only, inside its own tags", () => {
    expect(friendUserMessage("テンポ: 100")).toBe("次の曲を見て、話しかけてください。\n\n<score>\nテンポ: 100\n</score>");
  });
});
