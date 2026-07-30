import type { DiscoveryId } from './catalog';

export type { DiscoveryDefinition, DiscoveryId } from './catalog';

export type DiscoveryMatch = {
  cardId: DiscoveryId;
  startStep: number;
  triggerStep: number;
  evidenceNoteIds: string[];
  evidenceHitIds: string[];
};
