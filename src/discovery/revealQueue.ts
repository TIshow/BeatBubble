import type { DiscoveryId } from './types';

export type DiscoveryRevealItem =
  | { kind: 'card'; cardId: DiscoveryId }
  | { kind: 'summary'; count: number };

const MAX_INDIVIDUAL_REVEALS = 3;

export function revealItemsFor(cardIds: readonly DiscoveryId[]): DiscoveryRevealItem[] {
  const unique = [...new Set(cardIds)];
  const cards = unique
    .slice(0, MAX_INDIVIDUAL_REVEALS)
    .map((cardId): DiscoveryRevealItem => ({ kind: 'card', cardId }));
  const remaining = unique.length - cards.length;
  return remaining > 0 ? [...cards, { kind: 'summary', count: remaining }] : cards;
}
