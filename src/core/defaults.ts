import type { Song } from "./types";

export const DEFAULT_SONG: Song = {
  version: 1,
  bpm: 100,
  stepsPerBeat: 4,
  bars: 4,
  instrument: "pianica",
  constraints: {
    minNote: "C4",
    maxNote: "C5",
    allowAccidentals: false,
    tempoLocked: false,
    barsLocked: false,
    drumsEnabled: true,
  },
  melody: { notes: [] },
  drums: { hits: [] },
};
