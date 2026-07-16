import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/core/types";
import { DEFAULT_SONG, HISTORY_LIMIT } from "@/core/defaults";
import { migrateSong } from "@/core/legacy";

// The in-progress song is mirrored to sessionStorage so navigating away
// (e.g. to /songs and back — the editor unmounts) or reloading doesn't blank
// the grid. Session-scoped on purpose: it dies with the tab, so it can't
// resurrect a weeks-old draft, and two tabs don't fight over one key.
// All storage access goes through these helpers — each swallows its own
// failure, so the hook body stays free of try/catch.
const WORK_KEY = "beatbubble-work";

function readStoredWork(): Song | null {
  try {
    const raw = sessionStorage.getItem(WORK_KEY);
    // Persisted songs are versioned — always revive through migrateSong so a
    // deploy that bumps the model doesn't break a tab that was already open.
    if (raw) return migrateSong(JSON.parse(raw));
  } catch {
    // Corrupt/unreadable stored work — fall back to a fresh song.
  }
  return null;
}

function writeStoredWork(song: Song): void {
  try {
    sessionStorage.setItem(WORK_KEY, JSON.stringify(song));
  } catch {
    // Storage full/unavailable — persistence is best-effort.
  }
}

function clearStoredWork(): void {
  try {
    sessionStorage.removeItem(WORK_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

// Owns the song document plus its undo history.
// songRef mirrors the latest song for callers that read it outside React
// render (e.g. the audio scheduler reading the live song each tick).
export function useSong() {
  const [song, setSong] = useState<Song>(DEFAULT_SONG);
  const [history, setHistory] = useState<Song[]>([]);
  const songRef = useRef<Song>(song);

  // Restore after mount (not in the useState initializer) so the first client
  // render matches the server-rendered empty grid — no hydration mismatch. A
  // ?load= fetch resolving later still wins by replacing the song.
  useEffect(() => {
    let active = true;
    async function restore() {
      const saved = readStoredWork();
      if (active && saved) setSong(saved);
    }
    restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    songRef.current = song;
    // Never persist the pristine default (reference check): the mount render
    // holds DEFAULT_SONG itself, and writing it here would clobber the stored
    // work before/between the restore effect's runs (StrictMode re-runs
    // effects). Any real edit/load produces a new object, which persists.
    if (song !== DEFAULT_SONG) writeStoredWork(song);
  }, [song]);

  const pushHistory = useCallback((snapshot: Song) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), snapshot]);
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    setSong(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  const reset = useCallback(() => {
    setSong(DEFAULT_SONG);
    setHistory([]);
    // The persist effect skips DEFAULT_SONG, so drop the stored work here —
    // otherwise navigating away and back would resurrect the pre-reset song.
    clearStoredWork();
  }, []);

  return {
    song,
    setSong,
    songRef,
    canUndo: history.length > 0,
    pushHistory,
    undo,
    reset,
  };
}
