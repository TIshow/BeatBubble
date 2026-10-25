'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { scoreToText } from '@/ai/scoreText';
import type { Song } from '@/core/types';
import { requestFriendLines } from '@/lib/aiClient';
import { isSilent, lineForError, replay, type Heard, type Speech } from '@/ui/companionLine';

// Long enough for a child to read a line of up to 60 characters.
const SPEECH_MS = 12_000;

export type CompanionTalk = {
  speech: Speech | null;
  speak: () => Promise<void>;
  hush: () => void;
};

/**
 * What the companion is saying (#151), and `speak` for a tap. Only a tap asks:
 * nothing is sent while the child works, and the same notes are never sent
 * twice — tapping again says the next line already heard.
 */
export function useCompanionLine(song: Song, canTalk: boolean): CompanionTalk {
  const [speech, setSpeech] = useState<Speech | null>(null);
  const heardRef = useRef<Heard | null>(null);
  const askingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  const show = useCallback((next: Speech) => {
    window.clearTimeout(timerRef.current);
    setSpeech(next);
    // "Thinking" stays until the answer replaces it.
    if (next.kind === 'own' && next.line === 'thinking') return;
    timerRef.current = window.setTimeout(() => setSpeech(null), SPEECH_MS);
  }, []);

  const hush = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setSpeech(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const speak = useCallback(async () => {
    if (!canTalk || askingRef.current) return;
    if (isSilent(song)) return show({ kind: 'own', line: 'empty' });

    // Keyed on exactly what the model would read, so a change it couldn't see
    // (the note filter, the range) doesn't spend a request.
    const score = scoreToText(song);
    const again = replay(heardRef.current, score);
    if (again) {
      heardRef.current = again.heard;
      return show(again.speech);
    }

    askingRef.current = true;
    show({ kind: 'own', line: 'thinking' });
    const outcome = await requestFriendLines(song);
    askingRef.current = false;
    if ('error' in outcome) return show({ kind: 'own', line: lineForError(outcome.error) });

    const first = replay({ score, lines: outcome.lines, next: 0 }, score)!;
    heardRef.current = first.heard;
    show(first.speech);
  }, [canTalk, song, show]);

  return { speech, speak, hush };
}
