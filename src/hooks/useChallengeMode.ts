'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeChallenge, reactionAt } from '@/challenges/analyze';
import { CHALLENGE_IDS } from '@/challenges/catalog';
import type {
  ChallengeAnalysis,
  ChallengeCompletion,
  ChallengeId,
  ChallengeReaction,
} from '@/challenges/types';
import type { Song } from '@/core/types';

export function useChallengeMode(song: Song) {
  const [activeChallengeId, setActiveChallengeId] = useState<ChallengeId | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [reaction, setReaction] = useState<ChallengeReaction | null>(null);
  const [completed, setCompleted] = useState<ChallengeCompletion | null>(null);

  const analysis = useMemo(
    () => (activeChallengeId ? analyzeChallenge(song, activeChallengeId) : null),
    [activeChallengeId, song],
  );
  const analysisRef = useRef<ChallengeAnalysis | null>(analysis);
  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  const openPicker = useCallback(() => {
    setCompleted(null);
    setIsPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const startChallenge = useCallback((id: ChallengeId) => {
    setActiveChallengeId(id);
    setReaction(null);
    setCompleted(null);
    setIsPickerOpen(false);
  }, []);

  const startRandomChallenge = useCallback(() => {
    const id = CHALLENGE_IDS[Math.floor(Math.random() * CHALLENGE_IDS.length)];
    startChallenge(id);
  }, [startChallenge]);

  const onPlaybackStep = useCallback((step: number) => {
    const current = analysisRef.current;
    setReaction(current ? reactionAt(current, step) : null);
  }, []);

  const stopPlayback = useCallback(() => {
    setReaction(null);
  }, []);

  const completeChallenge = useCallback(() => {
    const current = analysisRef.current;
    if (!current) return;
    setReaction(null);
    setCompleted({
      challengeId: current.challengeId,
      usedTechniques: current.usedTechniques,
    });
  }, []);

  const dismissCompletion = useCallback(() => {
    setCompleted(null);
  }, []);

  const exitChallenge = useCallback(() => {
    setActiveChallengeId(null);
    setReaction(null);
    setCompleted(null);
    setIsPickerOpen(false);
  }, []);

  return {
    activeChallengeId,
    reaction,
    completed,
    isPickerOpen,
    openPicker,
    closePicker,
    startChallenge,
    startRandomChallenge,
    onPlaybackStep,
    stopPlayback,
    completeChallenge,
    dismissCompletion,
    exitChallenge,
  };
}
