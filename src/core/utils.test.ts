import { describe, it, expect } from "vitest";
import {
  clamp,
  totalSteps,
  normalizeDuration,
  noteNameToMidi,
  midiToNoteName,
  compareNotes,
  isWhiteKey,
  isAccidental,
  transposeNoteName,
  PITCH_RANGE_MIN,
  PITCH_RANGE_MAX,
} from "./utils";
import { DEFAULT_SONG } from "./defaults";

describe("clamp", () => {
  it("clamps within bounds", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe("noteNameToMidi / midiToNoteName", () => {
  it("maps scientific pitch to MIDI", () => {
    expect(noteNameToMidi("C4")).toBe(60);
    expect(noteNameToMidi("A4")).toBe(69);
    expect(noteNameToMidi("C-1")).toBe(0);
    expect(noteNameToMidi("F#3")).toBe(54);
    expect(noteNameToMidi("Db4")).toBe(61);
  });

  it("round-trips through midiToNoteName (sharps)", () => {
    for (let midi = 24; midi <= 96; midi++) {
      expect(noteNameToMidi(midiToNoteName(midi))).toBe(midi);
    }
  });

  it("throws on invalid note names", () => {
    expect(() => noteNameToMidi("H4")).toThrow();
    expect(() => noteNameToMidi("C")).toThrow();
  });
});

describe("compareNotes", () => {
  it("orders by pitch", () => {
    expect(compareNotes("C4", "D4")).toBeLessThan(0);
    expect(compareNotes("D4", "C4")).toBeGreaterThan(0);
    expect(compareNotes("C4", "C4")).toBe(0);
  });
});

describe("isWhiteKey / isAccidental", () => {
  it("identifies white keys by midi", () => {
    expect(isWhiteKey(noteNameToMidi("C4"))).toBe(true);
    expect(isWhiteKey(noteNameToMidi("C#4"))).toBe(false);
  });

  it("identifies accidentals by name", () => {
    expect(isAccidental("C#4")).toBe(true);
    expect(isAccidental("Bb3")).toBe(true);
    expect(isAccidental("C4")).toBe(false);
  });
});

describe("transposeNoteName", () => {
  it("transposes by semitones", () => {
    expect(transposeNoteName("C4", 2)).toBe("D4");
    expect(transposeNoteName("C4", -1)).toBe("B3");
  });

  it("skips to white keys when accidentals are disallowed", () => {
    // +1 from C4 lands on C#4 (black); should advance to D4
    expect(transposeNoteName("C4", 1, false)).toBe("D4");
    // E4 +1 is F4 (already white)
    expect(transposeNoteName("E4", 1, false)).toBe("F4");
  });
});

describe("totalSteps / normalizeDuration", () => {
  it("derives length from blocks * stepsPerBeat", () => {
    expect(totalSteps(DEFAULT_SONG)).toBe(DEFAULT_SONG.blocks * DEFAULT_SONG.stepsPerBeat);
    expect(totalSteps({ ...DEFAULT_SONG, blocks: 4, stepsPerBeat: 4 })).toBe(16);
  });

  it("clamps duration to >=1 and to the remaining length", () => {
    const song = { ...DEFAULT_SONG, blocks: 4, stepsPerBeat: 4 }; // total = 16
    expect(normalizeDuration(song, 0, 5)).toBe(5);
    expect(normalizeDuration(song, 0, 0)).toBe(1);
    expect(normalizeDuration(song, 14, 10)).toBe(2); // only 2 cells left
  });
});

describe("pitch range bounds", () => {
  it("are valid note names", () => {
    expect(() => noteNameToMidi(PITCH_RANGE_MIN)).not.toThrow();
    expect(() => noteNameToMidi(PITCH_RANGE_MAX)).not.toThrow();
    expect(compareNotes(PITCH_RANGE_MIN, PITCH_RANGE_MAX)).toBeLessThan(0);
  });
});
