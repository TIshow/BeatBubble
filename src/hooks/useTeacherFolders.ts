"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// A lesson's folder (#143). Teachers make them; children file songs into the
// open ones for their class. Closing (archived) only takes a folder out of the
// children's choices — the work inside stays where it was submitted.
export type SongFolder = {
  id: string;
  name: string;
  prompt: string | null;
  grade: number;
  // Null means every class in the grade.
  class_name: string | null;
  archived: boolean;
  created_at: string;
};

export type NewFolder = {
  name: string;
  prompt: string | null;
  grade: number;
  className: string | null;
};

const FOLDER_COLUMNS = "id, name, prompt, grade, class_name, archived, created_at";

// Who may write is decided by RLS (migration 0016: teachers only); this hook is
// only mounted on the teacher page, so it doesn't re-check.
export function useTeacherFolders() {
  const [folders, setFolders] = useState<SongFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Query inside the effect so the first setState lands in the async body,
    // not synchronously during the effect (same as useTeacherSongs).
    let active = true;
    async function run() {
      const { data, error: dbError } = await supabase
        .from("song_folders")
        .select(FOLDER_COLUMNS)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (dbError) {
        console.error("[BeatBubble] folder list failed:", dbError);
        setError(true);
      } else {
        setFolders((data as SongFolder[]) ?? []);
      }
      setLoading(false);
    }
    run();
    return () => {
      active = false;
    };
  }, []);

  // Each write returns the row the database kept (names are trimmed and class
  // names normalized there), so the list shows what was actually stored.
  const create = useCallback(async (folder: NewFolder): Promise<boolean> => {
    const { data, error: dbError } = await supabase
      .from("song_folders")
      .insert({
        name: folder.name,
        prompt: folder.prompt,
        grade: folder.grade,
        class_name: folder.className,
      })
      .select(FOLDER_COLUMNS)
      .single();
    if (dbError || !data) {
      console.error("[BeatBubble] folder create failed:", dbError);
      return false;
    }
    setFolders((prev) => [data as SongFolder, ...prev]);
    return true;
  }, []);

  // A write RLS refuses isn't an error to Supabase — it just touches 0 rows —
  // so ask for the rows back and treat none as a failure, rather than showing
  // a change that never happened.
  const setArchived = useCallback(async (id: string, archived: boolean): Promise<boolean> => {
    const { data, error: dbError } = await supabase
      .from("song_folders")
      .update({ archived })
      .eq("id", id)
      .select("id");
    if (dbError || !data?.length) {
      console.error("[BeatBubble] folder archive failed:", dbError);
      return false;
    }
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, archived } : f)));
    return true;
  }, []);

  // Removing a folder leaves its songs in place, just no longer filed anywhere
  // (songs.folder_id is on delete set null).
  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { data, error: dbError } = await supabase
      .from("song_folders")
      .delete()
      .eq("id", id)
      .select("id");
    if (dbError || !data?.length) {
      console.error("[BeatBubble] folder delete failed:", dbError);
      return false;
    }
    setFolders((prev) => prev.filter((f) => f.id !== id));
    return true;
  }, []);

  return { folders, loading, error, create, setArchived, remove };
}
