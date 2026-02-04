import type { DrumId, MelodyNote, NoteName, Song } from "./types";
import { newId } from "./id";
import { clamp, compareNotes, normalizeDuration, totalSteps } from "./utils";

function isNoteInRange(
  note: NoteName,
  minNote: NoteName,
  maxNote: NoteName
): boolean {
  return compareNotes(note, minNote) >= 0 && compareNotes(note, maxNote) <= 0;
}

function notesOverlap(
  a: { startStep: number; durationSteps: number },
  b: { startStep: number; durationSteps: number }
): boolean {
  const aEnd = a.startStep + a.durationSteps;
  const bEnd = b.startStep + b.durationSteps;
  return a.startStep < bEnd && b.startStep < aEnd;
}

export function addMelodyNote(
  song: Song,
  params: { startStep: number; durationSteps: number; note: NoteName }
): Song {
  const { startStep, durationSteps, note } = params;
  const { minNote, maxNote } = song.constraints;

  if (!isNoteInRange(note, minNote, maxNote)) {
    return song;
  }

  const total = totalSteps(song);
  if (startStep < 0 || startStep >= total) {
    return song;
  }

  const normalizedDuration = normalizeDuration(song, startStep, durationSteps);

  const newNote: MelodyNote = {
    id: newId(),
    startStep,
    durationSteps: normalizedDuration,
    note,
  };

  const filteredNotes = song.melody.notes.filter((existing) => {
    if (existing.note !== note) return true;
    return !notesOverlap(existing, newNote);
  });

  return {
    ...song,
    melody: {
      ...song.melody,
      notes: [...filteredNotes, newNote],
    },
  };
}

export function removeMelodyNote(song: Song, noteId: string): Song {
  return {
    ...song,
    melody: {
      ...song.melody,
      notes: song.melody.notes.filter((n) => n.id !== noteId),
    },
  };
}

export function setMelodyNoteDuration(
  song: Song,
  noteId: string,
  durationSteps: number
): Song {
  return {
    ...song,
    melody: {
      ...song.melody,
      notes: song.melody.notes.map((n) => {
        if (n.id !== noteId) return n;
        const normalized = normalizeDuration(song, n.startStep, durationSteps);
        return { ...n, durationSteps: normalized };
      }),
    },
  };
}

export function moveMelodyNote(
  song: Song,
  noteId: string,
  newStartStep: number
): Song {
  const total = totalSteps(song);

  return {
    ...song,
    melody: {
      ...song.melody,
      notes: song.melody.notes.map((n) => {
        if (n.id !== noteId) return n;
        const clampedStart = clamp(newStartStep, 0, total - 1);
        const maxDuration = total - clampedStart;
        const adjustedDuration = Math.min(n.durationSteps, maxDuration);
        return {
          ...n,
          startStep: clampedStart,
          durationSteps: Math.max(1, adjustedDuration),
        };
      }),
    },
  };
}

export function toggleDrumHit(
  song: Song,
  params: { step: number; drumId: DrumId }
): Song {
  const { step, drumId } = params;
  const total = totalSteps(song);

  if (step < 0 || step >= total) {
    return song;
  }

  const existingIndex = song.drums.hits.findIndex(
    (h) => h.step === step && h.drumId === drumId
  );

  if (existingIndex >= 0) {
    return {
      ...song,
      drums: {
        ...song.drums,
        hits: song.drums.hits.filter((_, i) => i !== existingIndex),
      },
    };
  }

  return {
    ...song,
    drums: {
      ...song.drums,
      hits: [...song.drums.hits, { id: newId(), step, drumId }],
    },
  };
}
