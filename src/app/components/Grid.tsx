"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type { DrumId, MelodyNote, NoteName, Song } from "@/core/types";
import type { Locale } from "@/lib/i18n";
import { totalSteps } from "@/core/utils";
import { colorForDrum, colorForNote } from "@/ui/color";
import { noteLabel } from "@/ui/noteLabel";
import { buildNoteRows, findMelodyNoteAt, getNotePosition } from "@/ui/grid";

const DRUM_ROWS: DrumId[] = ["hihat", "snare", "kick"];

interface CellHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

interface Props {
  song: Song;
  playheadStep: number | null;
  locale: Locale;
  gridRef: RefObject<HTMLDivElement | null>;
  gridContainerRef: RefObject<HTMLDivElement | null>;
  getMelodyCellHandlers: (noteName: NoteName, step: number) => CellHandlers;
  getDrumCellHandlers: (drumId: DrumId, step: number) => CellHandlers;
}

export function Grid({
  song,
  playheadStep,
  locale,
  gridRef,
  gridContainerRef,
  getMelodyCellHandlers,
  getDrumCellHandlers,
}: Props) {
  const noteRows = buildNoteRows(song);
  const stepsArray = Array.from({ length: totalSteps(song) }, (_, i) => i);

  // Follow the playhead during playback: once it advances past an anchor
  // (~40% across the usable width), scroll the grid so the highlighted column
  // stays put and the sheet flows underneath it — like a scrolling score. The
  // start of the song stays visible until the playhead reaches the anchor.
  useEffect(() => {
    if (playheadStep == null) return;
    const container = gridContainerRef.current;
    const grid = gridRef.current;
    // Nothing to follow if the whole song already fits in view.
    if (!container || !grid || container.scrollWidth <= container.clientWidth) return;
    const cell = grid.querySelector<HTMLElement>(".cell.playhead");
    if (!cell) return;

    // The label column is sticky at the left, so the usable area starts past it.
    const labels = container.querySelector<HTMLElement>(".labels");
    const inset = (labels?.offsetWidth ?? 0) + 8; // label width + gap
    const view = container.clientWidth;
    const cellLeft = cell.getBoundingClientRect().left - container.getBoundingClientRect().left;
    const anchor = inset + (view - inset) * 0.4;

    // Scroll instantly (not CSS smooth): the per-step nudge is ~one cell, so
    // stepping it in sync with the beat reads as the sheet flowing under a
    // fixed playhead — and it works everywhere (some webviews ignore
    // behavior:"smooth").
    if (playheadStep === 0) {
      container.scrollLeft = 0; // loop restart → back to the start
    } else if (cellLeft > anchor) {
      container.scrollLeft += cellLeft - anchor;
    }
  }, [playheadStep, gridContainerRef, gridRef]);

  const renderBubble = (note: MelodyNote, step: number) => {
    const position = getNotePosition(note, step);
    const isStart = step === note.startStep;
    return (
      <div
        className={`bubble ${position} ${isStart ? "start-highlight" : ""} ${
          note.locked ? "locked" : ""
        }`}
        style={{ backgroundColor: colorForNote(note.note) }}
      >
        {note.locked && isStart && (
          <span className="lock-badge" aria-hidden="true">
            🔒
          </span>
        )}
      </div>
    );
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

  const renderDrumCell = (drumId: DrumId, step: number) => {
    const hit = song.drums.hits.find((h) => h.drumId === drumId && h.step === step);
    const isBeatStart = step % song.stepsPerBeat === 0;
    const isPlayhead = playheadStep === step;
    const handlers = getDrumCellHandlers(drumId, step);
    return (
      <div
        key={step}
        className={`cell ${isBeatStart ? "beat-start" : ""} ${isPlayhead ? "playhead" : ""}`}
        onMouseDown={handlers.onMouseDown}
        onTouchStart={handlers.onTouchStart}
      >
        {hit && (
          <div
            className={`drum-bubble ${hit.locked ? "locked" : ""}`}
            style={{ backgroundColor: colorForDrum(drumId) }}
          >
            {hit.locked && (
              <span className="lock-badge" aria-hidden="true">
                🔒
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="main">
      <div className="grid-container" ref={gridContainerRef}>
        <div className="labels grid">
          {noteRows.map((noteName) => (
            <div key={noteName} className="label-row">
              <div className="label-cell" style={{ backgroundColor: colorForNote(noteName) }}>
                {noteLabel(noteName, locale)}
              </div>
            </div>
          ))}
          {DRUM_ROWS.map((drumId) => (
            <div key={drumId} className="label-row drum-row">
              <div className="label-cell" style={{ backgroundColor: colorForDrum(drumId) }}>
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
  );
}
