"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { DrumId, InstrumentId, MelodyNote, NoteName, Song } from "@/core/types";
import { DEFAULT_SONG, BPM_MIN, BPM_MAX, BPM_STEP, HISTORY_LIMIT } from "@/core/defaults";
import {
  addMelodyNote,
  adjustPitchBound,
  clearAllowedNotes,
  removeMelodyNote,
  setAllowedNotes,
  setMelodyNoteDuration,
  toggleAllowedNote,
  toggleDrumHit,
} from "@/core/ops";
import { totalSteps } from "@/core/utils";
import { colorForDrum, colorForNote } from "@/ui/color";
import { buildNoteRows, buildRangeNotes, findMelodyNoteAt, getNotePosition } from "@/ui/grid";
import { AudioEngine } from "@/audio/engine";
import { useDragInteraction } from "@/hooks/useDragInteraction";
import { useLocale } from "@/hooks/useLocale";
import { supabase } from "@/lib/supabase";
import { SaveModal } from "./components/SaveModal";
import { NotePanel } from "./components/NotePanel";

const DRUM_ROWS: DrumId[] = ["hihat", "snare", "kick"];

const INSTRUMENTS: { id: InstrumentId; label: string }[] = [
  { id: "piano", label: "Piano" },
  { id: "synth", label: "Synth" },
  { id: "marimba", label: "Marimba" },
  { id: "flute", label: "Flute" },
];

