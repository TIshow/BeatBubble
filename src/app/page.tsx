"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { DrumId, InstrumentId, NoteName } from "@/core/types";
import {
  addMelodyNote,
  adjustPitchBound,
  clearAllowedNotes,
  removeMelodyNote,
  setAllowAccidentals,
  setAllowedNotes,
  setBlocks,
  setMelodyNoteDuration,
  toggleAllowedNote,
  toggleDrumHit,
} from "@/core/ops";
import { migrateSong } from "@/core/legacy";
import { buildRangeNotes, findMelodyNoteAt } from "@/ui/grid";
import { AudioEngine } from "@/audio/engine";
import { useDragInteraction } from "@/hooks/useDragInteraction";
import { useLocale } from "@/hooks/useLocale";
import { useSong } from "@/hooks/useSong";
import { supabase } from "@/lib/supabase";
import { SaveModal } from "./components/SaveModal";
import { NotePanel } from "./components/NotePanel";
import { Header } from "./components/Header";
import { SettingsPanel } from "./components/SettingsPanel";
import { Grid } from "./components/Grid";

export default function Home() {
  const { locale, t, toggleLocale } = useLocale();
  const { song, setSong, songRef, canUndo, pushHistory, undo, reset } = useSong();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadStep, setPlayheadStep] = useState<number | null>(null);
  const [isNotePanelOpen, setIsNotePanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);

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
          setSong(migrateSong(data.song_data));
          window.history.replaceState({}, "", "/");
        }
      });
  }, [setSong]);

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
    [song, setSong, getEngine, pushHistory]
  );

  const handleNoteRemove = useCallback(
    (noteId: string) => {
      pushHistory(song);
      setSong((prev) => removeMelodyNote(prev, noteId));
    },
    [song, setSong, pushHistory]
  );

  const handleNoteDurationChange = useCallback(
    (noteId: string, duration: number) => {
      setSong((prev) => setMelodyNoteDuration(prev, noteId, duration));
    },
    [setSong]
  );

  const handleDrumToggle = useCallback(
    (drumId: DrumId, step: number) => {
      const wasHit = song.drums.hits.some((h) => h.drumId === drumId && h.step === step);
      pushHistory(song);
      setSong((prev) => toggleDrumHit(prev, { step, drumId }));
      if (!wasHit) {
        getEngine().playDrumPreview(drumId);
      }
    },
    [song, setSong, getEngine, pushHistory]
  );

  const findNoteAt = useCallback(
    (noteName: NoteName, step: number) => findMelodyNoteAt(song, noteName, step),
    [song]
  );

  const handleDragStart = useCallback(() => {
    pushHistory(songRef.current);
  }, [pushHistory, songRef]);

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
    reset();
    setIsConfirmingReset(false);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) setSong((prev) => ({ ...prev, bpm: value }));
  };

  const handlePitchBoundChange = (bound: "min" | "max", direction: "up" | "down") => {
    setSong((prev) => adjustPitchBound(prev, bound, direction));
  };

  const handleBlocksChange = (direction: "inc" | "dec") => {
    setSong((prev) => setBlocks(prev, prev.blocks + (direction === "inc" ? 1 : -1)));
  };

  const handleInstrumentChange = (instrument: InstrumentId) => {
    setSong((prev) => ({ ...prev, instrument }));
  };

  const handleToggleAccidentals = () => {
    setSong((prev) => setAllowAccidentals(prev, !prev.constraints.allowAccidentals));
  };

  const handleToggleSettings = () => {
    setIsSettingsOpen((prev) => !prev);
    setIsConfirmingReset(false);
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
    [song, setSong]
  );

  const handleClearAllowedNotes = useCallback(() => {
    setSong((prev) => clearAllowedNotes(prev));
  }, [setSong]);

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
      <Header
        t={t}
        isPlaying={isPlaying}
        canUndo={canUndo}
        isSettingsOpen={isSettingsOpen}
        onPlay={handlePlay}
        onStop={handleStop}
        onUndo={undo}
        onToggleSettings={handleToggleSettings}
        onOpenSave={() => setIsSaveModalOpen(true)}
        onToggleLocale={toggleLocale}
      />

      {isSettingsOpen && (
        <SettingsPanel
          song={song}
          t={t}
          locale={locale}
          isPlaying={isPlaying}
          isNotePanelOpen={isNotePanelOpen}
          isConfirmingReset={isConfirmingReset}
          onBpmChange={handleBpmChange}
          onPitchBoundChange={handlePitchBoundChange}
          onBlocksChange={handleBlocksChange}
          onInstrumentChange={handleInstrumentChange}
          onToggleAccidentals={handleToggleAccidentals}
          onToggleNotePanel={() => setIsNotePanelOpen((prev) => !prev)}
          onStartReset={() => setIsConfirmingReset(true)}
          onConfirmReset={handleReset}
          onCancelReset={() => setIsConfirmingReset(false)}
        />
      )}

      {isNotePanelOpen && (
        <NotePanel
          rangeNotes={buildRangeNotes(song)}
          allowedNotes={song.constraints.allowedNotes}
          locale={locale}
          onNoteClick={handleNoteChipClick}
          onClear={handleClearAllowedNotes}
        />
      )}

      <Grid
        song={song}
        playheadStep={playheadStep}
        locale={locale}
        gridRef={gridRef}
        gridContainerRef={gridContainerRef}
        getMelodyCellHandlers={getMelodyCellHandlers}
        getDrumCellHandlers={getDrumCellHandlers}
      />

      {isSaveModalOpen && (
        <SaveModal song={song} locale={locale} onClose={() => setIsSaveModalOpen(false)} />
      )}
    </div>
  );
}
