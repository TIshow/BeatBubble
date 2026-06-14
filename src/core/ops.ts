import type { DrumId, MelodyNote, NoteName, Song } from "./types";
import { BLOCKS_MAX, BLOCKS_MIN } from "./defaults";
import { newId } from "./id";
import {
  clamp,
  compareNotes,
  isAccidental,
  normalizeDuration,
  noteNameToMidi,
  PITCH_RANGE_MAX,
  PITCH_RANGE_MIN,
  totalSteps,
  transposeNoteName,
} from "./utils";

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
  const { minNote, maxNote, allowedNotes } = song.constraints;

  const isPlayable =
    allowedNotes !== null
      ? allowedNotes.includes(note)
      : isNoteInRange(note, minNote, maxNote);

  if (!isPlayable) {
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

  // A locked note occupying the same pitch/space wins — can't overwrite it.
  const samePitchOverlap = song.melody.notes.filter(
    (existing) => existing.note === note && notesOverlap(existing, newNote)
  );
  if (samePitchOverlap.some((n) => n.locked)) {
    return song;
  }

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
  const target = song.melody.notes.find((n) => n.id === noteId);
  if (!target || target.locked) return song;
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
  const target = song.melody.notes.find((n) => n.id === noteId);
  if (!target || target.locked) return song;
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

export function toggleMelodyNoteLock(song: Song, noteId: string): Song {
  return {
    ...song,
    melody: {
      ...song.melody,
      notes: song.melody.notes.map((n) =>
        n.id === noteId ? { ...n, locked: !n.locked } : n
      ),
    },
  };
}

export function toggleDrumHitLock(
  song: Song,
  params: { step: number; drumId: DrumId }
): Song {
  const { step, drumId } = params;
  return {
    ...song,
    drums: {
      ...song.drums,
      hits: song.drums.hits.map((h) =>
        h.step === step && h.drumId === drumId ? { ...h, locked: !h.locked } : h
      ),
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
    // Locked hits can't be removed.
    if (song.drums.hits[existingIndex].locked) return song;
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

export function adjustPitchBound(
  song: Song,
  bound: "min" | "max",
  direction: "up" | "down"
): Song {
  const { minNote, maxNote, allowAccidentals } = song.constraints;
  const semitones = direction === "up" ? 1 : -1;

  const minMidi = noteNameToMidi(PITCH_RANGE_MIN);
  const maxMidi = noteNameToMidi(PITCH_RANGE_MAX);

  let newMinNote = minNote;
  let newMaxNote = maxNote;

  if (bound === "min") {
    const transposed = transposeNoteName(minNote, semitones, allowAccidentals);
    const transposedMidi = noteNameToMidi(transposed);

    // Guard: stay within absolute bounds and don't exceed maxNote
    if (transposedMidi < minMidi || transposedMidi > maxMidi) {
      return song;
    }
    if (compareNotes(transposed, maxNote) > 0) {
      return song;
    }
    newMinNote = transposed;
  } else {
    const transposed = transposeNoteName(maxNote, semitones, allowAccidentals);
    const transposedMidi = noteNameToMidi(transposed);

    // Guard: stay within absolute bounds and don't go below minNote
    if (transposedMidi < minMidi || transposedMidi > maxMidi) {
      return song;
    }
    if (compareNotes(transposed, minNote) < 0) {
      return song;
    }
    newMaxNote = transposed;
  }

  // Remove melody notes that are now out of range
  const filteredNotes = song.melody.notes.filter((note) =>
    isNoteInRange(note.note, newMinNote, newMaxNote)
  );

  // Filter allowedNotes to remove notes outside the new range
  let newAllowedNotes = song.constraints.allowedNotes;
  if (newAllowedNotes !== null) {
    const filtered = newAllowedNotes.filter((n) =>
      isNoteInRange(n, newMinNote, newMaxNote)
    );
    // Keep current selection if filtering would leave 0 notes
    newAllowedNotes = filtered.length > 0 ? filtered : newAllowedNotes;
  }

  return {
    ...song,
    constraints: {
      ...song.constraints,
      minNote: newMinNote,
      maxNote: newMaxNote,
      allowedNotes: newAllowedNotes,
    },
    melody: {
      ...song.melody,
      notes: filteredNotes,
    },
  };
}

export function setBlocks(song: Song, blocks: number): Song {
  // Never shrink past a locked element — that would silently delete it.
  const lockedEnd = Math.max(
    0,
    ...song.melody.notes
      .filter((n) => n.locked)
      .map((n) => n.startStep + n.durationSteps),
    ...song.drums.hits.filter((h) => h.locked).map((h) => h.step + 1)
  );
  const minBlocks = Math.max(BLOCKS_MIN, Math.ceil(lockedEnd / song.stepsPerBeat));

  const clamped = clamp(Math.round(blocks), minBlocks, BLOCKS_MAX);
  if (clamped === song.blocks) return song;

  const newTotal = clamped * song.stepsPerBeat;

  // Shrinking: drop notes that start past the new end, and clamp the
  // duration of notes that now overrun it. (No-op when extending.)
  const notes = song.melody.notes
    .filter((n) => n.startStep < newTotal)
    .map((n) => ({
      ...n,
      durationSteps: Math.min(n.durationSteps, newTotal - n.startStep),
    }));

  // Shrinking: drop drum hits past the new end.
  const hits = song.drums.hits.filter((h) => h.step < newTotal);

  return {
    ...song,
    blocks: clamped,
    melody: { ...song.melody, notes },
    drums: { ...song.drums, hits },
  };
}

export function setAllowAccidentals(song: Song, allow: boolean): Song {
  if (song.constraints.allowAccidentals === allow) return song;

  // Turning accidentals on only reveals more rows — nothing to clean up.
  if (allow) {
    return {
      ...song,
      constraints: { ...song.constraints, allowAccidentals: true },
    };
  }

  // Turning off: drop melody notes on black keys and prune allowedNotes.
  const filteredNotes = song.melody.notes.filter((n) => !isAccidental(n.note));

  let newAllowedNotes = song.constraints.allowedNotes;
  if (newAllowedNotes !== null) {
    const filtered = newAllowedNotes.filter((n) => !isAccidental(n));
    // Keep current selection if filtering would leave 0 notes.
    newAllowedNotes = filtered.length > 0 ? filtered : newAllowedNotes;
  }

  return {
    ...song,
    constraints: {
      ...song.constraints,
      allowAccidentals: false,
      allowedNotes: newAllowedNotes,
    },
    melody: { ...song.melody, notes: filteredNotes },
  };
}

export function toggleAllowedNote(song: Song, note: NoteName): Song {
  const current = song.constraints.allowedNotes ?? [];
  const isSelected = current.includes(note);

  // Prevent removing the last note
  if (isSelected && current.length <= 1) return song;

  const newAllowed = isSelected
    ? current.filter((n) => n !== note)
    : [...current, note];

  return {
    ...song,
    constraints: { ...song.constraints, allowedNotes: newAllowed },
  };
}

export function setAllowedNotes(song: Song, notes: NoteName[]): Song {
  if (notes.length === 0) return song;
  return {
    ...song,
    constraints: { ...song.constraints, allowedNotes: notes },
  };
}

export function clearAllowedNotes(song: Song): Song {
  return {
    ...song,
    constraints: { ...song.constraints, allowedNotes: null },
  };
}
