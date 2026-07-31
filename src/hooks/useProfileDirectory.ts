"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SongAuthor } from "@/lib/songAuthor";

// Every profile the caller may read, keyed by user id — for the teacher view.
//
// This used to request the specific ids on screen, which put one UUID per song
// author into the query string: 3KB today at 80 authors, but growing with each
// new class, and PostgREST sits behind the usual ~8KB URL limit. Two more
// schools and the lookup would simply start failing.
//
// Teachers can read every profile anyway (migration 0011), so asking for all of
// them is a constant-size request no matter how far the app spreads — and it
// drops the incremental-fetch bookkeeping this hook used to need. RLS decides
// the scope: a non-teacher would get back only their own row, which is why
// `enabled` is a request-saver, not the security boundary.
export function useProfileDirectory(enabled: boolean): Map<string, SongAuthor> {
  const [profiles, setProfiles] = useState<Map<string, SongAuthor>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, grade, class_name");
      if (error) {
        console.error("[BeatBubble] profile directory failed:", error);
        return;
      }
      if (!active || !data) return;
      setProfiles(
        new Map(
          data.map((row) => [
            row.id,
            { displayName: row.display_name, grade: row.grade, className: row.class_name },
          ])
        )
      );
    }
    load();
    return () => {
      active = false;
    };
  }, [enabled]);

  return profiles;
}
