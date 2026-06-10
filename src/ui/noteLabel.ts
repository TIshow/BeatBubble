import type { NoteName } from "@/core/types";
import type { Locale } from "@/lib/i18n";

const SOLFEGE: Record<string, string> = {
  C: "ド",
  D: "レ",
  E: "ミ",
  F: "ファ",
  G: "ソ",
  A: "ラ",
  B: "シ",
};

// Converts a NoteName ("C4", "F#3") into a display label.
// Japanese locale uses solfège (ドレミ); English keeps scientific pitch notation.
// NoteName remains the storage representation — this only affects display.
export function noteLabel(note: NoteName, locale: Locale): string {
  if (locale !== "ja") return note;
  const match = note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return note;
  const [, letter, accidental, octave] = match;
  const base = SOLFEGE[letter.toUpperCase()];
  if (!base) return note;
  const acc = accidental === "#" ? "♯" : accidental === "b" ? "♭" : "";
  return `${base}${acc}${octave}`;
}
