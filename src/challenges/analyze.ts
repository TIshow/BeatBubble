import { buildSongTimeline } from '@/core/timeline';
import type { SongTimeline, TimelineNote } from '@/core/timeline';
import type { Song } from '@/core/types';
import { noteNameToMidi } from '@/core/utils';
import { challengeCard } from './catalog';
import type {
  ChallengeAnalysis,
  ChallengeId,
  ChallengeReaction,
  ChallengeTechniqueId,
} from './types';

type StepFeatures = {
  highShortOnset: boolean;
  dense: boolean;
  longTone: boolean;
  kick: boolean;
  clearing: boolean;
  rising: boolean;
  lowTone: boolean;
  semitoneTension: boolean;
  afterRestEvent: boolean;
  repeatedPulse: boolean;
  fastTempo: boolean;
  drumHit: boolean;
};

function safePitchMidpoint(song: Song): number {
  try {
    return (
      (noteNameToMidi(song.constraints.minNote) + noteNameToMidi(song.constraints.maxNote)) / 2
    );
  } catch {
    return 66;
  }
}

function isSilent(timeline: SongTimeline, step: number): boolean {
  const frame = timeline.steps[step];
  return frame.activeNotes.length === 0 && frame.hits.length === 0;
}

function precedingSilence(timeline: SongTimeline, step: number): number {
  let count = 0;
  for (let cursor = step - 1; cursor >= 0 && isSilent(timeline, cursor); cursor--) {
    count++;
  }
  return count;
}

function silenceThrough(timeline: SongTimeline, step: number): number {
  if (!isSilent(timeline, step)) return 0;
  return precedingSilence(timeline, step) + 1;
}

function hasSemitoneTension(notes: readonly TimelineNote[]): boolean {
  for (let left = 0; left < notes.length; left++) {
    for (let right = left + 1; right < notes.length; right++) {
      const pitchClassDistance = Math.abs(notes[left].midi - notes[right].midi) % 12;
      if (pitchClassDistance === 1 || pitchClassDistance === 11) return true;
    }
  }
  return false;
}

function isRisingAt(timeline: SongTimeline, step: number): boolean {
  const onsetIndex = timeline.onsets.findIndex((onset) => onset.step === step);
  if (onsetIndex < 1) return false;
  const current = timeline.onsets[onsetIndex];
  const previous = timeline.onsets[onsetIndex - 1];
  return (
    current.step - previous.step <= timeline.stepsPerBeat * 2 &&
    current.topNote.midi - previous.topNote.midi >= 2
  );
}

function combinedEventSteps(timeline: SongTimeline): number[] {
  return timeline.steps
    .filter((frame) => frame.startingNotes.length > 0 || frame.hits.length > 0)
    .map((frame) => frame.step);
}

function isRepeatedPulseAt(
  eventSteps: readonly number[],
  step: number,
  stepsPerBeat: number,
): boolean {
  const index = eventSteps.indexOf(step);
  if (index < 2) return false;
  const firstGap = eventSteps[index - 1] - eventSteps[index - 2];
  const secondGap = eventSteps[index] - eventSteps[index - 1];
  return firstGap > 0 && firstGap === secondGap && secondGap <= stepsPerBeat;
}

function featuresAt(
  song: Song,
  timeline: SongTimeline,
  eventSteps: readonly number[],
  step: number,
  pitchMidpoint: number,
): StepFeatures {
  const frame = timeline.steps[step];
  const restThreshold = Math.max(1, Math.ceil(timeline.stepsPerBeat / 2));
  const activeLongNotes = frame.activeNotes.filter(
    (note) => note.durationSteps >= timeline.stepsPerBeat,
  );

  return {
    highShortOnset: frame.startingNotes.some(
      (note) => note.midi > pitchMidpoint && note.durationSteps < timeline.stepsPerBeat,
    ),
    dense:
      frame.activeNotes.length + frame.hits.length >= 2 ||
      frame.startingNotes.length + frame.hits.length >= 2,
    longTone: activeLongNotes.length > 0,
    kick: frame.hits.some((hit) => hit.drumId === 'kick'),
    clearing: silenceThrough(timeline, step) >= restThreshold,
    rising: isRisingAt(timeline, step),
    lowTone: frame.activeNotes.some((note) => note.midi < pitchMidpoint),
    semitoneTension: hasSemitoneTension(frame.activeNotes),
    afterRestEvent:
      (frame.startingNotes.length > 0 || frame.hits.length > 0) &&
      precedingSilence(timeline, step) >= restThreshold,
    repeatedPulse: isRepeatedPulseAt(eventSteps, step, timeline.stepsPerBeat),
    fastTempo: song.bpm >= 120,
    drumHit: frame.hits.length > 0,
  };
}

function techniquesFor(id: ChallengeId, features: StepFeatures): ChallengeTechniqueId[] {
  switch (id) {
    case 'rain':
      return [
        features.highShortOnset && 'rain_droplets',
        features.dense && 'rain_downpour',
        features.longTone && 'rain_ripples',
        features.kick && 'rain_thunder',
        features.clearing && 'rain_clearing',
        features.rising && 'rain_wind',
      ].filter((value): value is ChallengeTechniqueId => Boolean(value));
    case 'ghost':
      return [
        features.lowTone && 'ghost_shadow',
        features.semitoneTension && 'ghost_shiver',
        features.dense && 'ghost_approach',
        features.afterRestEvent && 'ghost_surprise',
      ].filter((value): value is ChallengeTechniqueId => Boolean(value));
    case 'run':
      return [
        features.repeatedPulse && 'run_stride',
        features.fastTempo && 'run_fast',
        features.drumHit && 'run_footsteps',
        features.rising && 'run_uphill',
        features.longTone && 'run_jump',
      ].filter((value): value is ChallengeTechniqueId => Boolean(value));
  }
}

function shouldCreditTechnique(
  technique: ChallengeTechniqueId,
  reactionStep: number,
  eventSteps: readonly number[],
): boolean {
  if (technique !== 'rain_clearing') return true;

  // The live rain scene may clear during any silence, including the unused
  // tail after the final note. In the completion summary, only describe a
  // "quiet space" when the child actually placed sound on both sides of it.
  return (
    eventSteps.some((step) => step < reactionStep) && eventSteps.some((step) => step > reactionStep)
  );
}

export function analyzeChallenge(song: Song, challengeId: ChallengeId): ChallengeAnalysis {
  const timeline = buildSongTimeline(song);
  const eventSteps = combinedEventSteps(timeline);
  const pitchMidpoint = safePitchMidpoint(song);
  const reactions: ChallengeReaction[] = timeline.steps.map((frame) => ({
    step: frame.step,
    techniques: techniquesFor(
      challengeId,
      featuresAt(song, timeline, eventSteps, frame.step, pitchMidpoint),
    ),
  }));

  const used = new Set<ChallengeTechniqueId>();
  for (const reaction of reactions) {
    for (const technique of reaction.techniques) {
      if (shouldCreditTechnique(technique, reaction.step, eventSteps)) {
        used.add(technique);
      }
    }
  }
  const hasMusicalEvents = eventSteps.length > 0;
  const usedTechniques = hasMusicalEvents
    ? challengeCard(challengeId).techniqueIds.filter((technique) => used.has(technique))
    : [];

  return {
    challengeId,
    reactions,
    usedTechniques,
  };
}

export function reactionAt(analysis: ChallengeAnalysis, step: number): ChallengeReaction | null {
  if (!Number.isInteger(step) || step < 0 || analysis.reactions.length === 0) return null;
  return analysis.reactions[step % analysis.reactions.length] ?? null;
}
