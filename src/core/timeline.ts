import type { DrumHit, MelodyNote, Song } from './types';
import { noteNameToMidi, totalSteps } from './utils';

export type TimelineNote = Readonly<MelodyNote> & {
  readonly midi: number;
  readonly endStep: number;
};

export type TimelineStep = {
  readonly step: number;
  readonly startingNotes: readonly TimelineNote[];
  readonly activeNotes: readonly TimelineNote[];
  readonly hits: readonly Readonly<DrumHit>[];
};

export type TimelineOnset = {
  readonly step: number;
  readonly notes: readonly TimelineNote[];
  readonly topNote: TimelineNote;
};

export type SongTimeline = {
  readonly totalSteps: number;
  readonly stepsPerBeat: number;
  readonly steps: readonly TimelineStep[];
  readonly onsets: readonly TimelineOnset[];
};

type MutableTimelineStep = {
  step: number;
  startingNotes: TimelineNote[];
  activeNotes: TimelineNote[];
  hits: DrumHit[];
};

/**
 * Builds a step-indexed, read-only view of a song for pure music analysis.
 *
 * Invalid imported notes are ignored here so optional feedback features never
 * take down the editor. Song loading and validation remain the authority for
 * deciding whether persisted data is valid.
 */
export function buildSongTimeline(song: Song): SongTimeline {
  const total = totalSteps(song);
  const steps: MutableTimelineStep[] = Array.from({ length: total }, (_, step) => ({
    step,
    startingNotes: [],
    activeNotes: [],
    hits: [],
  }));

  for (const source of song.melody.notes) {
    if (
      !Number.isInteger(source.startStep) ||
      !Number.isInteger(source.durationSteps) ||
      source.startStep < 0 ||
      source.startStep >= total ||
      source.durationSteps < 1
    ) {
      continue;
    }

    let midi: number;
    try {
      midi = noteNameToMidi(source.note);
    } catch {
      continue;
    }

    const note: TimelineNote = {
      ...source,
      midi,
      endStep: Math.min(total, source.startStep + source.durationSteps),
    };
    steps[note.startStep].startingNotes.push(note);
    for (let step = note.startStep; step < note.endStep; step++) {
      steps[step].activeNotes.push(note);
    }
  }

  for (const hit of song.drums.hits) {
    if (!Number.isInteger(hit.step) || hit.step < 0 || hit.step >= total) continue;
    steps[hit.step].hits.push(hit);
  }

  for (const frame of steps) {
    frame.startingNotes.sort((a, b) => a.midi - b.midi || a.id.localeCompare(b.id));
    frame.activeNotes.sort((a, b) => a.midi - b.midi || a.id.localeCompare(b.id));
  }

  const onsets: TimelineOnset[] = steps
    .filter((frame) => frame.startingNotes.length > 0)
    .map((frame) => ({
      step: frame.step,
      notes: frame.startingNotes,
      topNote: frame.startingNotes[frame.startingNotes.length - 1],
    }));

  return {
    totalSteps: total,
    stepsPerBeat: song.stepsPerBeat,
    steps,
    onsets,
  };
}
