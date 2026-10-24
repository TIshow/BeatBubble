"use client";

import { useState } from "react";
import type { Song } from "@/core/types";
import type { Question } from "@/ai/questions";
import type { Translations } from "@/lib/i18n";
import { requestQuestions, type QuestionsError } from "@/lib/aiClient";

type State =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "answered"; questions: Question[] }
  | { kind: "failed"; reason: QuestionsError | "empty" };

function failureText(reason: QuestionsError | "empty", t: Translations): string {
  switch (reason) {
    case "limit":
      return t.aiErrorLimit;
    case "signed-out":
      return t.aiErrorSignedOut;
    case "empty":
      return t.aiNoQuestions;
    default:
      return t.aiErrorUnavailable;
  }
}

// Questions about places in the song, under the note box (#151, idea ④). Only
// shown where a teacher turned AI on for the lesson; the parent decides that.
//
// The questions help a child say what they were going for — they never write
// it for them, so nothing here touches the note. Labelled as AI, and says in
// so many words that answering is the child's choice.
export function AiQuestions({ song, t }: { song: Song; t: Translations }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const ask = async () => {
    setState({ kind: "asking" });
    const outcome = await requestQuestions(song);
    if ("error" in outcome) setState({ kind: "failed", reason: outcome.error });
    else if (outcome.questions.length === 0) setState({ kind: "failed", reason: "empty" });
    else setState({ kind: "answered", questions: outcome.questions });
  };

  // Asking again after today's limit would only say the same thing.
  const canAsk = !(state.kind === "failed" && state.reason === "limit");

  return (
    <div className="ai-questions">
      {state.kind === "answered" && (
        <div className="ai-questions-box">
          <p className="ai-questions-title">{t.aiQuestionsTitle}</p>
          <ul>
            {state.questions.map((q) => (
              <li key={`${q.place}-${q.question}`}>{q.question}</li>
            ))}
          </ul>
          <p className="ai-questions-note">{t.aiQuestionsNote}</p>
        </div>
      )}
      {state.kind === "failed" && (
        <p className="ai-questions-failed" role="status">
          {failureText(state.reason, t)}
        </p>
      )}
      {canAsk && (
        <button
          type="button"
          className="ai-questions-btn"
          onClick={ask}
          disabled={state.kind === "asking"}
        >
          {state.kind === "asking"
            ? t.aiThinking
            : state.kind === "answered"
              ? t.aiAskAgain
              : t.aiAskButton}
        </button>
      )}
    </div>
  );
}
