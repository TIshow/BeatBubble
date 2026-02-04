import type { DrumId, InstrumentId, Song } from "./types";
import { newId } from "./id";
import { DEFAULT_SONG } from "./defaults";

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
  if (instrument === "pianica" || instrument === "piano" || instrument === "sine") {
    return instrument;
  }
  return "pianica";
}

export function fromLegacyMusicData(musicData: LegacyMusicData): Song {
  const stepsPerBeat = 4;
  const bars = Math.ceil(musicData.beats / (stepsPerBeat * 4));
  const bpm = musicData.bpm ?? 100;
  const instrument = mapInstrument(musicData.instrument);

  const song: Song = {
    version: 1,
    bpm,
    stepsPerBeat,
    bars,
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
