import type { DrumId, InstrumentId, Song } from "./types";
import { newId } from "./id";
import { CELLS_MAX, CELLS_MIN, DEFAULT_SONG } from "./defaults";
import { clamp } from "./utils";

// v1 fixed 4/4 time: each bar spanned 4 beats.
const V1_BEATS_PER_BAR = 4;

// Migrate a persisted song to the current model (length measured in cells).
// Older versions measured length differently:
//   v1: `bars`   -> cells = bars * 4 * stepsPerBeat
//   v2: `blocks` -> cells = blocks * stepsPerBeat
// The total cell count is preserved, so notes stay in range.
export function migrateSong(raw: unknown): Song {
  const data = raw as Record<string, unknown>;

  if (data.version === 3 && typeof data.cells === "number") {
    return data as unknown as Song;
  }

  const stepsPerBeat =
    typeof data.stepsPerBeat === "number" ? data.stepsPerBeat : DEFAULT_SONG.stepsPerBeat;

  let cells: number;
  if (typeof data.cells === "number") {
    cells = data.cells;
  } else if (typeof data.blocks === "number") {
    cells = data.blocks * stepsPerBeat;
  } else if (typeof data.bars === "number") {
    cells = data.bars * V1_BEATS_PER_BAR * stepsPerBeat;
  } else {
    cells = DEFAULT_SONG.cells;
  }
  cells = clamp(Math.round(cells), CELLS_MIN, CELLS_MAX);

  // Length-lock was named barsLocked (v1) then blocksLocked (v2).
  const { barsLocked, blocksLocked, lengthLocked, ...restConstraints } =
    (data.constraints as Record<string, unknown>) ?? {};
  const next = { ...data };
  delete next.bars;
  delete next.blocks;

  return {
    ...next,
    version: 3,
    cells,
    constraints: {
      ...DEFAULT_SONG.constraints,
      ...restConstraints,
      lengthLocked: (lengthLocked ?? blocksLocked ?? barsLocked ?? false) === true,
    },
  } as unknown as Song;
}

type LegacyCell = {
  note: string;
  sustained?: boolean;
  start?: boolean;
  end?: boolean;
  length?: number;
} | null;

type LegacyMusicData = {
  grid: LegacyCell[][];
  bpm?: number;
  instrument?: string;
  volume?: number;
  beats: number;
};

const DRUM_NOTE_MAP: Record<string, DrumId> = {
  KICK: "kick",
  SNARE: "snare",
  HIHAT: "hihat",
};

function mapInstrument(instrument?: string): InstrumentId {
  if (instrument === "synth") return "synth";
  if (instrument === "marimba") return "marimba";
  if (instrument === "flute") return "flute";
  return "piano";
}

export function fromLegacyMusicData(musicData: LegacyMusicData): Song {
  const stepsPerBeat = 4;
  const cells = clamp(Math.round(musicData.beats), CELLS_MIN, CELLS_MAX);
  const bpm = musicData.bpm ?? 100;
  const instrument = mapInstrument(musicData.instrument);

  const song: Song = {
    version: 3,
    bpm,
    stepsPerBeat,
    cells,
    instrument,
    constraints: { ...DEFAULT_SONG.constraints },
    melody: { notes: [] },
    drums: { hits: [] },
  };

  for (const row of musicData.grid) {
    for (let col = 0; col < row.length; col++) {
      const cell = row[col];
      if (!cell) continue;

      const drumId = DRUM_NOTE_MAP[cell.note];
      if (drumId) {
        song.drums.hits.push({
          id: newId(),
          step: col,
          drumId,
        });
      } else if (cell.start === true) {
        song.melody.notes.push({
          id: newId(),
          startStep: col,
          durationSteps: cell.length ?? 1,
          note: cell.note,
        });
      }
    }
  }

  return song;
}
