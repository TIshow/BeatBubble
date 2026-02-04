import type { NoteName } from "@/core/types";

const NOTE_COLORS: Record<string, string> = {
  C: "hsl(0, 70%, 60%)",
  D: "hsl(30, 70%, 55%)",
  E: "hsl(55, 70%, 50%)",
  F: "hsl(120, 50%, 50%)",
  G: "hsl(200, 70%, 55%)",
  A: "hsl(260, 60%, 60%)",
  B: "hsl(300, 50%, 60%)",
};

const DRUM_COLORS: Record<string, string> = {
  kick: "hsl(0, 0%, 35%)",
  snare: "hsl(40, 60%, 55%)",
  hihat: "hsl(50, 70%, 65%)",
};

export function colorForNote(noteName: NoteName): string {
  const letter = noteName.charAt(0).toUpperCase();
  return NOTE_COLORS[letter] ?? "hsl(0, 0%, 60%)";
}

export function colorForDrum(drumId: string): string {
  return DRUM_COLORS[drumId] ?? "hsl(0, 0%, 50%)";
}

export function isAccidental(noteName: NoteName): boolean {
  return noteName.includes("#") || noteName.includes("b");
}
