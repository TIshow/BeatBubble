import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

// One way of asking the model for every AI feature (#151), so the companion
// and the listener check can't drift in model, effort or how a refusal is
// handled.

// The cheapest current model, chosen for this: each task is a few short lines
// from a page of text, and each feature is checked against real songs before
// any child sees it.
export const AI_MODEL = "claude-haiku-5-5";

// Only what is needed from a client, so a test can stand in for the network.
export type ModelClient = Pick<Anthropic, "messages">;

export type Usage = { inputTokens: number; outputTokens: number };

export async function askStructured<S extends z.ZodType>(
  client: ModelClient,
  request: { system: string; user: string; schema: S }
): Promise<{ output: z.infer<S> | null; refused: boolean; usage: Usage }> {
  const response = await client.messages.parse({
    model: AI_MODEL,
    // Room for the model's thinking as well as the short answer; only what is
    // used is billed.
    max_tokens: 8000,
    system: request.system,
    messages: [{ role: "user", content: request.user }],
    // The shape is enforced by the API (structured outputs); what the text
    // says is checked by the caller afterwards.
    output_config: { effort: "low", format: zodOutputFormat(request.schema) },
  });
  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
  // Checked before reading the content: a declined request carries none. Haiku
  // has no server-side fallback, so the caller shows a neutral message.
  if (response.stop_reason === "refusal") return { output: null, refused: true, usage };
  // Null when the reply couldn't be parsed (e.g. cut off at max_tokens).
  return { output: response.parsed_output ?? null, refused: false, usage };
}
