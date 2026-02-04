export type NoteName = string;

export type InstrumentId = "pianica" | "piano" | "sine";

export type DrumId = "kick" | "snare" | "hihat";

export type MelodyNote = {
  id: string;
  startStep: number;
  durationSteps: number;
  note: NoteName;
  velocity?: number;
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
  tempoLocked: boolean;
  barsLocked: boolean;
  drumsEnabled: boolean;
};

export type Song = {
  version: 1;
  bpm: number;
  stepsPerBeat: number;
  bars: number;
  instrument: InstrumentId;
  constraints: Constraints;
  melody: { notes: MelodyNote[] };
  drums: { hits: DrumHit[] };
};
