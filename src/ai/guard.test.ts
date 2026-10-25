import { describe, expect, it } from "vitest";
import { placeInSong, soundsLikeVerdictOrInstruction } from "./guard";

const BEATS = 16;

describe("placeInSong", () => {
  it("accepts a single beat or a range inside the song", () => {
    for (const place of ["5拍目", "13〜16拍目", "1拍目"]) expect(placeInSong(place, BEATS)).toBe(true);
  });

  it("reads the beats however the place is written", () => {
    // Forms the model actually wrote, which stricter readings dropped.
    for (const place of [
      "1拍目〜2拍目",
      "9〜10拍目（まんなかより 少し あとの ところ）",
      "8拍目 3マス目",
      "さいごの ほう（13〜16拍目）",
      "16拍目の ド♯6 と ド6",
    ]) {
      expect(placeInSong(place, BEATS)).toBe(true);
    }
  });

  it("rejects beats outside the song, or a place with no beats — the premise stands on nothing", () => {
    for (const place of ["17拍目", "13〜20拍目", "0拍目", "9〜5拍目", "さいご", "", "ド6 の ところ"]) {
      expect(placeInSong(place, BEATS)).toBe(false);
    }
  });
});

describe("soundsLikeVerdictOrInstruction", () => {
  it("catches verdicts and praise, whatever the kana", () => {
    for (const text of ["じょうずだね", "ヘタじゃないよ", "すごい！", "いい感じ"]) {
      expect(soundsLikeVerdictOrInstruction(text)).toBe(true);
    }
  });

  it("leaves ordinary scenes that only contain a verb's kana", () => {
    // かえると = カエルと, かえて ⊂ むかえて, よくなる ⊂ なかよくなる
    for (const text of ["かえると いっしょに うたう", "あさを むかえて", "なかよくなる うた", "すごく はやいね"]) {
      expect(soundsLikeVerdictOrInstruction(text)).toBe(false);
    }
  });

  it("lets a change through only where one is allowed — never 'better' or 'fix'", () => {
    const change = "さいごの 音を かえてみたら？";
    expect(soundsLikeVerdictOrInstruction(change)).toBe(true);
    expect(soundsLikeVerdictOrInstruction(change, { allowChange: true })).toBe(false);
    for (const text of ["ひくく したほうがいい", "音を 直して みよう"]) {
      expect(soundsLikeVerdictOrInstruction(text, { allowChange: true })).toBe(true);
    }
  });
});
