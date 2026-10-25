import { z } from "zod";
import type { Song } from "@/core/types";
import { friendSystemPrompt, friendUserMessage, pickFriendLines, type FriendLine } from "./friend";
import type { DropReason } from "./guard";
import { askStructured, type ModelClient, type Usage } from "./model";
import { scoreToText } from "./scoreText";

// `beats` rather than `place`: asked for a "place", the model sometimes wrote
// one in words (「さいしょ」), which can't be checked against the score.
const Candidate = z.object({ beats: z.string(), line: z.string() });
// One list per kind, named as the prompt names them.
const FriendResponse = z.object({
  notices: z.array(Candidate),
  impressions: z.array(Candidate),
  suggestions: z.array(Candidate),
});

export type FriendResult = {
  // In the order a child hears them. Empty when the model declined or no
  // candidate passed; the editor then has the companion say a fixed, harmless
  // line instead.
  lines: FriendLine[];
  dropped: { line: FriendLine; reason: DropReason }[];
  refused: boolean;
  usage: Usage;
};

export async function askFriend(client: ModelClient, song: Song): Promise<FriendResult> {
  const { output, refused, usage } = await askStructured(client, {
    system: friendSystemPrompt(),
    user: friendUserMessage(scoreToText(song)),
    schema: FriendResponse,
  });
  const items: FriendLine[] = output
    ? [
        ...output.notices.map((c) => ({ kind: "notice" as const, place: c.beats, line: c.line })),
        ...output.impressions.map((c) => ({ kind: "impression" as const, place: c.beats, line: c.line })),
        ...output.suggestions.map((c) => ({ kind: "suggestion" as const, place: c.beats, line: c.line })),
      ]
    : [];
  const { lines, dropped } = pickFriendLines(items, song.blocks);
  return { lines, dropped, refused, usage };
}