export default function Home() {
  const { locale, t, toggleLocale } = useLocale();
  const [song, setSong] = useState<Song>(DEFAULT_SONG);
  const [history, setHistory] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadStep, setPlayheadStep] = useState<number | null>(null);
  const [isNotePanelOpen, setIsNotePanelOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const songRef = useRef<Song>(song);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  // ?load=<id> で曲を読み込む
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("load");
    if (!loadId) return;
    supabase
      .from("songs")
      .select("song_data")
      .eq("id", loadId)
      .single()
      .then(({ data }) => {
        if (data?.song_data) {
          setSong(data.song_data as Song);
          window.history.replaceState({}, "", "/");
        }
      });
  }, []);

  const pushHistory = useCallback((snapshot: Song) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), snapshot]);
  }, []);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const handleNoteCreate = useCallback(
    (noteName: NoteName, step: number): string | null => {
      const newSong = addMelodyNote(song, {
        startStep: step,
        durationSteps: 1,
        note: noteName,
      });
      const addedNote = newSong.melody.notes.find(
        (n) => n.startStep === step && n.note === noteName
      );
      if (addedNote) {
        pushHistory(song);
        setSong(newSong);
        getEngine().playNotePreview(noteName, song.instrument);
        return addedNote.id;
      }
      return null;
    },
    [song, getEngine, pushHistory]
  );

  const handleNoteRemove = useCallback(
    (noteId: string) => {
      pushHistory(song);
      setSong((prev) => removeMelodyNote(prev, noteId));
    },
    [song, pushHistory]
  );

  const handleNoteDurationChange = useCallback((noteId: string, duration: number) => {
    setSong((prev) => setMelodyNoteDuration(prev, noteId, duration));
  }, []);

  const handleDrumToggle = useCallback(
    (drumId: DrumId, step: number) => {
      const wasHit = song.drums.hits.some((h) => h.drumId === drumId && h.step === step);
      pushHistory(song);
      setSong((prev) => toggleDrumHit(prev, { step, drumId }));
      if (!wasHit) {
        getEngine().playDrumPreview(drumId);
      }
    },
    [song, getEngine, pushHistory]
  );

  const findNoteAt = useCallback(
    (noteName: NoteName, step: number) => findMelodyNoteAt(song, noteName, step),
    [song]
  );

  const handleDragStart = useCallback(() => {
    pushHistory(songRef.current);
  }, [pushHistory]);

  const { isDragging, getMelodyCellHandlers, getDrumCellHandlers, containerHandlers } =
    useDragInteraction({
      gridRef,
      gridContainerRef,
      onNoteCreate: handleNoteCreate,
      onNoteRemove: handleNoteRemove,
      onNoteDurationChange: handleNoteDurationChange,
      onDragStart: handleDragStart,
      onDrumToggle: handleDrumToggle,
      findNoteAt,
    });

  const noteRows = buildNoteRows(song);
  const rangeNotes = buildRangeNotes(song);
  const steps = totalSteps(song);
  const stepsArray = Array.from({ length: steps }, (_, i) => i);
  const { allowedNotes } = song.constraints;

  const handlePlay = async () => {
    if (isPlaying) return;
    try {
      const engine = getEngine();
      await engine.init();
      setIsPlaying(true);
      engine.play(
        () => songRef.current,
        (step) => setPlayheadStep(step)
      );
    } catch (error) {
      console.error("Failed to start audio:", error);
    }
  };

  const handleStop = () => {
    if (engineRef.current) engineRef.current.stop();
    setIsPlaying(false);
    setPlayheadStep(null);
  };

  const handleReset = () => {
    handleStop();
    setSong(DEFAULT_SONG);
    setHistory([]);
  };

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    setSong(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) setSong((prev) => ({ ...prev, bpm: value }));
  };

  const handlePitchBoundChange = (bound: "min" | "max", direction: "up" | "down") => {
    setSong((prev) => adjustPitchBound(prev, bound, direction));
  };

  const handleInstrumentChange = (instrument: InstrumentId) => {
    setSong((prev) => ({ ...prev, instrument }));
  };

  const handleNoteChipClick = useCallback(
    (noteName: NoteName) => {
      const current = song.constraints.allowedNotes;
      if (current === null) {
        const withoutClicked = buildRangeNotes(song).filter((n) => n !== noteName);
        if (withoutClicked.length === 0) return;
        setSong((prev) => setAllowedNotes(prev, withoutClicked));
      } else {
        setSong((prev) => toggleAllowedNote(prev, noteName));
      }
    },
    [song]
  );

  const handleClearAllowedNotes = useCallback(() => {
    setSong((prev) => clearAllowedNotes(prev));
  }, []);

  const renderMelodyCell = (noteName: NoteName, step: number) => {
    const note = findMelodyNoteAt(song, noteName, step);
    const isBeatStart = step % song.stepsPerBeat === 0;
    const isPlayhead = playheadStep === step;
    const handlers = getMelodyCellHandlers(noteName, step);
    return (
      <div
        key={step}
        className={`cell ${isBeatStart ? "beat-start" : ""} ${isPlayhead ? "playhead" : ""}`}
        onMouseDown={handlers.onMouseDown}
        onTouchStart={handlers.onTouchStart}
      >
        {note && renderBubble(note, step)}
      </div>
    );
  };

  const renderBubble = (note: MelodyNote, step: number) => {
    const position = getNotePosition(note, step);
    const isStart = step === note.startStep;
    const color = colorForNote(note.note);
    return (
      <div
        className={`bubble ${position} ${isStart ? "start-highlight" : ""}`}
        style={{ backgroundColor: color }}
      />
    );
  };

  const renderDrumCell = (drumId: DrumId, step: number) => {
    const hasHit = song.drums.hits.some((h) => h.drumId === drumId && h.step === step);
    const isBeatStart = step % song.stepsPerBeat === 0;
    const color = colorForDrum(drumId);
    const isPlayhead = playheadStep === step;
    const handlers = getDrumCellHandlers(drumId, step);
    return (
      <div
        key={step}
        className={`cell ${isBeatStart ? "beat-start" : ""} ${isPlayhead ? "playhead" : ""}`}
        onMouseDown={handlers.onMouseDown}
        onTouchStart={handlers.onTouchStart}
      >
        {hasHit && <div className="drum-bubble" style={{ backgroundColor: color }} />}
      </div>
    );
  };

  return (
    <div
      className={`app ${isDragging ? "dragging" : ""}`}
      onMouseMove={containerHandlers.onMouseMove}
      onMouseUp={containerHandlers.onMouseUp}
      onMouseLeave={containerHandlers.onMouseLeave}
      onTouchMove={containerHandlers.onTouchMove}
      onTouchEnd={containerHandlers.onTouchEnd}
      onTouchCancel={containerHandlers.onTouchCancel}
    >
      <header className="header">
        <h1>BeatBubble</h1>
        <div className="transport">
          <button
            className={`transport-btn play-btn ${isPlaying ? "disabled" : ""}`}
            onClick={handlePlay}
            disabled={isPlaying}
          >
            {t.play}
          </button>
          <button
            className={`transport-btn stop-btn ${!isPlaying ? "disabled" : ""}`}
            onClick={handleStop}
            disabled={!isPlaying}
          >
            {t.stop}
          </button>
        </div>
        <div className="header-controls">
          <div className={`control-group ${isPlaying ? "disabled" : ""}`}>
            <span className="control-label">{t.tempo}</span>
            <input
              type="range"
              className="control-slider"
              value={song.bpm}
              onChange={handleBpmChange}
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
                  onClick={() => handleInstrumentChange(id)}
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
                  onClick={() => handlePitchBoundChange("min", "down")}
                  aria-label="Lower minimum note"
                >
                  ◀
                </button>
                <span className="range-chip-value">{song.constraints.minNote}</span>
                <button
                  className="range-chip-btn"
                  onClick={() => handlePitchBoundChange("min", "up")}
                  aria-label="Raise minimum note"
                >
                  ▶
                </button>
              </div>
              <span className="range-separator">–</span>
              <div className="range-chip">
                <button
                  className="range-chip-btn"
                  onClick={() => handlePitchBoundChange("max", "down")}
                  aria-label="Lower maximum note"
                >
                  ◀
                </button>
                <span className="range-chip-value">{song.constraints.maxNote}</span>
                <button
                  className="range-chip-btn"
                  onClick={() => handlePitchBoundChange("max", "up")}
                  aria-label="Raise maximum note"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
          <div className="control-group">
            <button
              className={`notes-panel-btn ${allowedNotes !== null ? "active" : ""}`}
              onClick={() => setIsNotePanelOpen((prev) => !prev)}
            >
              {allowedNotes !== null ? t.nNotes(allowedNotes.length) : t.allNotes}
              <span className="notes-panel-arrow">{isNotePanelOpen ? "▲" : "▼"}</span>
            </button>
          </div>
        </div>
        <button className="undo-btn" onClick={handleUndo} disabled={history.length === 0}>
          {t.undo}
        </button>
        <button className="reset-btn" onClick={handleReset}>
          {t.reset}
        </button>
        <button className="save-btn" onClick={() => setIsSaveModalOpen(true)}>
          {t.save}
        </button>
        <Link href="/songs" className="songs-nav-link">
          {t.songsLink}
        </Link>
        <button className="locale-toggle" onClick={toggleLocale}>
          {t.switchLocale}
        </button>
      </header>

      {isNotePanelOpen && (
        <NotePanel
          rangeNotes={rangeNotes}
          allowedNotes={allowedNotes}
          locale={locale}
          onNoteClick={handleNoteChipClick}
          onClear={handleClearAllowedNotes}
        />
      )}

      <main className="main">
        <div className="grid-container" ref={gridContainerRef}>
          <div className="labels grid">
            {noteRows.map((noteName) => (
              <div key={noteName} className="label-row">
                <div
                  className="label-cell"
                  style={{ backgroundColor: colorForNote(noteName) }}
                >
                  {noteName}
                </div>
              </div>
            ))}
            {DRUM_ROWS.map((drumId) => (
              <div key={drumId} className="label-row drum-row">
                <div
                  className="label-cell"
                  style={{ backgroundColor: colorForDrum(drumId) }}
                >
                  {drumId}
                </div>
              </div>
            ))}
          </div>
          <div className="grid" ref={gridRef}>
            {noteRows.map((noteName) => (
              <div key={noteName} className="grid-row">
                {stepsArray.map((step) => renderMelodyCell(noteName, step))}
              </div>
            ))}
            {DRUM_ROWS.map((drumId) => (
              <div key={drumId} className="grid-row drum-row">
                {stepsArray.map((step) => renderDrumCell(drumId, step))}
              </div>
            ))}
          </div>
        </div>
      </main>

      {isSaveModalOpen && (
        <SaveModal
          song={song}
          locale={locale}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}
    </div>
  );
}
