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
  lengthLocked: boolean;
  drumsEnabled: boolean;
};

export type Song = {
  version: 3;
  bpm: number;
  stepsPerBeat: number;
  // Grid length as the number of cells (columns) per row, i.e. totalSteps.
  // stepsPerBeat still groups cells into beats for the rhythm lines/timing.
  cells: number;
  instrument: InstrumentId;
  constraints: Constraints;
  melody: { notes: MelodyNote[] };
  drums: { hits: DrumHit[] };
};
