import type { DiscoveryDefinition, DiscoveryId } from './types';
import { DISCOVERY_IDS } from './types';

export const DISCOVERY_CARDS: readonly DiscoveryDefinition[] = [
  { id: 'interval_third', ruleVersion: 1, sortOrder: 10 },
  { id: 'open_fifth', ruleVersion: 1, sortOrder: 20 },
  { id: 'close_tension', ruleVersion: 1, sortOrder: 30 },
  { id: 'stepwise_run', ruleVersion: 1, sortOrder: 40 },
  { id: 'call_and_response', ruleVersion: 1, sortOrder: 50 },
  { id: 'rest_then_burst', ruleVersion: 1, sortOrder: 60 },
  { id: 'rhythm_loop', ruleVersion: 1, sortOrder: 70 },
  { id: 'sustain_contrast', ruleVersion: 1, sortOrder: 80 },
];

const DISCOVERY_ID_SET: ReadonlySet<string> = new Set(DISCOVERY_IDS);

export function isDiscoveryId(value: unknown): value is DiscoveryId {
  return typeof value === 'string' && DISCOVERY_ID_SET.has(value);
}
