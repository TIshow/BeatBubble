import type { MelodyNote, NoteName, Song } from "@/core/types";
import { isAccidental, midiToNoteName, noteNameToMidi } from "@/core/utils";

function notesInMidiRange(
  minMidi: number,
  maxMidi: number,
  allowAccidentals: boolean
): NoteName[] {
  const notes: NoteName[] = [];
  for (let midi = maxMidi; midi >= minMidi; midi--) {
    const noteName = midiToNoteName(midi);
    if (!allowAccidentals && isAccidental(noteName)) continue;
    notes.push(noteName);
  }
  return notes;
}

// Always returns notes from the min–max range, ignoring allowedNotes.
// Used to populate the note picker panel regardless of selection mode.
export function buildRangeNotes(song: Song): NoteName[] {
  const { minNote, maxNote, allowAccidentals } = song.constraints;
  return notesInMidiRange(
    noteNameToMidi(minNote),
    noteNameToMidi(maxNote),
    allowAccidentals
  );
}

export function buildNoteRows(song: Song): NoteName[] {
  const { minNote, maxNote, allowAccidentals, allowedNotes } = song.constraints;

  if (allowedNotes !== null) {
    return [...allowedNotes].sort((a, b) => noteNameToMidi(b) - noteNameToMidi(a));
  }

  return notesInMidiRange(
    noteNameToMidi(minNote),
    noteNameToMidi(maxNote),
    allowAccidentals
  );
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
