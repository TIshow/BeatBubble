import { z } from "zod";
import type { Song } from "@/core/types";
import type { DropReason } from "./guard";
import { askStructured, type ModelClient, type Usage } from "./model";
import { QUESTION_SYSTEM_PROMPT, questionUserMessage, sortQuestions, type Question } from "./questions";
import { scoreToText } from "./scoreText";

const QuestionResponse = z.object({
  questions: z.array(z.object({ place: z.string(), question: z.string() })),
});

export type QuestionResult = {
  // Empty when the model declined or everything was filtered out; the caller
  // then simply offers no questions — the note box works without them.
  questions: Question[];
  dropped: { question: Question; reason: DropReason }[];
  refused: boolean;
  usage: Usage;
};

export async function askQuestioner(client: ModelClient, song: Song): Promise<QuestionResult> {
  const { output, refused, usage } = await askStructured(client, {
    system: QUESTION_SYSTEM_PROMPT,
    user: questionUserMessage(scoreToText(song)),
    schema: QuestionResponse,
  });
  const { kept, dropped } = sortQuestions(output?.questions ?? [], song.blocks);
  return { questions: kept, dropped, refused, usage };
}
