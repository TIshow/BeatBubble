import type { Song } from '@/core/types';
import { DISCOVERY_CARDS } from './catalog';
import { HARMONY_RULES } from './rules/harmony';
import { MELODY_RULES } from './rules/melody';
import { RHYTHM_RULES } from './rules/rhythm';
import type { DiscoveryRule } from './rules/shared';
import { buildDiscoveryTimeline } from './timeline';
import type { DiscoveryMatch } from './types';

const RULES: readonly DiscoveryRule[] = [...HARMONY_RULES, ...MELODY_RULES, ...RHYTHM_RULES];
const SORT_ORDER = new Map(DISCOVERY_CARDS.map((card) => [card.id, card.sortOrder]));

export function detectDiscoveries(song: Song): DiscoveryMatch[] {
  const timeline = buildDiscoveryTimeline(song);
  return RULES.flatMap((rule) => rule(timeline)).sort(
    (a, b) =>
      a.triggerStep - b.triggerStep ||
      (SORT_ORDER.get(a.cardId) ?? 0) - (SORT_ORDER.get(b.cardId) ?? 0) ||
      a.startStep - b.startStep,
  );
}
