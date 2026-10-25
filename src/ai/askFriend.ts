import { z } from "zod";
import type { Song } from "@/core/types";
import { FRIEND_SYSTEM_PROMPT, friendUserMessage, pickFriendLines, type FriendLine } from "./friend";
import type { DropReason } from "./guard";
import { askStructured, type ModelClient, type Usage } from "./model";
import { scoreToText } from "./scoreText";

const FriendResponse = z.object({
  lines: z.array(z.object({ place: z.string(), line: z.string() })),
});

export type FriendResult = {
  // Empty when the model declined or no candidate passed; the editor then has
  // the companion say a fixed, harmless line instead.
  lines: FriendLine[];
  dropped: { line: FriendLine; reason: DropReason }[];
  refused: boolean;
  usage: Usage;
};

export async function askFriend(client: ModelClient, song: Song): Promise<FriendResult> {
  const { output, refused, usage } = await askStructured(client, {
    system: FRIEND_SYSTEM_PROMPT,
    user: friendUserMessage(scoreToText(song)),
    schema: FriendResponse,
  });
  const { lines, dropped } = pickFriendLines(output?.lines ?? [], song.blocks);
  return { lines, dropped, refused, usage };
}
