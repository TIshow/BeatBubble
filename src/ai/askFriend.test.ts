import { describe, expect, it } from "vitest";
import { DEFAULT_SONG } from "@/core/defaults";
import type { Song } from "@/core/types";
import { askFriend } from "./askFriend";
import { AI_MODEL, type ModelClient } from "./model";

const song: Song = {
  ...structuredClone(DEFAULT_SONG),
  blocks: 4,
  melody: { notes: [{ id: "n1", note: "C5", startStep: 12, durationSteps: 4 }] },
};

function fakeClient(reply: { stop_reason: string; parsed_output: unknown }) {
  const calls: Record<string, unknown>[] = [];
  const client = {
    messages: {
      parse: async (params: Record<string, unknown>) => {
        calls.push(params);
        return { ...reply, usage: { input_tokens: 800, output_tokens: 150 } };
      },
    },
  } as unknown as ModelClient;
  return { client, calls };
}

const notice = { beats: "4拍目", line: "さいごに 高い ドが ひとつ なるね。どんな つもり？" };
const suggestion = { beats: "4拍目", line: "さいごの ドを、ながく したら どうなるかな？" };
const kept = (kind: string, c: { beats: string; line: string }) => ({ kind, place: c.beats, line: c.line });
const reply = (parsed: { notices?: unknown[]; impressions?: unknown[]; suggestions?: unknown[] }) => ({
  stop_reason: "end_turn",
  parsed_output: { notices: [], impressions: [], suggestions: [], ...parsed },
});

describe("askFriend", () => {
  it("sends the score and the companion's rules to the shared model", async () => {
    const { client, calls } = fakeClient(reply({ notices: [notice] }));
    await askFriend(client, song);
    const params = calls[0] as { model: string; system: string; messages: { content: string }[] };
    expect(params.model).toBe(AI_MODEL);
    // The seeds are shuffled per request; the rules around them are fixed.
    expect(params.system).toContain("相棒です");
    expect(params.system).toContain("ためしてみる の れい");
    expect(params.messages[0].content).toContain("4拍目: [1]ド5×4");
  });

  it("labels each line with its kind and keeps the order a child hears them in", async () => {
    const { client } = fakeClient(reply({ suggestions: [suggestion], notices: [notice] }));
    expect((await askFriend(client, song)).lines).toEqual([kept("notice", notice), kept("suggestion", suggestion)]);
  });

  it("falls through to a spare when the first candidate praises", async () => {
    const { client } = fakeClient(reply({ notices: [{ beats: "4拍目", line: "すごい！" }, notice] }));
    const result = await askFriend(client, song);
    expect(result.lines).toEqual([kept("notice", notice)]);
    expect(result.dropped.map((d) => d.reason)).toEqual(["verdict-or-instruction"]);
  });

  it("has nothing to say when the model declines", async () => {
    const { client } = fakeClient({ ...reply({ notices: [notice] }), stop_reason: "refusal" });
    expect(await askFriend(client, song)).toMatchObject({ lines: [], refused: true });
  });
});
