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

const MIDI_TO_NOTE: string[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

const WHITE_KEYS: number[] = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B

export function midiToNoteName(midi: number): NoteName {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return `${MIDI_TO_NOTE[semitone]}${octave}`;
}

export function isWhiteKey(midi: number): boolean {
  return WHITE_KEYS.includes(midi % 12);
}

export function transposeNoteName(
  note: NoteName,
  semitones: number,
  allowAccidentals: boolean = true
): NoteName {
  let midi = noteNameToMidi(note) + semitones;

  if (!allowAccidentals) {
    // Move to nearest white key in the direction of transposition
    while (!isWhiteKey(midi)) {
      midi += semitones > 0 ? 1 : -1;
    }
  }

  return midiToNoteName(midi);
}

export function clampNoteName(
  note: NoteName,
  min: NoteName,
  max: NoteName
): NoteName {
  const midi = noteNameToMidi(note);
  const minMidi = noteNameToMidi(min);
  const maxMidi = noteNameToMidi(max);
  const clampedMidi = clamp(midi, minMidi, maxMidi);
  return midiToNoteName(clampedMidi);
}

// Absolute bounds for pitch range
export const PITCH_RANGE_MIN = "C2";
export const PITCH_RANGE_MAX = "C7";
