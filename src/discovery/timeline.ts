import type { DrumHit, MelodyNote, Song } from '@/core/types';
import { noteNameToMidi, totalSteps } from '@/core/utils';

export type TimelineNote = MelodyNote & {
  midi: number;
  endStep: number;
};

export type TimelineStep = {
  step: number;
  startingNotes: TimelineNote[];
  activeNotes: TimelineNote[];
  hits: DrumHit[];
};

export type TimelineOnset = {
  step: number;
  notes: TimelineNote[];
  topNote: TimelineNote;
};

export type DiscoveryTimeline = {
  totalSteps: number;
  stepsPerBeat: number;
  steps: TimelineStep[];
  onsets: TimelineOnset[];
};

export function buildDiscoveryTimeline(song: Song): DiscoveryTimeline {
  const total = totalSteps(song);
  const steps: TimelineStep[] = Array.from({ length: total }, (_, step) => ({
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
      // Discovery feedback should never take down the editor if an imported
      // song contains an invalid note name. Audio/load validation remains the
      // authority for deciding whether the Song itself is valid.
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
