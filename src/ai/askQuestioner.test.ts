import { describe, expect, it } from "vitest";
import { DEFAULT_SONG } from "@/core/defaults";
import type { Song } from "@/core/types";
import { askQuestioner } from "./askQuestioner";
import { AI_MODEL, type ModelClient } from "./model";
import { QUESTION_SYSTEM_PROMPT } from "./questions";

const song: Song = {
  ...structuredClone(DEFAULT_SONG),
  blocks: 4,
  melody: { notes: [{ id: "n1", note: "C4", startStep: 12, durationSteps: 4 }] },
};

function fakeClient(reply: { stop_reason: string; parsed_output: unknown }) {
  const calls: Record<string, unknown>[] = [];
  const client = {
    messages: {
      parse: async (params: Record<string, unknown>) => {
        calls.push(params);
        return { ...reply, usage: { input_tokens: 900, output_tokens: 200 } };
      },
    },
  } as unknown as ModelClient;
  return { client, calls };
}

const question = { place: "4拍目", question: "さいごに ドが のびるね。どんな つもり？" };

describe("askQuestioner", () => {
  it("sends the score and the questioner's rules to the shared model", async () => {
    const { client, calls } = fakeClient({ stop_reason: "end_turn", parsed_output: { questions: [question] } });
    await askQuestioner(client, song);
    const params = calls[0] as { model: string; system: string; messages: { content: string }[] };
    expect(params.model).toBe(AI_MODEL);
    expect(params.system).toBe(QUESTION_SYSTEM_PROMPT);
    expect(params.messages[0].content).toContain("4拍目: [1]ド4×4");
  });

  it("checks places against this song's length", async () => {
    const { client } = fakeClient({
      stop_reason: "end_turn",
      parsed_output: { questions: [question, { ...question, place: "9拍目" }] },
    });
    const result = await askQuestioner(client, song);
    expect(result.questions).toEqual([question]);
    expect(result.dropped.map((d) => d.reason)).toEqual(["off-the-score"]);
    expect(result.usage).toEqual({ inputTokens: 900, outputTokens: 200 });
  });

  it("offers nothing when the model declines", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", parsed_output: { questions: [question] } });
    const result = await askQuestioner(client, song);
    expect(result).toMatchObject({ questions: [], refused: true });
  });
});
