export type NoteName = string;

export type InstrumentId = "piano" | "synth" | "marimba" | "flute";

export type DrumId = "kick" | "snare" | "hihat";

export type MelodyNote = {
  id: string;
  startStep: number;
  durationSteps: number;
  note: NoteName;
};

export type DrumHit = {
  id: string;
  step: number;
  drumId: DrumId;
};

export type Constraints = {
  minNote: NoteName;
  maxNote: NoteName;
  allowAccidentals: boolean;
  allowedNotes: NoteName[] | null;
  tempoLocked: boolean;
  blocksLocked: boolean;
  drumsEnabled: boolean;
};

export type Song = {
  version: 2;
  bpm: number;
  stepsPerBeat: number;
  // Grid length in blocks. One block = one beat = `stepsPerBeat` cells,
  // i.e. one visible group bounded by the beat-start lines.
  blocks: number;
  instrument: InstrumentId;
  constraints: Constraints;
  melody: { notes: MelodyNote[] };
  drums: { hits: DrumHit[] };
};
