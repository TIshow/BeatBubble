"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Visibility } from "@/hooks/useSongFeed";

export type TeacherSong = {
  id: string;
  title: string;
  author: string;
  updated_at: string;
  user_id: string | null;
  visibility: Visibility;
  hidden: boolean;
  grade: number | null;
  class_name: string | null;
};

// Everything the teacher may moderate, newest first. Unlike the child-facing
// feed this isn't paginated: a teacher scans and sorts the whole set, and
// without song_data the rows are small (~300 songs ≈ 100KB).
//
// Scope comes from RLS (migration 0012): published songs including ones already
// hidden, never another child's draft.
const MAX_ROWS = 2000;

export function useTeacherSongs(enabled: boolean) {
  const [songs, setSongs] = useState<TeacherSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // The query lives inside the effect, not in a useCallback the effect calls:
    // that way the first setState happens in the async body instead of
    // synchronously during the effect, which would cascade renders.
    let active = true;
    async function run() {
      setLoading(true);
      setError(false);
      const { data, error: dbError } = await supabase
        .from("songs")
        .select("id, title, author, updated_at, user_id, visibility, hidden, grade, class_name")
        .order("updated_at", { ascending: false })
        .limit(MAX_ROWS);
      if (!active) return;
      if (dbError) {
        console.error("[BeatBubble] teacher song list failed:", dbError);
        setError(true);
      } else {
        setSongs((data as TeacherSong[]) ?? []);
      }
      setLoading(false);
    }
    run();
    return () => {
      active = false;
    };
  }, [enabled]);

  // Hide/unhide through the teacher-only function (migration 0012); the flag is
  // mirrored locally so the row updates without refetching the whole list.
  const setHidden = useCallback(async (id: string, hide: boolean): Promise<boolean> => {
    const { error: rpcError } = await supabase.rpc("set_song_hidden", {
      song_id: id,
      hide,
    });
    if (rpcError) {
      console.error("[BeatBubble] hide failed:", rpcError);
      return false;
    }
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, hidden: hide } : s)));
    return true;
  }, []);

  return { songs, loading, error, setHidden };
}
