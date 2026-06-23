import type { Song } from "@/core/types";
import { noteNameToMidi, totalSteps } from "@/core/utils";

// Research instrument: pure, deterministic features extracted from a Song.
//
// These are *proxies* for musical/learning constructs — a higher value is not
// inherently "better"; the numbers are meant to be aggregated across many songs
// (e.g. by grade) and validated against expert judgement. Everything here is a
// pure function of the Song so results are reproducible and unit-testable, with
// no DOM/audio/time/PII involved (src/core invariants).
//
// Polyphony note: BeatBubble melody can hold several pitches on the same step
// (chords). Pitch-contour metrics (intervals) are defined on the *top line* —
// the highest pitch starting at each onset — a standard, robust simplification.
// Range/density/rhythm metrics use every note.

export type SongMetrics = {
  noteCount: number;
  melodicRange: number;
  distinctPitchClasses: number;
  stepwiseRatio: number;
  rhythmEntropy: number;
  sustainRatio: number;
  noteDensity: number;
  drumDensity: number;
  usesDrums: boolean;
};

// Highest MIDI pitch starting at each onset step, ordered by time.
function onsetTopLine(song: Song): number[] {
  const topByStep = new Map<number, number>();
  for (const n of song.melody.notes) {
    const midi = noteNameToMidi(n.note);
    const cur = topByStep.get(n.startStep);
    if (cur === undefined || midi > cur) topByStep.set(n.startStep, midi);
  }
  return [...topByStep.keys()].sort((a, b) => a - b).map((s) => topByStep.get(s)!);
}

// Shannon entropy (bits) of a list of category counts. 0 for empty / single category.
function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

export function noteCount(song: Song): number {
  return song.melody.notes.length;
}

// Span between the highest and lowest pitch used, in semitones. 0 if no notes.
export function melodicRange(song: Song): number {
  const midis = song.melody.notes.map((n) => noteNameToMidi(n.note));
  if (midis.length === 0) return 0;
  return Math.max(...midis) - Math.min(...midis);
}

// How many distinct pitch classes (C, C#, … B = 0..11) appear, ignoring octave.
export function distinctPitchClasses(song: Song): number {
  const classes = new Set<number>();
  for (const n of song.melody.notes) {
    classes.add(((noteNameToMidi(n.note) % 12) + 12) % 12);
  }
  return classes.size;
}

// Fraction of top-line melodic intervals that are stepwise (≤2 semitones).
// High = mostly conjunct motion; low = more leaps. 0 with fewer than 2 onsets.
export function stepwiseRatio(song: Song): number {
  const line = onsetTopLine(song);
  if (line.length < 2) return 0;
  let stepwise = 0;
  for (let i = 1; i < line.length; i++) {
    if (Math.abs(line[i] - line[i - 1]) <= 2) stepwise++;
  }
  return stepwise / (line.length - 1);
}

// Diversity of note durations (bits). 0 if all notes share one duration.
export function rhythmEntropy(song: Song): number {
  const counts = new Map<number, number>();
  for (const n of song.melody.notes) {
    counts.set(n.durationSteps, (counts.get(n.durationSteps) ?? 0) + 1);
  }
  return shannonEntropy([...counts.values()]);
}

// Fraction of melody notes that are sustained (longer than one cell). 0 if none.
export function sustainRatio(song: Song): number {
  const notes = song.melody.notes;
  if (notes.length === 0) return 0;
  return notes.filter((n) => n.durationSteps > 1).length / notes.length;
}

// Melody notes per grid step — how densely the timeline is filled.
export function noteDensity(song: Song): number {
  const total = totalSteps(song);
  return total === 0 ? 0 : song.melody.notes.length / total;
}

// Drum hits per grid step.
export function drumDensity(song: Song): number {
  const total = totalSteps(song);
  return total === 0 ? 0 : song.drums.hits.length / total;
}

export function usesDrums(song: Song): boolean {
  return song.drums.hits.length > 0;
}

// All metrics for one song, ready to flatten into an analysis row.
export function songMetrics(song: Song): SongMetrics {
  return {
    noteCount: noteCount(song),
    melodicRange: melodicRange(song),
    distinctPitchClasses: distinctPitchClasses(song),
    stepwiseRatio: stepwiseRatio(song),
    rhythmEntropy: rhythmEntropy(song),
    sustainRatio: sustainRatio(song),
    noteDensity: noteDensity(song),
    drumDensity: drumDensity(song),
    usesDrums: usesDrums(song),
  };
}
