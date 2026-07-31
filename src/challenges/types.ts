export type ChallengeId = 'rain' | 'ghost' | 'run';

export type ChallengeTechniqueId =
  | 'rain_droplets'
  | 'rain_downpour'
  | 'rain_ripples'
  | 'rain_thunder'
  | 'rain_clearing'
  | 'rain_wind'
  | 'ghost_shadow'
  | 'ghost_shiver'
  | 'ghost_approach'
  | 'ghost_surprise'
  | 'run_stride'
  | 'run_fast'
  | 'run_footsteps'
  | 'run_uphill'
  | 'run_jump';

export type ChallengeReaction = {
  step: number;
  techniques: readonly ChallengeTechniqueId[];
};

export type ChallengeAnalysis = {
  challengeId: ChallengeId;
  reactions: readonly ChallengeReaction[];
  usedTechniques: readonly ChallengeTechniqueId[];
};

export type ChallengeCompletion = {
  challengeId: ChallengeId;
  usedTechniques: readonly ChallengeTechniqueId[];
};

export type ChallengeCard = {
  id: ChallengeId;
  icon: string;
  techniqueIds: readonly ChallengeTechniqueId[];
};
