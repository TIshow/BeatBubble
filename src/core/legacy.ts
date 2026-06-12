import type { DrumId, InstrumentId, Song } from "./types";
import { newId } from "./id";
import { BLOCKS_MAX, BLOCKS_MIN, DEFAULT_SONG } from "./defaults";
import { clamp } from "./utils";

// Migrate a persisted song to the current model.
// v1 measured length in `bars` (1 bar = 4 beats = 4 blocks); v2 measures
// length directly in `blocks`. Total step count is unchanged, so notes
// stay in range.
export function migrateSong(raw: unknown): Song {
  const data = raw as Record<string, unknown>;

  if (data.version === 2 && typeof data.blocks === "number") {
    return data as unknown as Song;
  }

  const bars = typeof data.bars === "number" ? data.bars : DEFAULT_SONG.blocks / 4;
  const blocks = clamp(Math.round(bars * 4), BLOCKS_MIN, BLOCKS_MAX);

  const { barsLocked, ...restConstraints } =
    (data.constraints as { barsLocked?: boolean }) ?? {};
  const next = { ...data };
  delete next.bars;

  return {
    ...next,
    version: 2,
    blocks,
    constraints: {
      ...DEFAULT_SONG.constraints,
      ...restConstraints,
      blocksLocked: barsLocked ?? false,
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
