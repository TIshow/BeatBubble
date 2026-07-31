import type { ChallengeCard, ChallengeId } from './types';

export const CHALLENGE_CARDS = [
  {
    id: 'rain',
    icon: '☔',
    techniqueIds: [
      'rain_droplets',
      'rain_downpour',
      'rain_ripples',
      'rain_thunder',
      'rain_clearing',
      'rain_wind',
    ],
  },
  {
    id: 'ghost',
    icon: '👻',
    techniqueIds: ['ghost_shadow', 'ghost_shiver', 'ghost_approach', 'ghost_surprise'],
  },
  {
    id: 'run',
    icon: '🏃',
    techniqueIds: ['run_stride', 'run_fast', 'run_footsteps', 'run_uphill', 'run_jump'],
  },
] as const satisfies readonly ChallengeCard[];

export const CHALLENGE_IDS = CHALLENGE_CARDS.map((card) => card.id) as readonly ChallengeId[];

export function challengeCard(id: ChallengeId): ChallengeCard {
  const card = CHALLENGE_CARDS.find((item) => item.id === id);
  if (!card) {
    throw new Error(`Unknown challenge: ${id}`);
  }
  return card;
}
