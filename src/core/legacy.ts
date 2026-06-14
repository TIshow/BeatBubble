import type { DrumId, InstrumentId, Song } from "./types";
import { newId } from "./id";
import { BLOCKS_MAX, BLOCKS_MIN, DEFAULT_SONG } from "./defaults";
import { clamp } from "./utils";

// v1 fixed 4/4 time, so each bar spanned 4 beats — i.e. 4 blocks.
const V1_BLOCKS_PER_BAR = 4;

// Migrate a persisted song to the current model (length measured in blocks;
// 1 block = 1 beat = stepsPerBeat cells). Older/other shapes:
//   v1: `bars`  -> blocks = bars * 4
//   v3: `cells` -> blocks = round(cells / stepsPerBeat)   (short-lived)
// The cell count is preserved (modulo clamping), so notes stay in range.
export function migrateSong(raw: unknown): Song {
  const data = raw as Record<string, unknown>;

  if (data.version === 2 && typeof data.blocks === "number") {
    return data as unknown as Song;
  }

  const stepsPerBeat =
    typeof data.stepsPerBeat === "number" ? data.stepsPerBeat : DEFAULT_SONG.stepsPerBeat;

  let blocks: number;
  if (typeof data.blocks === "number") {
    blocks = data.blocks;
  } else if (typeof data.cells === "number") {
    blocks = data.cells / stepsPerBeat;
  } else if (typeof data.bars === "number") {
    blocks = data.bars * V1_BLOCKS_PER_BAR;
  } else {
    blocks = DEFAULT_SONG.blocks;
  }
  blocks = clamp(Math.round(blocks), BLOCKS_MIN, BLOCKS_MAX);

  // The length-lock has been named barsLocked / lengthLocked across versions.
  const { barsLocked, lengthLocked, blocksLocked, ...restConstraints } =
    (data.constraints as Record<string, unknown>) ?? {};
  const next = { ...data };
  delete next.bars;
  delete next.cells;

  return {
    ...next,
    version: 2,
    blocks,
    constraints: {
      ...DEFAULT_SONG.constraints,
      ...restConstraints,
      blocksLocked: (blocksLocked ?? lengthLocked ?? barsLocked ?? false) === true,
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
  const blocks = Math.max(1, Math.ceil(musicData.beats / stepsPerBeat));
  const bpm = musicData.bpm ?? 100;
  const instrument = mapInstrument(musicData.instrument);

  const song: Song = {
    version: 2,
    bpm,
    stepsPerBeat,
    blocks,
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
