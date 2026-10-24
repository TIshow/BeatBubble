import { DEFAULT_SONG } from "@/core/defaults";
import type { DrumId, InstrumentId, Song } from "@/core/types";

// Songs written for the listener check (#151), each to a scene decided before
// it was written. The model is never told the scene; a person compares its
// impressions of the song and of a shuffled copy against it.
//
// No children's work is here. Pairs that share tempo and register on purpose
// (あめ / ゆき) make sure tempo and instrument alone can't tell them apart.

export type ValidationSong = { id: string; intent: string; song: Song };

type N = [note: string, startStep: number, durationSteps: number];
type H = [drumId: DrumId, step: number];

function make(
  id: string,
  intent: string,
  bpm: number,
  instrument: InstrumentId,
  notes: N[],
  hits: H[] = []
): ValidationSong {
  return {
    id,
    intent,
    song: {
      ...structuredClone(DEFAULT_SONG),
      bpm,
      instrument,
      blocks: 16,
      melody: {
        notes: notes.map(([note, startStep, durationSteps], i) => ({
          id: `${id}-n${i}`,
          note,
          startStep,
          durationSteps,
        })),
      },
      drums: { hits: hits.map(([drumId, step], i) => ({ id: `${id}-d${i}`, drumId, step })) },
    },
  };
}

const range = (from: number, to: number, by = 1) =>
  Array.from({ length: Math.ceil((to - from) / by) }, (_, i) => from + i * by);

const SCALE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];

export const VALIDATION_SONGS: ValidationSong[] = [
  make("rain", "あめが しとしと ふる", 76, "piano", [
    ["E5", 0, 1], ["C5", 3, 1], ["A4", 6, 1], ["E5", 9, 1], ["G5", 13, 1],
    ["D5", 16, 1], ["B4", 18, 1], ["E5", 22, 1], ["C5", 25, 1], ["A4", 29, 1],
    ["E5", 32, 1], ["G5", 35, 1], ["C5", 38, 1], ["A4", 41, 1], ["E5", 45, 1],
    ["D5", 48, 1], ["B4", 51, 1], ["G4", 54, 1], ["E5", 57, 1], ["C5", 61, 1],
  ]),

  make("snow", "ゆきが しずかに ふる", 64, "piano", [
    ["G5", 0, 4], ["E5", 8, 4], ["C6", 20, 6], ["A5", 32, 4], ["F5", 44, 4], ["D5", 52, 8],
  ]),

  make(
    "ghost",
    "おばけが ちかづいてくる",
    66,
    "synth",
    [
      ["C3", 0, 8], ["C#3", 8, 8], ["D3", 16, 8], ["D#3", 24, 8],
      ["E3", 32, 4], ["F3", 36, 4], ["F#3", 40, 4], ["G3", 44, 4],
      ["G#3", 48, 2], ["A3", 50, 2], ["A#3", 52, 2], ["B3", 54, 2],
      ["C3", 60, 4], ["C#3", 60, 4], ["C6", 60, 1], ["C#6", 61, 1],
    ],
    [0, 8, 16, 24, 32, 36, 40, 44, 48, 50, 52, 54, 56, 58].map((s): H => ["kick", s])
  ),

  make(
    "run",
    "かけっこで いっしょうけんめい はしる",
    168,
    "8bit",
    // Up and down the scale, one cell each, the whole way through.
    range(0, 64).map((s): N => {
      const i = s % 16;
      return [SCALE[i < 8 ? i : 15 - i], s, 1];
    }),
    [
      ...range(0, 64, 4).map((s): H => ["kick", s]),
      ...range(4, 64, 8).map((s): H => ["snare", s]),
      ...range(2, 64, 4).map((s): H => ["hihat", s]),
    ]
  ),

  make("lullaby", "あかちゃんを ねかせる こもりうた", 60, "flute", [
    ["E4", 0, 4], ["D4", 4, 2], ["C4", 6, 2], ["D4", 8, 4], ["E4", 12, 4],
    ["E4", 16, 4], ["D4", 20, 2], ["C4", 22, 2], ["D4", 24, 8],
    ["G4", 32, 4], ["F4", 36, 2], ["E4", 38, 2], ["F4", 40, 4], ["G4", 44, 4],
    ["E4", 48, 4], ["D4", 52, 4], ["C4", 56, 8],
  ]),

  make(
    "festival",
    "にぎやかな おまつり",
    126,
    "marimba",
    // A two-beat pentatonic figure, eight times over.
    range(0, 64, 8).flatMap((b): N[] => [
      ["G4", b, 1], ["A4", b + 2, 1], ["G4", b + 3, 1], ["E4", b + 4, 2], ["D4", b + 6, 1], ["E4", b + 7, 1],
    ]),
    range(0, 16).flatMap((beat): H[] => [
      [beat % 2 === 0 ? "kick" : "snare", beat * 4],
      ["hihat", beat * 4 + 2],
    ])
  ),

  make("sunrise", "あさひが ゆっくり のぼる", 84, "piano", [
    ["C3", 0, 8], ["G3", 8, 8], ["C4", 16, 4], ["E4", 20, 4], ["G4", 24, 4], ["C5", 28, 4],
    ["E5", 32, 2], ["G5", 34, 2], ["E5", 36, 2], ["G5", 38, 2],
    ["C6", 40, 8], ["E5", 40, 8], ["G5", 48, 4],
    ["G5", 52, 12], ["C6", 52, 12], ["E6", 52, 12],
  ]),

  make(
    "storm",
    "かみなりが なる あらし",
    144,
    "synth",
    [
      // A low semitone tremolo the whole way, with clusters and flashes.
      ...range(0, 64).map((s): N => [s % 2 === 0 ? "C2" : "C#2", s, 1]),
      ["C3", 16, 4], ["C#3", 16, 4], ["D3", 16, 4],
      ["C3", 32, 4], ["C#3", 32, 4], ["D3", 32, 4],
      ["C3", 48, 4], ["C#3", 48, 4], ["D3", 48, 4],
      ["B5", 14, 1], ["C6", 30, 1], ["A#5", 46, 1],
    ],
    [
      ...[0, 16, 32, 48].map((s): H => ["kick", s]),
      // Snare rolls through every fourth beat.
      ...[12, 28, 44, 60].flatMap((b) => range(b, b + 4).map((s): H => ["snare", s])),
    ]
  ),
];
