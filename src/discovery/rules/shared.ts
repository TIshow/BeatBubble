import type { DiscoveryTimeline } from '../timeline';
import type { DiscoveryId, DiscoveryMatch } from '../types';

export type DiscoveryRule = (timeline: DiscoveryTimeline) => DiscoveryMatch[];

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function makeMatch(
  cardId: DiscoveryId,
  startStep: number,
  triggerStep: number,
  noteIds: string[],
  hitIds: string[] = [],
): DiscoveryMatch {
  return {
    cardId,
    startStep,
    triggerStep,
    evidenceNoteIds: sortedUnique(noteIds),
    evidenceHitIds: sortedUnique(hitIds),
  };
}
