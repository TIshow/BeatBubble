import { describe, it, expect } from "vitest";
import { migrateSong } from "./legacy";
import { BLOCKS_MAX, DEFAULT_SONG } from "./defaults";

describe("migrateSong", () => {
  it("passes a current (v2/blocks) song through unchanged", () => {
    const song = structuredClone(DEFAULT_SONG);
    expect(migrateSong(song)).toBe(song);
  });

  it("upgrades v1 (bars) to blocks (1 bar = 4 blocks)", () => {
    const v1 = {
      version: 1,
      bpm: 120,
      stepsPerBeat: 4,
      bars: 4,
      instrument: "piano",
      // realistic v1 constraints: barsLocked only, no newer lock keys
      constraints: {
        minNote: "C4",
        maxNote: "C5",
        allowAccidentals: false,
        allowedNotes: null,
        tempoLocked: false,
        barsLocked: true,
        drumsEnabled: true,
      },
      melody: { notes: [{ id: "a", startStep: 0, durationSteps: 2, note: "C4" }] },
      drums: { hits: [] },
    };
    const out = migrateSong(v1);
    expect(out.version).toBe(2);
    expect(out.blocks).toBe(16); // 4 bars * 4
    expect((out as Record<string, unknown>).bars).toBeUndefined();
    expect(out.constraints.blocksLocked).toBe(true); // barsLocked -> blocksLocked
    expect(out.bpm).toBe(120);
    expect(out.melody.notes).toHaveLength(1); // notes preserved
  });

  it("upgrades the short-lived v3 (cells) to blocks", () => {
    const v3 = {
      version: 3,
      bpm: 100,
      stepsPerBeat: 4,
      cells: 64,
      instrument: "piano",
      // realistic short-lived v3 constraints: lengthLocked only
      constraints: {
        minNote: "C4",
        maxNote: "C5",
        allowAccidentals: false,
        allowedNotes: null,
        tempoLocked: false,
        lengthLocked: true,
        drumsEnabled: true,
      },
      melody: { notes: [] },
      drums: { hits: [] },
    };
    const out = migrateSong(v3);
    expect(out.version).toBe(2);
    expect(out.blocks).toBe(16); // 64 cells / 4 stepsPerBeat
    expect((out as Record<string, unknown>).cells).toBeUndefined();
    expect(out.constraints.blocksLocked).toBe(true); // lengthLocked -> blocksLocked
  });

  it("clamps an over-long migrated length to the max", () => {
    const out = migrateSong({ version: 1, bars: 100, stepsPerBeat: 4 });
    expect(out.blocks).toBe(BLOCKS_MAX);
  });

  it("falls back to the default length when none is present", () => {
    const out = migrateSong({ version: 1, stepsPerBeat: 4 });
    expect(out.blocks).toBe(DEFAULT_SONG.blocks);
  });

  it("backfills missing constraint fields from defaults", () => {
    const out = migrateSong({ version: 1, bars: 2, constraints: {} });
    expect(out.constraints.minNote).toBe(DEFAULT_SONG.constraints.minNote);
    expect(out.constraints.drumsEnabled).toBe(DEFAULT_SONG.constraints.drumsEnabled);
    expect(out.constraints.blocksLocked).toBe(false);
  });

  it("preserves locked flags on notes during migration", () => {
    const out = migrateSong({
      version: 1,
      bars: 1,
      stepsPerBeat: 4,
      melody: { notes: [{ id: "x", startStep: 0, durationSteps: 1, note: "C4", locked: true }] },
      drums: { hits: [] },
    });
    expect(out.melody.notes[0].locked).toBe(true);
  });
});
