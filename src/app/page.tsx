"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { DrumId, MelodyNote, NoteName, Song } from "@/core/types";
import { DEFAULT_SONG } from "@/core/defaults";
import {
  addMelodyNote,
  adjustPitchBound,
  removeMelodyNote,
  setMelodyNoteDuration,
  toggleDrumHit,
} from "@/core/ops";
import { totalSteps } from "@/core/utils";
import { colorForDrum, colorForNote } from "@/ui/color";
import { buildNoteRows, findMelodyNoteAt, getNotePosition } from "@/ui/grid";
import { AudioEngine } from "@/audio/engine";
import { useDragInteraction } from "@/hooks/useDragInteraction";

const DRUM_ROWS: DrumId[] = ["hihat", "snare", "kick"];

export default function Home() {
  const [song, setSong] = useState<Song>(DEFAULT_SONG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadStep, setPlayheadStep] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const songRef = useRef<Song>(song);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  // Drag interaction callbacks
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
        setSong(newSong);
        getEngine().playNotePreview(noteName);
        return addedNote.id;
      }
      return null;
    },
    [song, getEngine]
  );

  const handleNoteRemove = useCallback((noteId: string) => {
    setSong((prev) => removeMelodyNote(prev, noteId));
  }, []);

  const handleNoteDurationChange = useCallback(
    (noteId: string, duration: number) => {
      setSong((prev) => setMelodyNoteDuration(prev, noteId, duration));
    },
    []
  );

  const handleDrumToggle = useCallback(
    (drumId: DrumId, step: number) => {
      const wasHit = song.drums.hits.some(
        (h) => h.drumId === drumId && h.step === step
      );
      setSong((prev) => toggleDrumHit(prev, { step, drumId }));
      if (!wasHit) {
        getEngine().playDrumPreview(drumId);
      }
    },
    [song.drums.hits, getEngine]
  );

  const findNoteAt = useCallback(
    (noteName: NoteName, step: number) => findMelodyNoteAt(song, noteName, step),
    [song]
  );

  const {
    isDragging,
    getMelodyCellHandlers,
    getDrumCellHandlers,
    containerHandlers,
  } = useDragInteraction({
    gridRef,
    gridContainerRef,
    onNoteCreate: handleNoteCreate,
    onNoteRemove: handleNoteRemove,
    onNoteDurationChange: handleNoteDurationChange,
    onDrumToggle: handleDrumToggle,
    findNoteAt,
  });

  const noteRows = buildNoteRows(song);
  const steps = totalSteps(song);
  const stepsArray = Array.from({ length: steps }, (_, i) => i);

  const handlePlay = async () => {
    if (isPlaying) return;

    try {
      const engine = getEngine();
      await engine.init();
      setIsPlaying(true);
      engine.play(
        () => songRef.current,
        (step) => {
          setPlayheadStep(step);
        }
      );
    } catch (error) {
      console.error("Failed to start audio:", error);
    }
  };

  const handleStop = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsPlaying(false);
    setPlayheadStep(null);
  };

  const handleReset = () => {
    handleStop();
    setSong(DEFAULT_SONG);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setSong((prev) => ({ ...prev, bpm: value }));
    }
  };

  const handlePitchBoundChange = (
    bound: "min" | "max",
    direction: "up" | "down"
  ) => {
    setSong((prev) => adjustPitchBound(prev, bound, direction));
  };

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
    const hasHit = song.drums.hits.some(
      (h) => h.drumId === drumId && h.step === step
    );
    const isBeatStart = step % song.stepsPerBeat === 0;
    const color = colorForDrum(drumId);
    const isPlayhead = playheadStep === step;
    const handlers = getDrumCellHandlers(drumId, step);

    return (
      <div
        key={step}
        className={`cell ${isBeatStart ? "beat-start" : ""} ${isPlayhead ? "playhead" : ""}`}
        onClick={handlers.onClick}
        onTouchStart={handlers.onTouchStart}
      >
        {hasHit && (
          <div className="drum-bubble" style={{ backgroundColor: color }} />
        )}
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
            Play
          </button>
          <button
            className={`transport-btn stop-btn ${!isPlaying ? "disabled" : ""}`}
            onClick={handleStop}
            disabled={!isPlaying}
          >
            Stop
          </button>
        </div>
        <div className="header-controls">
          <div className={`control-group ${isPlaying ? "disabled" : ""}`}>
            <span className="control-label">Tempo</span>
            <input
              type="range"
              className="control-slider"
              value={song.bpm}
              onChange={handleBpmChange}
              min={40}
              max={200}
              step={5}
              disabled={isPlaying}
            />
            <span className="control-value">{song.bpm}</span>
          </div>
          <div className="control-group">
            <span className="control-label">Low</span>
            <button
              className="pitch-btn"
              onClick={() => handlePitchBoundChange("min", "down")}
            >
              −
            </button>
            <span className="control-value">{song.constraints.minNote}</span>
            <button
              className="pitch-btn"
              onClick={() => handlePitchBoundChange("min", "up")}
            >
              +
            </button>
          </div>
          <div className="control-group">
            <span className="control-label">High</span>
            <button
              className="pitch-btn"
              onClick={() => handlePitchBoundChange("max", "down")}
            >
              −
            </button>
            <span className="control-value">{song.constraints.maxNote}</span>
            <button
              className="pitch-btn"
              onClick={() => handlePitchBoundChange("max", "up")}
            >
              +
            </button>
          </div>
        </div>
        <button className="reset-btn" onClick={handleReset}>
          Reset
        </button>
      </header>

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
    </div>
  );
}
