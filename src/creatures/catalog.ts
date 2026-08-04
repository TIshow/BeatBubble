import { DISCOVERY_IDS, type DiscoveryId } from '@/discovery/catalog';
import type { CreatureCatalog, CreatureDefinition, CreatureRevealEffect } from './types';

function defineCreature<Id extends DiscoveryId>(
  discoveryId: Id,
  revealEffect: CreatureRevealEffect,
): CreatureDefinition<Id> {
  return {
    discoveryId,
    portraitPath: `/creatures/${discoveryId}/portrait.png`,
    revealEffect,
  };
}

export const CREATURE_CATALOG = {
  interval_third: defineCreature('interval_third', 'ear-harmony'),
  open_fifth: defineCreature('open_fifth', 'wide-unfold'),
  close_tension: defineCreature('close_tension', 'shiver-wave'),
  stepwise_run: defineCreature('stepwise_run', 'step-climb'),
  call_and_response: defineCreature('call_and_response', 'echo-response'),
  rest_then_burst: defineCreature('rest_then_burst', 'quiet-burst'),
  rhythm_loop: defineCreature('rhythm_loop', 'loop-chase'),
  sustain_contrast: defineCreature('sustain_contrast', 'stretch-and-step'),
} as const satisfies CreatureCatalog;

export const CREATURES: readonly CreatureDefinition[] = DISCOVERY_IDS.map(
  (id) => CREATURE_CATALOG[id],
);

export function creatureForDiscovery(id: DiscoveryId): CreatureDefinition {
  return CREATURE_CATALOG[id];
}
