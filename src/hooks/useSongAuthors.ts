"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SongAuthor } from "@/lib/songAuthor";

// Resolves songs' user_ids to the accounts that own them, for teachers only.
//
// The `author` printed on a card is free text the child typed, so it can't
// identify anyone — a song has already been published under another child's
// name. This gives a teacher the account instead, so they can have that
// conversation with the right child.
//
// Reads are gated by RLS (migration 0011): only a profile of a teacher passes
// the policy, so a child calling this would simply get their own row back. The
// `enabled` flag avoids the pointless request, it isn't the security boundary.
export function useSongAuthors(
  userIds: (string | null)[],
  enabled: boolean
): Map<string, SongAuthor> {
  const [authors, setAuthors] = useState<Map<string, SongAuthor>>(new Map());
  // Ids already requested, so paging through the feed only fetches the new ones.
  const fetchedRef = useRef<Set<string>>(new Set());

  // Stable dependency: every id currently on screen, sorted. Which of them are
  // still missing is decided inside the effect — reading the ref during render
  // would break under concurrent rendering.
  const idsKey = enabled
    ? [...new Set(userIds.filter((id): id is string => !!id))].sort().join(",")
    : "";

  useEffect(() => {
    if (!enabled || idsKey === "") return;
    const ids = idsKey.split(",").filter((id) => !fetchedRef.current.has(id));
    if (ids.length === 0) return;
    let active = true;
    async function load() {
      // Mark before awaiting so a re-render mid-flight doesn't re-request.
      ids.forEach((id) => fetchedRef.current.add(id));
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, grade, class_name")
        .in("id", ids);
      if (error) {
        // Let a failed batch be retried rather than silently showing nothing.
        ids.forEach((id) => fetchedRef.current.delete(id));
        console.error("[BeatBubble] author lookup failed:", error);
        return;
      }
      if (!active || !data) return;
      setAuthors((prev) => {
        const next = new Map(prev);
        for (const row of data) {
          next.set(row.id, {
            displayName: row.display_name,
            grade: row.grade,
            className: row.class_name,
          });
        }
        return next;
      });
    }
    load();
    return () => {
      active = false;
    };
  }, [enabled, idsKey]);

  return authors;
}
