import { DISCOVERY_IDS, type DiscoveryId } from '@/discovery/catalog';
import type { CreatureCatalog, CreatureDefinition } from './types';

export const CREATURE_CATALOG = {
  interval_third: {
    discoveryId: 'interval_third',
    portraitPath: '/creatures/interval_third/portrait.png',
    revealEffect: 'ear-harmony',
    translationKey: 'interval_third',
  },
  open_fifth: {
    discoveryId: 'open_fifth',
    portraitPath: '/creatures/open_fifth/portrait.png',
    revealEffect: 'wide-unfold',
    translationKey: 'open_fifth',
  },
  close_tension: {
    discoveryId: 'close_tension',
    portraitPath: '/creatures/close_tension/portrait.png',
    revealEffect: 'shiver-wave',
    translationKey: 'close_tension',
  },
  stepwise_run: {
    discoveryId: 'stepwise_run',
    portraitPath: '/creatures/stepwise_run/portrait.png',
    revealEffect: 'step-climb',
    translationKey: 'stepwise_run',
  },
  call_and_response: {
    discoveryId: 'call_and_response',
    portraitPath: '/creatures/call_and_response/portrait.png',
    revealEffect: 'echo-response',
    translationKey: 'call_and_response',
  },
  rest_then_burst: {
    discoveryId: 'rest_then_burst',
    portraitPath: '/creatures/rest_then_burst/portrait.png',
    revealEffect: 'quiet-burst',
    translationKey: 'rest_then_burst',
  },
  rhythm_loop: {
    discoveryId: 'rhythm_loop',
    portraitPath: '/creatures/rhythm_loop/portrait.png',
    revealEffect: 'loop-chase',
    translationKey: 'rhythm_loop',
  },
  sustain_contrast: {
    discoveryId: 'sustain_contrast',
    portraitPath: '/creatures/sustain_contrast/portrait.png',
    revealEffect: 'stretch-and-step',
    translationKey: 'sustain_contrast',
  },
} as const satisfies CreatureCatalog;

export const CREATURES: readonly CreatureDefinition[] = DISCOVERY_IDS.map(
  (id) => CREATURE_CATALOG[id],
);

export function creatureForDiscovery(id: DiscoveryId): CreatureDefinition {
  return CREATURE_CATALOG[id];
}
