import type { DiscoveryId } from './catalog';

export type { DiscoveryDefinition, DiscoveryId } from './catalog';

export type DiscoveryEvidence = {
  evidenceNoteIds: string[];
  evidenceHitIds: string[];
};

export type DiscoveryMatch = DiscoveryEvidence & {
  cardId: DiscoveryId;
  startStep: number;
  triggerStep: number;
};

