"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Resolves accounts to their school email addresses, for teachers.
//
// The school issues and manages these addresses, so they're what staff actually
// identify a child by. They're also the most sensitive thing this app can show,
// so: gated in the database (migration 0013 refuses anyone who isn't a teacher),
// and fetched only while they're actually on screen — pass `enabled: false` when
// the teacher hides the column and nothing is requested at all.
export function useUserEmails(userIds: (string | null)[], enabled: boolean): Map<string, string> {
  const [emails, setEmails] = useState<Map<string, string>>(new Map());

  // Every id on screen, sorted into a stable key. The song list is fetched in
  // one go rather than paged, so this settles after the first load and the
  // lookup runs once — no incremental bookkeeping to keep.
  const idsKey = enabled
    ? [...new Set(userIds.filter((id): id is string => !!id))].sort().join(",")
    : "";

  useEffect(() => {
    if (!enabled || idsKey === "") return;
    const ids = idsKey.split(",");
    let active = true;
    async function load() {
      const { data, error } = await supabase.rpc("teacher_user_emails", { user_ids: ids });
      if (error) {
        console.error("[BeatBubble] email lookup failed:", error);
        return;
      }
      if (!active || !data) return;
      setEmails(new Map((data as { id: string; email: string }[]).map((r) => [r.id, r.email])));
    }
    load();
    return () => {
      active = false;
    };
  }, [enabled, idsKey]);

  return emails;
}
