import { describe, it, expect } from "vitest";
import { accountLineFor, type SongAuthor } from "@/lib/songAuthor";

const labels = {
  none: "アカウントなし",
  notSet: "—",
  gradeUnit: (n: number) => `${n}年`,
};

const authors = new Map<string, SongAuthor>([
  ["u1", { displayName: "上島寧々", grade: 4, className: "2" }],
  ["u2", { displayName: "堀川湊望", grade: null, className: null }],
  ["u3", { displayName: null, grade: 5, className: "1" }],
]);

const line = (song: { user_id: string | null; author: string }) =>
  accountLineFor(song, authors, labels);

describe("accountLineFor", () => {
  it("names the account, with grade and class when set", () => {
    expect(line({ user_id: "u1", author: "上島寧々" })).toEqual({
      text: "上島寧々（4年2）",
      differs: false,
    });
  });

  it("omits the parenthetical when the profile has no grade or class", () => {
    expect(line({ user_id: "u2", author: "堀川湊望" })).toEqual({
      text: "堀川湊望",
      differs: false,
    });
  });

  it("flags a typed author that doesn't match the account", () => {
    // The real case: published from one account under another child's name.
    expect(line({ user_id: "u1", author: "堀川湊望" })).toEqual({
      text: "上島寧々（4年2）",
      differs: true,
    });
  });

  it("does not flag when the account has no name to compare", () => {
    expect(line({ user_id: "u3", author: "だれか" })).toEqual({
      text: "—（5年1）",
      differs: false,
    });
  });

  it("says so when there is no account, rather than showing nothing", () => {
    expect(line({ user_id: null, author: "たろう" })).toEqual({
      text: "アカウントなし",
      differs: false,
    });
  });

  it("returns undefined while the account is still loading", () => {
    expect(line({ user_id: "unknown", author: "たろう" })).toBeUndefined();
  });
});
