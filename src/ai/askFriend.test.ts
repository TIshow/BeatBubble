import { describe, expect, it } from "vitest";
import { DEFAULT_SONG } from "@/core/defaults";
import type { Song } from "@/core/types";
import { askFriend } from "./askFriend";
import { FRIEND_SYSTEM_PROMPT } from "./friend";
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

const line = { place: "4拍目", line: "さいごに 高い ドが ひとつ なるね。どんな つもり？" };

describe("askFriend", () => {
  it("sends the score and the companion's rules to the shared model", async () => {
    const { client, calls } = fakeClient({ stop_reason: "end_turn", parsed_output: { lines: [line] } });
    await askFriend(client, song);
    const params = calls[0] as { model: string; system: string; messages: { content: string }[] };
    expect(params.model).toBe(AI_MODEL);
    expect(params.system).toBe(FRIEND_SYSTEM_PROMPT);
    expect(params.messages[0].content).toContain("4拍目: [1]ド5×4");
  });

  it("falls through to a spare when the first candidate praises", async () => {
    const { client } = fakeClient({
      stop_reason: "end_turn",
      parsed_output: { lines: [{ place: "4拍目", line: "すごい！" }, line] },
    });
    const result = await askFriend(client, song);
    expect(result.lines).toEqual([line]);
    expect(result.dropped.map((d) => d.reason)).toEqual(["verdict-or-instruction"]);
  });

  it("has nothing to say when the model declines", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", parsed_output: { lines: [line] } });
    expect(await askFriend(client, song)).toMatchObject({ lines: [], refused: true });
  });
});
