import { z } from "zod";
import type { Song } from "@/core/types";
import type { DropReason } from "./guard";
import { LISTEN_SYSTEM_PROMPT, listenUserMessage, sortImpressions, type Impression } from "./listen";
import { askStructured, type ModelClient, type Usage } from "./model";
import { scoreToText } from "./scoreText";

// The counts and lengths the prompt asks for are left to the filter — it drops,
// the schema would reject the lot.
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
  usage: Usage;
};

export async function askListener(client: ModelClient, song: Song): Promise<ListenResult> {
  const { output, refused, usage } = await askStructured(client, {
    system: LISTEN_SYSTEM_PROMPT,
    user: listenUserMessage(scoreToText(song)),
    schema: ListenResponse,
  });
  const { kept, dropped } = sortImpressions(output?.impressions ?? []);
  return { impressions: kept, dropped, refused, usage };
}
