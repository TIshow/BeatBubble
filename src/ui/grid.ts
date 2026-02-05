import type { MelodyNote, NoteName, Song } from "@/core/types";
import { midiToNoteName, noteNameToMidi } from "@/core/utils";
import { isAccidental } from "./color";

export function buildNoteRows(song: Song): NoteName[] {
  const { minNote, maxNote, allowAccidentals } = song.constraints;
  const minMidi = noteNameToMidi(minNote);
  const maxMidi = noteNameToMidi(maxNote);

  const notes: NoteName[] = [];
  for (let midi = maxMidi; midi >= minMidi; midi--) {
    const noteName = midiToNoteName(midi);
    if (!allowAccidentals && isAccidental(noteName)) {
      continue;
    }
    notes.push(noteName);
  }
  return notes;
}

export function findMelodyNoteAt(
  song: Song,
  noteName: NoteName,
  step: number
): MelodyNote | null {
  for (const note of song.melody.notes) {
    if (note.note !== noteName) continue;
    if (step >= note.startStep && step < note.startStep + note.durationSteps) {
      return note;
    }
  }
  return null;
}

export function isStartCell(note: MelodyNote, step: number): boolean {
  return step === note.startStep;
}

export function isEndCell(note: MelodyNote, step: number): boolean {
  return step === note.startStep + note.durationSteps - 1;
}

export function getNotePosition(
  note: MelodyNote,
  step: number
): "start" | "middle" | "end" | "single" {
  const isStart = step === note.startStep;
  const isEnd = step === note.startStep + note.durationSteps - 1;
  if (isStart && isEnd) return "single";
  if (isStart) return "start";
  if (isEnd) return "end";
  return "middle";
}
