import type { Song } from "./types";

export const BPM_MIN = 40;
export const BPM_MAX = 200;
export const BPM_STEP = 5;
// Grid length in blocks (1 block = 1 beat = stepsPerBeat cells).
export const BLOCKS_MIN = 1;
export const BLOCKS_MAX = 32;
export const HISTORY_LIMIT = 50;

export const DEFAULT_SONG: Song = {
  version: 2,
  bpm: 100,
  stepsPerBeat: 4,
  blocks: 16,
  instrument: "piano",
  constraints: {
    minNote: "C4",
    maxNote: "C5",
    allowAccidentals: false,
    allowedNotes: null,
    tempoLocked: false,
    blocksLocked: false,
    drumsEnabled: true,
  },
  melody: { notes: [] },
  drums: { hits: [] },
};
