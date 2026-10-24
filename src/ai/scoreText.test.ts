import { describe, expect, it } from "vitest";
import { DEFAULT_SONG } from "@/core/defaults";
import type { DrumHit, DrumId, MelodyNote, Song } from "@/core/types";
import { scoreToText } from "./scoreText";

let nextId = 0;

function note(name: string, startStep: number, durationSteps = 1): MelodyNote {
  return { id: `note-${nextId++}`, note: name, startStep, durationSteps };
}

function hit(drumId: DrumId, step: number): DrumHit {
  return { id: `hit-${nextId++}`, drumId, step };
}

function song(notes: MelodyNote[], hits: DrumHit[] = [], overrides: Partial<Song> = {}): Song {
  return {
    ...structuredClone(DEFAULT_SONG),
    ...overrides,
    melody: { notes },
    drums: { hits },
  };
}

const lineFor = (text: string, prefix: string) =>
  text.split("\n").find((line) => line.startsWith(prefix));

describe("scoreToText", () => {
  it("states tempo, instrument and length up front", () => {
    const text = scoreToText(song([note("C4", 0)], [], { bpm: 140, blocks: 4, instrument: "8bit" }));
    expect(text).toContain("テンポ: 140");
    expect(text).toContain("楽器: ピコピコ音（8bit）");
    expect(text).toContain("長さ: 4拍（1拍 = 4マス）");
  });

  it("writes notes in ドレミ, in order with →, with their place in the beat and length in cells", () => {
    const text = scoreToText(song([note("C4", 0), note("E4", 1), note("G4", 2, 2)], [], { blocks: 1 }));
    expect(lineFor(text, "1拍目")).toBe("1拍目: [1]ド4×1 → [2]ミ4×1 → [3]ソ4×2");
  });

  it("joins a chord's notes with +, low to high", () => {
    const text = scoreToText(song([note("G4", 4), note("C4", 4)], [], { blocks: 2 }));
    expect(lineFor(text, "2拍目")).toBe("2拍目: [1]ド4×1+ソ4×1");
  });

  it("keeps a rest apart from a long note still sounding", () => {
    // ド4 from beat 1 lasts 8 cells, so beats 1–2 sound and beats 3–4 are silent.
    const text = scoreToText(song([note("C4", 0, 8)], [], { blocks: 4 }));
    expect(text).toContain("2拍目: （前の音が つづく）");
    expect(text).toContain("3〜4拍目: （休み）");
  });

  it("says when an older note is still sounding under new ones", () => {
    // ド4 from beat 1 lasts 8 cells, so it is still ringing when ミ4 starts in beat 2.
    const text = scoreToText(song([note("C4", 0, 8), note("E4", 4)], [], { blocks: 2 }));
    expect(lineFor(text, "2拍目")).toBe("2拍目: [1]ミ4×1 （ド4 が つづく）");
  });

  it("keeps notes in the same beat apart when they don't start together", () => {
    // ミ5 and ソ5 three cells apart: once read as "sounding together".
    const text = scoreToText(song([note("E5", 0), note("G5", 3)], [], { blocks: 1 }));
    expect(lineFor(text, "1拍目")).toBe("1拍目: [1]ミ5×1 → [4]ソ5×1");
    expect(text).toContain("「+」で つないだ音は いっしょに、「→」で つないだ音は じゅんばんに 鳴る");
  });

  it("folds a run of silent beats into one line", () => {
    const text = scoreToText(song([note("C4", 0), note("D4", 16)], [], { blocks: 5 }));
    expect(text).toContain("2〜4拍目: （休み）");
    expect(lineFor(text, "5拍目")).toBe("5拍目: [1]レ4×1");
  });

  it("puts drums on the beat they fall in", () => {
    const text = scoreToText(song([note("C4", 0)], [hit("kick", 0), hit("snare", 2)], { blocks: 1 }));
    expect(lineFor(text, "1拍目")).toBe("1拍目: [1]ド4×1 ／ ドラム [1]キック [3]スネア");
    expect(text).toContain("ドラム: 2回");
  });

  it("writes a drum-only beat without an empty melody", () => {
    const text = scoreToText(song([], [hit("hihat", 1)], { blocks: 1 }));
    expect(lineFor(text, "1拍目")).toBe("1拍目: ドラム [2]ハイハット");
    expect(text).toContain("メロディ: なし");
  });

  it("summarises range and black keys", () => {
    const text = scoreToText(song([note("G4", 0), note("C#4", 1), note("A5", 2)], [], { blocks: 1 }));
    expect(text).toContain("いちばん低い音: ド♯4");
    expect(text).toContain("いちばん高い音: ラ5");
    expect(text).toContain("黒鍵の音: あり");
  });

  it("names a grounded shape and where it is", () => {
    // Same rhythm and contour twice: call and response across beats 1–2.
    const text = scoreToText(
      song(
        [note("C4", 0), note("E4", 1), note("D4", 2), note("G4", 5), note("B4", 6), note("A4", 7)],
        [],
        { blocks: 2 }
      )
    );
    expect(text).toContain("よびかけと こたえ（1〜2拍目）");
  });

  it("leaves out the harmony shapes, which random note orders produce just as often", () => {
    // ド4 and ソ4 together: a fifth, which the detector does report.
    const text = scoreToText(song([note("C4", 0, 4), note("G4", 0, 4)], [], { blocks: 1 }));
    expect(text).toContain("見つかった形: なし");
  });
});
