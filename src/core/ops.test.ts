import { describe, it, expect } from "vitest";
import {
  addMelodyNote,
  removeMelodyNote,
  setMelodyNoteDuration,
  toggleDrumHit,
  toggleMelodyNoteLock,
  toggleDrumHitLock,
  adjustPitchBound,
  setBlocks,
  setAllowAccidentals,
  toggleAllowedNote,
  setAllowedNotes,
  clearAllowedNotes,
} from "./ops";
import { DEFAULT_SONG } from "./defaults";
import type { Song } from "./types";

const base = (): Song => structuredClone(DEFAULT_SONG); // C4..C5, blocks 16 (total 64)

const add = (song: Song, note: string, startStep = 0, durationSteps = 1) =>
  addMelodyNote(song, { startStep, durationSteps, note });

describe("addMelodyNote", () => {
  it("adds an in-range note", () => {
    const s = add(base(), "C4");
    expect(s.melody.notes).toHaveLength(1);
    expect(s.melody.notes[0]).toMatchObject({ note: "C4", startStep: 0, durationSteps: 1 });
  });

  it("rejects out-of-range notes", () => {
    expect(add(base(), "C6").melody.notes).toHaveLength(0); // above maxNote C5
    expect(add(base(), "B3").melody.notes).toHaveLength(0); // below minNote C4
  });

  it("respects allowedNotes filter", () => {
    const s = setAllowedNotes(base(), ["C4"]);
    expect(add(s, "D4").melody.notes).toHaveLength(0);
    expect(add(s, "C4").melody.notes).toHaveLength(1);
  });

  it("last write wins for overlapping same-pitch notes", () => {
    let s = add(base(), "C4", 0, 4); // C4 [0,4)
    s = add(s, "C4", 2, 1); // overlaps -> replaces
    expect(s.melody.notes).toHaveLength(1);
    expect(s.melody.notes[0].startStep).toBe(2);
  });

  it("keeps overlapping notes of a different pitch", () => {
    let s = add(base(), "C4", 0, 4);
    s = add(s, "D4", 0, 1);
    expect(s.melody.notes).toHaveLength(2);
  });

  it("cannot overwrite a locked note", () => {
    let s = add(base(), "C4", 0, 4);
    s = toggleMelodyNoteLock(s, s.melody.notes[0].id);
    const after = add(s, "C4", 2, 1);
    expect(after).toBe(s); // unchanged
    expect(after.melody.notes).toHaveLength(1);
  });
});

describe("removeMelodyNote", () => {
  it("removes an unlocked note", () => {
    const s = add(base(), "C4");
    const after = removeMelodyNote(s, s.melody.notes[0].id);
    expect(after.melody.notes).toHaveLength(0);
  });

  it("is a no-op on a locked note", () => {
    let s = add(base(), "C4");
    s = toggleMelodyNoteLock(s, s.melody.notes[0].id);
    expect(removeMelodyNote(s, s.melody.notes[0].id)).toBe(s);
  });
});

describe("setMelodyNoteDuration", () => {
  it("changes and normalizes duration", () => {
    const s = add(base(), "C4", 0, 1);
    const after = setMelodyNoteDuration(s, s.melody.notes[0].id, 8);
    expect(after.melody.notes[0].durationSteps).toBe(8);
  });

  it("is a no-op on a locked note", () => {
    let s = add(base(), "C4", 0, 1);
    s = toggleMelodyNoteLock(s, s.melody.notes[0].id);
    expect(setMelodyNoteDuration(s, s.melody.notes[0].id, 8)).toBe(s);
  });
});

describe("toggleDrumHit", () => {
  it("adds then removes a hit", () => {
    const on = toggleDrumHit(base(), { step: 0, drumId: "kick" });
    expect(on.drums.hits).toHaveLength(1);
    const off = toggleDrumHit(on, { step: 0, drumId: "kick" });
    expect(off.drums.hits).toHaveLength(0);
  });

  it("cannot remove a locked hit", () => {
    let s = toggleDrumHit(base(), { step: 0, drumId: "kick" });
    s = toggleDrumHitLock(s, { step: 0, drumId: "kick" });
    expect(toggleDrumHit(s, { step: 0, drumId: "kick" })).toBe(s);
  });

  it("ignores out-of-range steps", () => {
    expect(toggleDrumHit(base(), { step: 9999, drumId: "kick" }).drums.hits).toHaveLength(0);
  });
});

