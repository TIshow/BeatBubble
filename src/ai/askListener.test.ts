import { describe, expect, it } from "vitest";
import { DEFAULT_SONG } from "@/core/defaults";
import type { Song } from "@/core/types";
import { askListener } from "./askListener";
import { AI_MODEL, type ModelClient } from "./model";
import { LISTEN_SYSTEM_PROMPT } from "./listen";

const song: Song = {
  ...structuredClone(DEFAULT_SONG),
  blocks: 1,
  melody: { notes: [{ id: "n1", note: "C4", startStep: 0, durationSteps: 4 }] },
};

// Stands in for the SDK client: records the request, returns a canned reply.
function fakeClient(reply: { stop_reason: string; parsed_output: unknown }) {
  const calls: Record<string, unknown>[] = [];
  const client = {
    messages: {
      parse: async (params: Record<string, unknown>) => {
        calls.push(params);
        return { ...reply, usage: { input_tokens: 1200, output_tokens: 300 } };
      },
    },
  } as unknown as ModelClient;
  return { client, calls };
}

const scene = { scene: "しずかな あさ", because: "ドが ながく つづくから" };

describe("askListener", () => {
  it("sends the score, the listener's rules, the chosen model and low effort", async () => {
    const { client, calls } = fakeClient({ stop_reason: "end_turn", parsed_output: { impressions: [scene] } });
    await askListener(client, song);
    const params = calls[0] as {
      model: string;
      system: string;
      messages: { content: string }[];
      output_config: { effort: string };
    };
    expect(params.model).toBe(AI_MODEL);
    expect(params.system).toBe(LISTEN_SYSTEM_PROMPT);
    expect(params.messages[0].content).toContain("1拍目: [1]ド4×4");
    expect(params.output_config.effort).toBe("low");
  });

  it("returns the impressions that pass the filter, with the token counts", async () => {
    const { client } = fakeClient({
      stop_reason: "end_turn",
      parsed_output: { impressions: [scene, { scene: "とても上手な曲", because: "ドが あるから" }] },
    });
    expect(await askListener(client, song)).toEqual({
      impressions: [scene],
      dropped: [
        {
          impression: { scene: "とても上手な曲", because: "ドが あるから" },
          reason: "verdict-or-instruction",
        },
      ],
      refused: false,
      usage: { inputTokens: 1200, outputTokens: 300 },
    });
  });

  it("reports a refusal without reading the content", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", parsed_output: { impressions: [scene] } });
    const result = await askListener(client, song);
    expect(result.refused).toBe(true);
    expect(result.impressions).toEqual([]);
  });

  it("returns nothing when the reply could not be parsed (e.g. cut off)", async () => {
    const { client } = fakeClient({ stop_reason: "max_tokens", parsed_output: null });
    expect((await askListener(client, song)).impressions).toEqual([]);
  });
});
