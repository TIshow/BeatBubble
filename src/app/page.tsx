"use client";

import { useEffect, useRef, useState } from "react";
import type { DrumId, MelodyNote, NoteName, Song } from "@/core/types";
import { DEFAULT_SONG } from "@/core/defaults";
import {
  addMelodyNote,
  removeMelodyNote,
  setMelodyNoteDuration,
  toggleDrumHit,
} from "@/core/ops";
import { totalSteps } from "@/core/utils";
import { colorForDrum, colorForNote } from "@/ui/color";
import { buildNoteRows, findMelodyNoteAt, getNotePosition } from "@/ui/grid";
import { AudioEngine } from "@/audio/engine";

const DRUM_ROWS: DrumId[] = ["hihat", "snare", "kick"];

export default function Home() {
  const [song, setSong] = useState<Song>(DEFAULT_SONG);
  const [dragState, setDragState] = useState<{
    noteId: string;
    startStep: number;
    initialDuration: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadStep, setPlayheadStep] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const songRef = useRef<Song>(song);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  const noteRows = buildNoteRows(song);
  const steps = totalSteps(song);
  const stepsArray = Array.from({ length: steps }, (_, i) => i);

  const handlePlay = async () => {
    if (isPlaying) return;

    try {
      const engine = getEngine();
      await engine.init();
      setIsPlaying(true);
      engine.play(() => songRef.current, (step) => {
        setPlayheadStep(step);
      });
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

  const getEngine = () => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  };

  const handleMelodyCellClick = (noteName: NoteName, step: number) => {
    if (dragState) return;

    const existingNote = findMelodyNoteAt(song, noteName, step);
    if (existingNote) {
      setSong((prev) => removeMelodyNote(prev, existingNote.id));
    } else {
      setSong((prev) =>
        addMelodyNote(prev, { startStep: step, durationSteps: 1, note: noteName })
      );
      getEngine().playNotePreview(noteName);
    }
  };

  const handleMelodyMouseDown = (
    e: React.MouseEvent,
    noteName: NoteName,
    step: number
  ) => {
    const existingNote = findMelodyNoteAt(song, noteName, step);
    if (existingNote && step === existingNote.startStep) {
      e.preventDefault();
      setDragState({
        noteId: existingNote.id,
        startStep: existingNote.startStep,
        initialDuration: existingNote.durationSteps,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !gridRef.current) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const cellWidth = 32;
    const relativeX = e.clientX - gridRect.left;
    const currentStep = Math.floor(relativeX / cellWidth);
    const newDuration = Math.max(1, currentStep - dragState.startStep + 1);

    setSong((prev) => setMelodyNoteDuration(prev, dragState.noteId, newDuration));
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  const handleDrumCellClick = (drumId: DrumId, step: number) => {
    const wasHit = isDrumHitAt(drumId, step);
    setSong((prev) => toggleDrumHit(prev, { step, drumId }));
    if (!wasHit) {
      getEngine().playDrumPreview(drumId);
    }
  };

  const handleReset = () => {
    handleStop();
    setSong(DEFAULT_SONG);
  };

  const isDrumHitAt = (drumId: DrumId, step: number): boolean => {
    return song.drums.hits.some((h) => h.drumId === drumId && h.step === step);
  };

  const renderMelodyCell = (noteName: NoteName, step: number) => {
    const note = findMelodyNoteAt(song, noteName, step);
    const isBeatStart = step % song.stepsPerBeat === 0;
    const isPlayhead = playheadStep === step;

    return (
      <div
        key={step}
        className={`cell ${isBeatStart ? "beat-start" : ""} ${isPlayhead ? "playhead" : ""}`}
        onClick={() => handleMelodyCellClick(noteName, step)}
        onMouseDown={(e) => handleMelodyMouseDown(e, noteName, step)}
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
    const hasHit = isDrumHitAt(drumId, step);
    const isBeatStart = step % song.stepsPerBeat === 0;
    const color = colorForDrum(drumId);
    const isPlayhead = playheadStep === step;

    return (
      <div
        key={step}
        className={`cell ${isBeatStart ? "beat-start" : ""} ${isPlayhead ? "playhead" : ""}`}
        onClick={() => handleDrumCellClick(drumId, step)}
      >
        {hasHit && <div className="drum-bubble" style={{ backgroundColor: color }} />}
      </div>
    );
  };

  return (
    <div
      className={`app ${dragState ? "dragging" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
        <div className="header-info">
          <span>Tempo: {song.bpm} BPM</span>
          <span>Bars: {song.bars}</span>
        </div>
        <button className="reset-btn" onClick={handleReset}>
          Reset
        </button>
      </header>

      <main className="main">
        <div className="grid-container">
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
