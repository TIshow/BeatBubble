import { describe, expect, it } from "vitest";
import {
  ASK_FRIEND_LENGTH,
  FRIEND_CANDIDATES,
  FRIEND_SYSTEM_PROMPT,
  friendUserMessage,
  MAX_FRIEND_LENGTH,
  pickFriendLines,
} from "./friend";

const BEATS = 16;
const ok = { place: "13〜16拍目", line: "さいごの ほう、高い ドが ずーっと のびてるね。どんな つもり？" };
const other = { place: "1拍目", line: "さいしょ、ミが みっつ ならんでるね。" };

describe("pickFriendLines", () => {
  it("keeps every candidate that passes, in order, trimmed", () => {
    const { lines } = pickFriendLines([{ place: " 1拍目 ", line: ` ${other.line} ` }, ok], BEATS);
    expect(lines).toEqual([other, ok]);
  });

  it("keeps no more than it asked for", () => {
    expect(pickFriendLines(Array(FRIEND_CANDIDATES + 2).fill(ok), BEATS).lines).toHaveLength(FRIEND_CANDIDATES);
  });

  it("drops praise — a friend who grades turns play into looking for the right answer", () => {
    for (const praise of ["その メロディ、いいね！", "すごい！ 高い ドが つづく", "かっこいい おわりかた", "さいこうの ドラム"]) {
      const { lines, dropped } = pickFriendLines([{ ...ok, line: praise }, ok], BEATS);
      expect(dropped[0].reason).toBe("verdict-or-instruction");
      expect(lines).toEqual([ok]);
    }
  });

  it("keeps a plain description that only sounds like praise", () => {
    // すごく = "very": a fact about tempo, not a verdict.
    expect(pickFriendLines([{ ...ok, line: "さいしょ、すごく はやく 音が ならんでるね" }], BEATS).lines).toHaveLength(1);
  });

  it("drops instructions and places outside the song", () => {
    const { lines, dropped } = pickFriendLines(
      [{ ...ok, line: "その 音を かえて みたら？" }, { ...ok, place: "20拍目" }, ok],
      BEATS
    );
    expect(dropped.map((d) => d.reason)).toEqual(["verdict-or-instruction", "off-the-score"]);
    expect(lines).toEqual([ok]);
  });

  it("reads the beats however the place is worded, but not a note's octave", () => {
    // Forms the model wrote in the first check, all dropped by a reading that
    // wanted the number first.
    for (const place of ["さいごの ほう（13〜16拍目）", "いちばん 高い 音の ところ（4〜5拍目）", "16拍目の ド♯6 と ド6"]) {
      expect(pickFriendLines([{ ...ok, place }], BEATS).lines).toHaveLength(1);
    }
    expect(pickFriendLines([{ ...ok, place: "ド6 の ところ" }], BEATS).dropped[0].reason).toBe("off-the-score");
  });

  it("drops a line that points with ここ or a number the child can't see", () => {
    for (const line of ["ここの ド6、ながーく のびてるね。", "ここ、ラ♯の音が ぽんと 出てくるね", "4拍目の ドが のびてるね", "3マス目から はじまるね"]) {
      expect(pickFriendLines([{ ...ok, line }], BEATS).dropped[0].reason).toBe("unclear-place");
    }
    // ド6 is a note, and こころ a word.
    expect(pickFriendLines([{ ...ok, line: "さいごの ほう、ド6が こころに のこるね" }], BEATS).lines).toHaveLength(1);
  });

  it("has nothing when no candidate passes", () => {
    expect(pickFriendLines([{ ...ok, line: "とても上手！" }], BEATS).lines).toEqual([]);
    expect(pickFriendLines([], BEATS).lines).toEqual([]);
  });

  it("keeps a line a little over the asked length, and drops a wall of text", () => {
    expect(pickFriendLines([{ ...ok, line: "あ".repeat(ASK_FRIEND_LENGTH + 10) }], BEATS).lines).toHaveLength(1);
    expect(pickFriendLines([{ ...ok, line: "あ".repeat(MAX_FRIEND_LENGTH + 1) }], BEATS).lines).toEqual([]);
  });
});

describe("prompt", () => {
  it("states the count and length it asks for", () => {
    expect(FRIEND_SYSTEM_PROMPT).toContain(`候補を${FRIEND_CANDIDATES}つ`);
    expect(FRIEND_SYSTEM_PROMPT).toContain(`${ASK_FRIEND_LENGTH}文字くらい`);
  });

  it("hands over the score only, inside its own tags", () => {
    expect(friendUserMessage("テンポ: 100")).toBe(
      "次の曲を見て、ひとこと話しかけてください。\n\n<score>\nテンポ: 100\n</score>"
    );
  });
});
