import { describe, expect, it } from "vitest";
import { DEFAULT_SONG } from "@/core/defaults";
import type { QuestionResult } from "./askQuestioner";
import { answerQuestions, type EndpointDeps, type QuotaStatus } from "./questionsEndpoint";

const question = { place: "1拍目", question: "さいしょの ドは どんな つもり？" };
const answered: QuestionResult = {
  questions: [question],
  dropped: [{ question: { place: "99拍目", question: "？" }, reason: "off-the-score" }],
  refused: false,
  usage: { inputTokens: 900, outputTokens: 200 },
};

// Records what was asked, so tests can see whether the quota or model was used.
function deps(quota: QuotaStatus = "ok", ask: () => Promise<QuestionResult> = async () => answered) {
  const calls = { quota: [] as string[], ask: 0 };
  const d: EndpointDeps = {
    takeQuota: async (token) => {
      calls.quota.push(token);
      return quota;
    },
    ask: async () => {
      calls.ask++;
      return ask();
    },
  };
  return { d, calls };
}

const body = { song: DEFAULT_SONG };

describe("answerQuestions", () => {
  it("answers with the questions that passed — nothing dropped, no token counts", async () => {
    const { d, calls } = deps();
    const reply = await answerQuestions("Bearer abc", body, d);
    expect(reply).toEqual({ status: 200, body: { questions: [question] } });
    expect(calls.quota).toEqual(["abc"]);
  });

  it("turns away a request without a token, before anything else", async () => {
    const { d, calls } = deps();
    expect(await answerQuestions(null, body, d)).toEqual({ status: 401, body: { error: "signed-out" } });
    expect(await answerQuestions("Basic abc", body, d)).toEqual({ status: 401, body: { error: "signed-out" } });
    expect(calls).toEqual({ quota: [], ask: 0 });
  });

  it("rejects a missing or oversized song without spending the class's allowance", async () => {
    const { d, calls } = deps();
    for (const bad of [null, {}, { song: "x" }, { song: { big: "x".repeat(200_000) } }]) {
      expect((await answerQuestions("Bearer abc", bad, d)).status).toBe(400);
    }
    expect(calls.quota).toEqual([]);
  });

  it("says why the quota said no, and doesn't ask the model", async () => {
    const cases: [QuotaStatus, number][] = [
      ["signed-out", 401],
      ["not-enabled", 403],
      ["limit", 429],
      ["unavailable", 503],
    ];
    for (const [quota, status] of cases) {
      const { d, calls } = deps(quota);
      const reply = await answerQuestions("Bearer abc", body, d);
      expect(reply.status).toBe(status);
      expect(calls.ask).toBe(0);
    }
  });

  it("reports a model failure as unavailable", async () => {
    const { d } = deps("ok", async () => {
      throw new Error("overloaded");
    });
    expect(await answerQuestions("Bearer abc", body, d)).toEqual({
      status: 502,
      body: { error: "unavailable" },
    });
  });
});
