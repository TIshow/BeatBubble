'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Song } from '@/core/types';
import { detectDiscoveries } from '@/discovery/detector';
import {
  captureDiscoverySource,
  hasUserContribution,
  type DiscoverySourceSnapshot,
} from '@/discovery/eligibility';
import { revealItemsFor, type DiscoveryRevealItem } from '@/discovery/revealQueue';
import type { DiscoveryEffectEvent, DiscoveryId, DiscoveryMatch } from '@/discovery/types';

type Params = {
  song: Song;
  songRef: RefObject<Song>;
  currentUserId: string | null;
  loadedSongOwnerId: string | null;
  claimDiscoveries: (cardIds: readonly DiscoveryId[]) => DiscoveryId[];
};

function indexMatchesByTriggerStep(
  matches: readonly DiscoveryMatch[],
): Map<number, DiscoveryMatch[]> {
  const byStep = new Map<number, DiscoveryMatch[]>();
  for (const match of matches) {
    const atStep = byStep.get(match.triggerStep) ?? [];
    atStep.push(match);
    byStep.set(match.triggerStep, atStep);
  }
  return byStep;
}

export function useDiscoveryFeedback({
  song,
  songRef,
  currentUserId,
  loadedSongOwnerId,
  claimDiscoveries,
}: Params) {
  const [effects, setEffects] = useState<DiscoveryEffectEvent[]>([]);
  const [revealQueue, setRevealQueue] = useState<DiscoveryRevealItem[]>([]);
  const effectKeyRef = useRef(0);
  const sourceRef = useRef<DiscoverySourceSnapshot | null>(null);
  const matchesRef = useRef<Map<number, DiscoveryMatch[]>>(new Map());

  const matchesByStep = useMemo(() => indexMatchesByTriggerStep(detectDiscoveries(song)), [song]);
  useEffect(() => {
    matchesRef.current = matchesByStep;
  }, [matchesByStep]);

  const captureSource = useCallback((sourceSong: Song) => {
    sourceRef.current = captureDiscoverySource(sourceSong);
  }, []);

  const clearSource = useCallback(() => {
    sourceRef.current = null;
  }, []);

  const onPlaybackStep = useCallback(
    (step: number): boolean => {
      const matches = matchesRef.current.get(step);
      if (!matches || matches.length === 0) return false;

      const source =
        currentUserId && loadedSongOwnerId === currentUserId ? null : sourceRef.current;
      const earnable = matches
        .filter((match) => hasUserContribution(match, songRef.current, source))
        .map((match) => match.cardId);
      const newlyEarned = claimDiscoveries(earnable);
      if (newlyEarned.length === 0) return false;

      // Only a first meeting animates. The effect layer drops a creature in the
      // middle of the screen, and a match re-fires on every loop of the song —
      // so for a creature already met it landed on top of the grid again and
      // again while the child was trying to work.
      const nextEffects = newlyEarned.map((cardId) => ({
        key: effectKeyRef.current++,
        cardId,
      }));
      setEffects((current) => [...current, ...nextEffects].slice(-12));
      setRevealQueue((current) => [...current, ...revealItemsFor(newlyEarned, matches)]);
      return true;
    },
    [claimDiscoveries, currentUserId, loadedSongOwnerId, songRef],
  );

  const clearEffects = useCallback(() => setEffects([]), []);
  const dismissEffect = useCallback((key: number) => {
    setEffects((current) => current.filter((event) => event.key !== key));
  }, []);
  const finishReveal = useCallback(() => {
    setRevealQueue((current) => current.slice(1));
  }, []);

  return {
    effects,
    revealQueue,
    focus: revealQueue[0] ?? null,
    captureSource,
    clearSource,
    onPlaybackStep,
    clearEffects,
    dismissEffect,
    finishReveal,
  };
}
