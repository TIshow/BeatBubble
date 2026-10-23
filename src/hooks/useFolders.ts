"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { byOpenThenNewest, FOLDER_COLUMNS, type SongFolder } from "@/lib/folders";

// The folder a page is showing. Folders are readable by everyone (migration
// 0016), so a link to one works signed out too — e.g. on the classroom screen.
export function useFolder(id: string) {
  // Kept with the id it answers, so moving to another folder reads as loading
  // rather than briefly showing the previous one — no effect has to reset it.
  const [result, setResult] = useState<{ id: string; folder: SongFolder | null } | null>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      const { data, error } = await supabase
        .from("song_folders")
        .select(FOLDER_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (error) console.error("[BeatBubble] folder load failed:", error);
      setResult({ id, folder: (data as SongFolder | null) ?? null });
    }
    run();
    return () => {
      active = false;
    };
  }, [id]);

  const current = result?.id === id ? result : null;
  return { folder: current?.folder ?? null, loading: current === null };
}

type Viewer = { isTeacher: boolean; grade: number | null; className: string | null };

// The folders worth a shortcut on the feed for this viewer:
// - a child: every folder for their class (and their grade's whole-grade ones),
//   closed ones included — the work stays worth revisiting after the lesson
// - a teacher: the open ones, across classes; the full list lives on /teacher
// - signed out, or no grade on the profile: none — there's no class to match
export function useFolderShortcuts({ isTeacher, grade, className }: Viewer): SongFolder[] {
  const [folders, setFolders] = useState<SongFolder[]>([]);
  const enabled = isTeacher || grade != null;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    async function run() {
      let query = supabase.from("song_folders").select(FOLDER_COLUMNS);
      // By grade only, then the class in memory: matching class in the query
      // would mean building an or() filter out of a profile value, and older
      // profiles can still hold free-typed class names. A grade has few folders.
      query = isTeacher ? query.eq("archived", false) : query.eq("grade", grade!);
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        console.error("[BeatBubble] folder shortcuts failed:", error);
        return;
      }
      const rows = (data as SongFolder[]) ?? [];
      const mine = isTeacher
        ? rows
        : rows.filter((f) => f.class_name === null || f.class_name === className);
      setFolders(mine.sort(byOpenThenNewest));
    }
    run();
    return () => {
      active = false;
    };
  }, [enabled, isTeacher, grade, className]);

  return enabled ? folders : [];
}