describe("lock toggles", () => {
  it("flips melody and drum lock flags", () => {
    let s = add(base(), "C4");
    s = toggleMelodyNoteLock(s, s.melody.notes[0].id);
    expect(s.melody.notes[0].locked).toBe(true);
    s = toggleMelodyNoteLock(s, s.melody.notes[0].id);
    expect(s.melody.notes[0].locked).toBe(false);

    let d = toggleDrumHit(base(), { step: 0, drumId: "snare" });
    d = toggleDrumHitLock(d, { step: 0, drumId: "snare" });
    expect(d.drums.hits[0].locked).toBe(true);
  });
});

describe("adjustPitchBound", () => {
  it("raises the min bound and drops now-out-of-range notes", () => {
    const s = add(base(), "C4"); // exactly at min
    const after = adjustPitchBound(s, "min", "up"); // C4 -> D4
    expect(after.constraints.minNote).toBe("D4");
    expect(after.melody.notes).toHaveLength(0); // C4 now out of range
  });

  it("does not exceed the absolute range / cross the other bound", () => {
    // push min up to maxNote, then one more must be a no-op
    const s: Song = { ...base(), constraints: { ...base().constraints, minNote: "C5" } };
    const after = adjustPitchBound(s, "min", "up"); // would exceed maxNote C5
    expect(after).toBe(s);
  });
});

describe("setBlocks", () => {
  it("clamps to the allowed range", () => {
    expect(setBlocks(base(), 999).blocks).toBe(32);
    expect(setBlocks(base(), 0).blocks).toBe(1);
  });

  it("shrinking drops out-of-range notes/drums and clamps durations", () => {
    let s = add(base(), "C4", 50, 1); // step 50 (total 64)
    s = add(s, "D4", 10, 20); // [10,30)
    s = toggleDrumHit(s, { step: 60, drumId: "kick" });
    const after = setBlocks(s, 4); // total -> 16
    expect(after.blocks).toBe(4);
    expect(after.melody.notes.find((n) => n.note === "C4")).toBeUndefined(); // step 50 dropped
    const d4 = after.melody.notes.find((n) => n.note === "D4");
    expect(d4?.durationSteps).toBe(6); // clamped 16-10
    expect(after.drums.hits).toHaveLength(0); // step 60 dropped
  });

  it("won't shrink past a locked element", () => {
    let s = add(base(), "C4", 40, 1); // ends at 41
    s = toggleMelodyNoteLock(s, s.melody.notes[0].id);
    const after = setBlocks(s, 4); // requested 4 -> total 16, but locked needs cell 40
    expect(after.blocks).toBe(Math.ceil(41 / s.stepsPerBeat)); // 11
    expect(after.melody.notes).toHaveLength(1); // locked note preserved
  });
});

describe("setAllowAccidentals", () => {
  it("turning off removes accidental notes and prunes allowedNotes", () => {
    let s: Song = { ...base(), constraints: { ...base().constraints, allowAccidentals: true } };
    s = add(s, "C#4");
    s = add(s, "D4");
    s = setAllowedNotes(s, ["C4", "C#4"]);
    const after = setAllowAccidentals(s, false);
    expect(after.constraints.allowAccidentals).toBe(false);
    expect(after.melody.notes.some((n) => n.note === "C#4")).toBe(false);
    expect(after.melody.notes.some((n) => n.note === "D4")).toBe(true);
    expect(after.constraints.allowedNotes).toEqual(["C4"]);
  });
});

describe("allowedNotes ops", () => {
  it("toggle / set / clear", () => {
    let s = toggleAllowedNote(base(), "C4");
    expect(s.constraints.allowedNotes).toEqual(["C4"]);
    s = setAllowedNotes(s, ["C4", "E4"]);
    expect(s.constraints.allowedNotes).toEqual(["C4", "E4"]);
    s = clearAllowedNotes(s);
    expect(s.constraints.allowedNotes).toBeNull();
  });

  it("setAllowedNotes ignores an empty list", () => {
    const s = setAllowedNotes(base(), []);
    expect(s.constraints.allowedNotes).toBeNull();
  });
});
