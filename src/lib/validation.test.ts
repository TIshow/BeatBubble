import { describe, it, expect } from "vitest";
import {
  validateSongMeta,
  containsBlockedWord,
  songWithinSizeLimit,
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
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
});

describe("songWithinSizeLimit", () => {
  it("accepts small payloads and rejects huge ones", () => {
    expect(songWithinSizeLimit({ a: 1 })).toBe(true);
    expect(songWithinSizeLimit({ big: "x".repeat(200_000) })).toBe(false);
  });
});
