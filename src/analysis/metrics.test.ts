import { describe, it, expect } from "vitest";
import {
  melodicRange,
  distinctPitchClasses,
  stepwiseRatio,
  rhythmEntropy,
  sustainRatio,
  noteDensity,
  drumDensity,
  usesDrums,
  songMetrics,
} from "./metrics";
import { DEFAULT_SONG } from "@/core/defaults";
import type { DrumId, MelodyNote, DrumHit, Song } from "@/core/types";

let counter = 0;
const note = (n: string, startStep: number, durationSteps = 1): MelodyNote => ({
  id: `n${counter++}`,
  note: n,
  startStep,
  durationSteps,
});
const hit = (drumId: DrumId, step: number): DrumHit => ({ id: `h${counter++}`, step, drumId });

// Build a song directly (bypassing range constraints) for metric tests.
// DEFAULT_SONG scaffolding gives stepsPerBeat 4, blocks 16 => totalSteps 64.
const song = (notes: MelodyNote[], hits: DrumHit[] = []): Song => ({
  ...structuredClone(DEFAULT_SONG),
  melody: { notes },
  drums: { hits },
});

describe("empty song", () => {
  it("returns zeros and no drums", () => {
    expect(songMetrics(song([]))).toEqual({
      noteCount: 0,
      melodicRange: 0,
      distinctPitchClasses: 0,
      stepwiseRatio: 0,
      rhythmEntropy: 0,
      sustainRatio: 0,
      noteDensity: 0,
      drumDensity: 0,
      usesDrums: false,
    });
  });
});

describe("melodicRange", () => {
  it("spans highest to lowest in semitones", () => {
    expect(melodicRange(song([note("C4", 0), note("C5", 1)]))).toBe(12);
  });
  it("counts accidentals", () => {
    expect(melodicRange(song([note("C4", 0), note("F#4", 1)]))).toBe(6);
  });
});

describe("distinctPitchClasses", () => {
  it("ignores octave", () => {
    // C4, C5, E4 => pitch classes {0, 0, 4} => 2 distinct
    expect(distinctPitchClasses(song([note("C4", 0), note("C5", 1), note("E4", 2)]))).toBe(2);
  });
});

describe("stepwiseRatio", () => {
  it("uses the top line and measures conjunct motion", () => {
    // onsets: step0 chord C4+E4 -> top E4(64), step1 D4(62), step2 G4(67)
    // intervals: |62-64|=2 (stepwise), |67-62|=5 (leap) => 1/2
    const s = song([note("C4", 0), note("E4", 0), note("D4", 1), note("G4", 2)]);
    expect(stepwiseRatio(s)).toBeCloseTo(0.5, 5);
  });
  it("is 0 with fewer than two onsets", () => {
    expect(stepwiseRatio(song([note("C4", 0), note("E4", 0)]))).toBe(0);
  });
});

describe("rhythmEntropy", () => {
  it("is 0 when all durations match", () => {
    expect(rhythmEntropy(song([note("C4", 0, 2), note("D4", 2, 2)]))).toBe(0);
  });
  it("is 1 bit for two equally frequent durations", () => {
    const s = song([note("C4", 0, 1), note("D4", 1, 1), note("E4", 2, 4), note("F4", 6, 4)]);
    expect(rhythmEntropy(s)).toBeCloseTo(1, 5);
  });
});

describe("sustainRatio", () => {
  it("is the fraction of notes longer than one cell", () => {
    expect(sustainRatio(song([note("C4", 0, 1), note("D4", 1, 4)]))).toBeCloseTo(0.5, 5);
  });
});

describe("density + drums", () => {
  it("divides counts by totalSteps (64)", () => {
    const s = song([note("C4", 0), note("D4", 1), note("E4", 2), note("F4", 3)], [
      hit("kick", 0),
      hit("snare", 4),
    ]);
    expect(noteDensity(s)).toBeCloseTo(4 / 64, 5);
    expect(drumDensity(s)).toBeCloseTo(2 / 64, 5);
    expect(usesDrums(s)).toBe(true);
  });
});
