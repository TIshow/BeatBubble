import type { DiscoveryId } from '@/discovery/types';

export const CREATURE_REVEAL_EFFECTS = [
  'ear-harmony',
  'wide-unfold',
  'shiver-wave',
  'step-climb',
  'echo-response',
  'quiet-burst',
  'loop-chase',
  'stretch-and-step',
] as const;

export type CreatureRevealEffect = (typeof CREATURE_REVEAL_EFFECTS)[number];

export type CreatureDefinition<Id extends DiscoveryId = DiscoveryId> = Readonly<{
  discoveryId: Id;
  portraitPath: `/creatures/${Id}/portrait.png`;
  revealEffect: CreatureRevealEffect;
}>;

export type CreatureCatalog = {
  readonly [Id in DiscoveryId]: CreatureDefinition<Id>;
};
