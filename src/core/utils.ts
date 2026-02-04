import type { NoteName, Song } from "./types";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function totalSteps(song: Song): number {
  return song.bars * 4 * song.stepsPerBeat;
}

export function normalizeDuration(
  song: Song,
  startStep: number,
  durationSteps: number
): number {
  const total = totalSteps(song);
  const maxDuration = total - startStep;
  return clamp(durationSteps, 1, maxDuration);
}

const NOTE_BASE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function noteNameToMidi(note: NoteName): number {
  const match = note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid note name: ${note}`);
  }
  const [, letter, accidental, octaveStr] = match;
  const base = NOTE_BASE[letter.toUpperCase()];
  if (base === undefined) {
    throw new Error(`Invalid note name: ${note}`);
  }
  const octave = parseInt(octaveStr, 10);
  let midi = (octave + 1) * 12 + base;
  if (accidental === "#") {
    midi += 1;
  } else if (accidental === "b") {
    midi -= 1;
  }
  return midi;
}

export function compareNotes(a: NoteName, b: NoteName): number {
  return noteNameToMidi(a) - noteNameToMidi(b);
}
