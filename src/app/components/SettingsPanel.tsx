"use client";

import type { InstrumentId, Song } from "@/core/types";
import type { Locale, Translations } from "@/lib/i18n";
import { BPM_MIN, BPM_MAX, BPM_STEP, CELLS_MIN, CELLS_MAX } from "@/core/defaults";
import { noteLabel } from "@/ui/noteLabel";

const INSTRUMENTS: { id: InstrumentId; label: string }[] = [
  { id: "piano", label: "Piano" },
  { id: "synth", label: "Synth" },
  { id: "marimba", label: "Marimba" },
  { id: "flute", label: "Flute" },
];

interface Props {
  song: Song;
  t: Translations;
  locale: Locale;
  isPlaying: boolean;
  isNotePanelOpen: boolean;
  isConfirmingReset: boolean;
  onBpmChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPitchBoundChange: (bound: "min" | "max", direction: "up" | "down") => void;
  onCellsChange: (direction: "inc" | "dec") => void;
  onInstrumentChange: (instrument: InstrumentId) => void;
  onToggleAccidentals: () => void;
  onToggleNotePanel: () => void;
  onStartReset: () => void;
  onConfirmReset: () => void;
  onCancelReset: () => void;
}

export function SettingsPanel({
  song,
  t,
  locale,
  isPlaying,
  isNotePanelOpen,
  isConfirmingReset,
  onBpmChange,
  onPitchBoundChange,
  onCellsChange,
  onInstrumentChange,
  onToggleAccidentals,
  onToggleNotePanel,
  onStartReset,
  onConfirmReset,
  onCancelReset,
}: Props) {
  const { constraints } = song;
  const lengthDisabled = isPlaying || constraints.lengthLocked;

  return (
    <div className="settings-panel">
      <div className="header-controls">
        <div className={`control-group ${isPlaying ? "disabled" : ""}`}>
          <span className="control-label">{t.tempo}</span>
          <input
            type="range"
            className="control-slider"
            value={song.bpm}
            onChange={onBpmChange}
            min={BPM_MIN}
            max={BPM_MAX}
            step={BPM_STEP}
            disabled={isPlaying}
          />
          <span className="control-value">{song.bpm}</span>
        </div>
        <div className="control-group">
          <span className="control-label">{t.sound}</span>
          <div className="instrument-selector">
            {INSTRUMENTS.map(({ id, label }) => (
              <button
                key={id}
                className={`instrument-btn ${song.instrument === id ? "active" : ""}`}
                onClick={() => onInstrumentChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group range-control">
          <span className="control-label">{t.range}</span>
          <div className="range-chips">
            <div className="range-chip">
              <button
                className="range-chip-btn"
                onClick={() => onPitchBoundChange("min", "down")}
                aria-label="Lower minimum note"
              >
                ◀
              </button>
              <span className="range-chip-value">{noteLabel(constraints.minNote, locale)}</span>
              <button
                className="range-chip-btn"
                onClick={() => onPitchBoundChange("min", "up")}
                aria-label="Raise minimum note"
              >
                ▶
              </button>
            </div>
            <span className="range-separator">–</span>
            <div className="range-chip">
              <button
                className="range-chip-btn"
                onClick={() => onPitchBoundChange("max", "down")}
                aria-label="Lower maximum note"
              >
                ◀
              </button>
              <span className="range-chip-value">{noteLabel(constraints.maxNote, locale)}</span>
              <button
                className="range-chip-btn"
                onClick={() => onPitchBoundChange("max", "up")}
                aria-label="Raise maximum note"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
        <div className={`control-group ${lengthDisabled ? "disabled" : ""}`}>
          <span className="control-label">{t.cells}</span>
          <div className="range-chip">
            <button
              className="range-chip-btn"
              onClick={() => onCellsChange("dec")}
              disabled={lengthDisabled || song.cells <= CELLS_MIN}
              aria-label="Fewer cells"
            >
              ◀
            </button>
            <span className="range-chip-value">{song.cells}</span>
            <button
              className="range-chip-btn"
              onClick={() => onCellsChange("inc")}
              disabled={lengthDisabled || song.cells >= CELLS_MAX}
              aria-label="More cells"
            >
              ▶
            </button>
          </div>
        </div>
        <div className="control-group">
          <button
            className={`accidentals-btn ${constraints.allowAccidentals ? "active" : ""}`}
            onClick={onToggleAccidentals}
            aria-pressed={constraints.allowAccidentals}
          >
            {t.blackKeys}
          </button>
        </div>
        <div className="control-group">
          <button
            className={`notes-panel-btn ${constraints.allowedNotes !== null ? "active" : ""}`}
            onClick={onToggleNotePanel}
          >
            {constraints.allowedNotes !== null
              ? t.nNotes(constraints.allowedNotes.length)
              : t.allNotes}
            <span className="notes-panel-arrow">{isNotePanelOpen ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>
      <div className="settings-danger">
        {isConfirmingReset ? (
          <div className="reset-confirm">
            <span className="reset-confirm-label">{t.resetConfirm}</span>
            <button className="reset-btn confirm" onClick={onConfirmReset}>
              {t.confirmYes}
            </button>
            <button className="reset-cancel-btn" onClick={onCancelReset}>
              {t.cancel}
            </button>
          </div>
        ) : (
          <button className="reset-btn" onClick={onStartReset}>
            {t.reset}
          </button>
        )}
      </div>
    </div>
  );
}
