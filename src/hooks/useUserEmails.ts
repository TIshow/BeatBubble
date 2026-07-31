"use client";

import { useEffect, useRef, useState } from "react";
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
  const fetchedRef = useRef<Set<string>>(new Set());

  // Every id on screen, sorted; which are still missing is decided in the
  // effect (reading a ref during render breaks concurrent rendering).
  const idsKey = enabled
    ? [...new Set(userIds.filter((id): id is string => !!id))].sort().join(",")
    : "";

  useEffect(() => {
    if (!enabled || idsKey === "") return;
    const ids = idsKey.split(",").filter((id) => !fetchedRef.current.has(id));
    if (ids.length === 0) return;
    let active = true;
    async function load() {
      ids.forEach((id) => fetchedRef.current.add(id));
      const { data, error } = await supabase.rpc("teacher_user_emails", { user_ids: ids });
      if (error) {
        ids.forEach((id) => fetchedRef.current.delete(id));
        console.error("[BeatBubble] email lookup failed:", error);
        return;
      }
      if (!active || !data) return;
      setEmails((prev) => {
        const next = new Map(prev);
        for (const row of data as { id: string; email: string }[]) {
          next.set(row.id, row.email);
        }
        return next;
      });
    }
    load();
    return () => {
      active = false;
    };
  }, [enabled, idsKey]);

  return emails;
}
