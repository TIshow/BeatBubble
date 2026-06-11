import type { Song } from "./types";

export const BPM_MIN = 40;
export const BPM_MAX = 200;
export const BPM_STEP = 5;
export const BARS_MIN = 1;
export const BARS_MAX = 8;
export const HISTORY_LIMIT = 50;

export const DEFAULT_SONG: Song = {
  version: 1,
  bpm: 100,
  stepsPerBeat: 4,
  bars: 4,
  instrument: "piano",
  constraints: {
    minNote: "C4",
    maxNote: "C5",
    allowAccidentals: false,
    allowedNotes: null,
    tempoLocked: false,
    barsLocked: false,
    drumsEnabled: true,
  },
  melody: { notes: [] },
  drums: { hits: [] },
};
