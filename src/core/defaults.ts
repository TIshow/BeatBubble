import type { Song } from "./types";

export const BPM_MIN = 40;
export const BPM_MAX = 200;
export const BPM_STEP = 5;
// Grid length as a number of cells (columns). One click of the length
// control adds/removes a single cell.
export const CELLS_MIN = 4;
export const CELLS_MAX = 128;
export const HISTORY_LIMIT = 50;

export const DEFAULT_SONG: Song = {
  version: 3,
  bpm: 100,
  stepsPerBeat: 4,
  cells: 64,
  instrument: "piano",
  constraints: {
    minNote: "C4",
    maxNote: "C5",
    allowAccidentals: false,
    allowedNotes: null,
    tempoLocked: false,
    lengthLocked: false,
    drumsEnabled: true,
  },
  melody: { notes: [] },
  drums: { hits: [] },
};
