import { describe, it, expect } from "vitest";
import {
  validateSongMeta,
  containsBlockedWord,
  containsSensitiveWord,
  normalizeForMatch,
  songWithinSizeLimit,
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "./validation";

describe("validateSongMeta", () => {
  it("accepts normal title/author", () => {
    expect(validateSongMeta({ title: "茶つみ", author: "たろう" })).toEqual({ ok: true });
  });

  it("trims and rejects empty", () => {
    expect(validateSongMeta({ title: "   ", author: "a" })).toEqual({
      ok: false,
      reason: "title-empty",
    });
    expect(validateSongMeta({ title: "ok", author: "  " })).toEqual({
      ok: false,
      reason: "author-empty",
    });
  });

  it("rejects over-length input", () => {
    expect(validateSongMeta({ title: "x".repeat(MAX_TITLE_LENGTH + 1), author: "a" })).toEqual({
      ok: false,
      reason: "title-too-long",
    });
    expect(validateSongMeta({ title: "ok", author: "y".repeat(MAX_AUTHOR_LENGTH + 1) })).toEqual({
      ok: false,
      reason: "author-too-long",
    });
  });

  it("rejects blocked words (case-insensitive, in title or author)", () => {
    expect(validateSongMeta({ title: "FUCK you", author: "a" })).toEqual({
      ok: false,
      reason: "blocked-word",
    });
    expect(validateSongMeta({ title: "song", author: "しね" })).toEqual({
      ok: false,
      reason: "blocked-word",
    });
  });
});

describe("containsBlockedWord", () => {
  it("detects substrings case-insensitively", () => {
    expect(containsBlockedWord("ShItpost")).toBe(true);
    expect(containsBlockedWord("happy song")).toBe(false);
  });

  it("sees through width / kana / spacing / symbol dodges", () => {
    for (const dodge of ["死ね", "し ね", "シネ", "ｼﾈ", "し☆ね", "ＦＵＣＫ"]) {
      expect(containsBlockedWord(dodge)).toBe(true);
    }
  });

  it("does not flag mischief words (those are sensitive, not blocked)", () => {
    expect(containsBlockedWord("うんこ")).toBe(false);
    expect(containsBlockedWord("ちんこ")).toBe(false);
  });
});

describe("normalizeForMatch", () => {
  it("folds width, case, kana, and wedged separators", () => {
    expect(normalizeForMatch("ＦＵＣＫ")).toBe("fuck");
    expect(normalizeForMatch("シネ")).toBe("しね");
    expect(normalizeForMatch("ｼﾈ")).toBe("しね");
    expect(normalizeForMatch("し ね")).toBe("しね");
    expect(normalizeForMatch("し☆ね")).toBe("しね");
  });
});

describe("containsSensitiveWord", () => {
  it("flags mischief words, including inside a longer title", () => {
    expect(containsSensitiveWord("うんこ")).toBe(true);
    expect(containsSensitiveWord("うんこブギ")).toBe(true);
    expect(containsSensitiveWord("バカ")).toBe(true); // katakana
  });

  it("does not flag the hard-block words (block takes over for those)", () => {
    expect(containsSensitiveWord("死ね")).toBe(false);
  });
});

describe("innocent titles stay clean (false-positive guard)", () => {
  // Each collides with a word we deliberately left OUT of the lists, so it
  // must NOT trip either tier: 激しい↛はげ, かすみ↛カス, 結末↛けつ.
  const innocent = ["きらきらぼし", "激しいビート", "かすみそう", "けつまつ", "My Song"];
  for (const title of innocent) {
    it(`allows "${title}"`, () => {
      expect(containsBlockedWord(title)).toBe(false);
      expect(containsSensitiveWord(title)).toBe(false);
    });
  }
});

describe("songWithinSizeLimit", () => {
  it("accepts small payloads and rejects huge ones", () => {
    expect(songWithinSizeLimit({ a: 1 })).toBe(true);
    expect(songWithinSizeLimit({ big: "x".repeat(200_000) })).toBe(false);
  });
});

describe("validateSongMeta — description", () => {
  const base = { title: "きらきら", author: "たろう" };

  it("is optional", () => {
    expect(validateSongMeta(base)).toEqual({ ok: true });
    expect(validateSongMeta({ ...base, description: "" })).toEqual({ ok: true });
  });

  it("accepts a note about what the child worked on", () => {
    expect(
      validateSongMeta({ ...base, description: "さいごの ながい音を くふうした" })
    ).toEqual({ ok: true });
  });

  it("rejects an over-long note", () => {
    expect(
      validateSongMeta({ ...base, description: "あ".repeat(MAX_DESCRIPTION_LENGTH + 1) })
    ).toEqual({ ok: false, reason: "description-too-long" });
  });

  it("applies the blocked words to it too — it is published text", () => {
    expect(validateSongMeta({ ...base, description: "しね" })).toEqual({
      ok: false,
      reason: "blocked-word",
    });
  });

  it("sees through the same dodges as the title does", () => {
    expect(validateSongMeta({ ...base, description: "し ね" })).toEqual({
      ok: false,
      reason: "blocked-word",
    });
  });
});
