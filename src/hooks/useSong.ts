import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/core/types";
import { DEFAULT_SONG, HISTORY_LIMIT } from "@/core/defaults";

// Owns the song document plus its undo history.
// songRef mirrors the latest song for callers that read it outside React
// render (e.g. the audio scheduler reading the live song each tick).
export function useSong() {
  const [song, setSong] = useState<Song>(DEFAULT_SONG);
  const [history, setHistory] = useState<Song[]>([]);
  const songRef = useRef<Song>(song);

  useEffect(() => {
    songRef.current = song;
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
