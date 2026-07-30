import type { DiscoveryId } from './types';
import type { DiscoveryMatch } from './types';

export type DiscoveryRevealItem = {
  cardId: DiscoveryId;
  evidenceNoteIds: string[];
  evidenceHitIds: string[];
};

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function revealItemsFor(
  cardIds: readonly DiscoveryId[],
  matches: readonly DiscoveryMatch[],
): DiscoveryRevealItem[] {
  return [...new Set(cardIds)].map((cardId) => {
    const cardMatches = matches.filter((match) => match.cardId === cardId);
    return {
      cardId,
      evidenceNoteIds: sortedUnique(cardMatches.flatMap((match) => match.evidenceNoteIds)),
      evidenceHitIds: sortedUnique(cardMatches.flatMap((match) => match.evidenceHitIds)),
    };
  });
}
