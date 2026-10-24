import { describe, expect, it } from "vitest";
import {
  ASK_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  QUESTION_COUNT,
  QUESTION_SYSTEM_PROMPT,
  questionUserMessage,
  sortQuestions,
} from "./questions";

const ok = { place: "13〜16拍目", question: "さいごに 高い ドが つづくね。そこは どんな つもり？" };
const BEATS = 16;

describe("sortQuestions", () => {
  it("keeps an open question about a place in the song, trimmed", () => {
    const { kept } = sortQuestions([{ place: " 13〜16拍目 ", question: ` ${ok.question} ` }], BEATS);
    expect(kept).toEqual([ok]);
  });

  it("accepts a single beat as well as a range", () => {
    expect(sortQuestions([{ ...ok, place: "5拍目" }], BEATS).kept).toHaveLength(1);
  });

  it("reads the beats a place starts with, however the rest is written", () => {
    // Forms the model actually wrote, which a strict reading dropped.
    for (const place of ["1拍目〜2拍目", "9〜10拍目（まんなかより 少し あとの ところ）", "8拍目 3マス目"]) {
      expect(sortQuestions([{ ...ok, place }], BEATS).kept).toHaveLength(1);
    }
  });

  it("drops a place outside the song, or one it can't read — the premise stands on nothing", () => {
    for (const place of ["17拍目", "13〜20拍目", "0拍目", "9〜5拍目", "さいご", ""]) {
      expect(sortQuestions([{ ...ok, place }], BEATS).dropped[0]?.reason).toBe("off-the-score");
    }
  });

  it("drops a statement dressed as a question", () => {
    const { dropped } = sortQuestions([{ ...ok, question: "さいごに 高い ドが つづいているね。" }], BEATS);
    expect(dropped[0].reason).toBe("not-a-question");
  });

  it("drops verdicts and instructions, as for the listener", () => {
    for (const question of ["そこが いちばん上手だね？", "その 音を かえて みたら どう？"]) {
      expect(sortQuestions([{ ...ok, question }], BEATS).dropped[0].reason).toBe("verdict-or-instruction");
    }
  });

  it("keeps a question a little over the asked length, and drops a wall of text", () => {
    const long = "あ".repeat(ASK_QUESTION_LENGTH + 10) + "？";
    expect(sortQuestions([{ ...ok, question: long }], BEATS).kept).toHaveLength(1);
    const wall = "あ".repeat(MAX_QUESTION_LENGTH) + "？";
    expect(sortQuestions([{ ...ok, question: wall }], BEATS).dropped[0].reason).toBe("too-long");
  });

  it("keeps at most the asked number", () => {
    const many = Array.from({ length: QUESTION_COUNT + 2 }, () => ok);
    expect(sortQuestions(many, BEATS).kept).toHaveLength(QUESTION_COUNT);
  });
});

describe("prompt", () => {
  it("states the count and length it asks for", () => {
    expect(QUESTION_SYSTEM_PROMPT).toContain(`${QUESTION_COUNT}か所`);
    expect(QUESTION_SYSTEM_PROMPT).toContain(`${ASK_QUESTION_LENGTH}文字くらい`);
  });

  it("hands the score over inside its own tags, and nothing the child wrote", () => {
    expect(questionUserMessage("テンポ: 100")).toBe(
      "次の曲について、子どもへの質問を作ってください。\n\n<score>\nテンポ: 100\n</score>"
    );
  });
});
