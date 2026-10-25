"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FOLDER_COLUMNS, type SongFolder } from "@/lib/folders";

export type NewFolder = {
  name: string;
  prompt: string | null;
  grade: number;
  className: string | null;
};

// Who may write is decided by RLS (migration 0016: teachers only). `enabled`
// lets the teacher page call this unconditionally and fetch only for a teacher.
export function useTeacherFolders(enabled: boolean) {
  const [folders, setFolders] = useState<SongFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

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

  // Closing or reopening an existing folder.
  //
  // A write RLS refuses isn't an error to Supabase — it just touches 0 rows —
  // so ask for the rows back and treat none as a failure, rather than showing
  // a change that never happened.
  const update = useCallback(
    async (id: string, patch: Pick<SongFolder, "archived">): Promise<boolean> => {
      const { data, error: dbError } = await supabase
        .from("song_folders")
        .update(patch)
        .eq("id", id)
        .select("id");
      if (dbError || !data?.length) {
        console.error("[BeatBubble] folder update failed:", dbError);
        return false;
      }
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
      return true;
    },
    []
  );

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

  return { folders, loading, error, create, update, remove };
}

export type TeacherFoldersState = ReturnType<typeof useTeacherFolders>;
