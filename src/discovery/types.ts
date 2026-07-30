export const DISCOVERY_IDS = [
  'interval_third',
  'open_fifth',
  'close_tension',
  'stepwise_run',
  'call_and_response',
  'rest_then_burst',
  'rhythm_loop',
  'sustain_contrast',
] as const;

export type DiscoveryId = (typeof DISCOVERY_IDS)[number];

export type DiscoveryDefinition = {
  id: DiscoveryId;
  ruleVersion: number;
  sortOrder: number;
};

export type DiscoveryMatch = {
  cardId: DiscoveryId;
  startStep: number;
  triggerStep: number;
  evidenceNoteIds: string[];
  evidenceHitIds: string[];
};
