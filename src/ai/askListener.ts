import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Song } from "@/core/types";
import {
  LISTEN_SYSTEM_PROMPT,
  listenUserMessage,
  sortImpressions,
  type DropReason,
  type Impression,
} from "./listen";
import { scoreToText } from "./scoreText";

// The cheapest current model, chosen for this (#151): the job is three short
// scenes from a page of text, and whether it actually reads the notes is what
// the validation run checks before any child sees it.
export const LISTEN_MODEL = "claude-haiku-5-5";

// The shape is enforced by the API (structured outputs); what the text says is
// enforced by keepSafeImpressions afterwards. The counts and lengths the prompt
// asks for are left to that filter — it drops, the schema would reject the lot.
const ListenResponse = z.object({
  impressions: z.array(z.object({ scene: z.string(), because: z.string() })),
});

export type ListenResult = {
  // Empty when the model declined or everything was filtered out; the caller
  // then shows a neutral message rather than an explanation of why.
  impressions: Impression[];
  // What the filter took out, and why — for the validation run's summary.
  dropped: { impression: Impression; reason: DropReason }[];
  refused: boolean;
  usage: { inputTokens: number; outputTokens: number };
};

// Only what this needs from a client, so a test can stand in for the network.
export type ListenerClient = Pick<Anthropic, "messages">;

export async function askListener(client: ListenerClient, song: Song): Promise<ListenResult> {
  const response = await client.messages.parse({
    model: LISTEN_MODEL,
    // Room for the model's thinking as well as the three short answers; only
    // what is used is billed.
    max_tokens: 8000,
    system: LISTEN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: listenUserMessage(scoreToText(song)) }],
    output_config: { effort: "low", format: zodOutputFormat(ListenResponse) },
  });

  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
  // Checked before reading the content: a declined request carries none.
  if (response.stop_reason === "refusal") {
    return { impressions: [], dropped: [], refused: true, usage };
  }
  const { kept, dropped } = sortImpressions(response.parsed_output?.impressions ?? []);
  return { impressions: kept, dropped, refused: false, usage };
}
