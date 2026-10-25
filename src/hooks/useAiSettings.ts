"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// The school-wide AI switch (#151, migration 0018): one row, read by any
// signed-in user, changed only by teachers. The server checks it again before
// every request; this is for deciding what to show.
export function useAiSettings(enabled: boolean) {
  // Null until known, so nothing AI-related flashes up before the answer.
  const [friendEnabled, setFriendEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    async function run() {
      const { data, error } = await supabase.from("ai_settings").select("friend_enabled").maybeSingle();
      if (!active) return;
      if (error) console.error("[BeatBubble] AI settings load failed:", error.code);
      setFriendEnabled(data?.friend_enabled ?? false);
    }
    run();
    return () => {
      active = false;
    };
  }, [enabled]);

  // Teachers only, by RLS. A refused update touches no rows rather than
  // erroring, so the row is asked back and none counts as a failure.
  const setFriend = useCallback(async (on: boolean): Promise<boolean> => {
    const { data, error } = await supabase
      .from("ai_settings")
      .update({ friend_enabled: on, updated_at: new Date().toISOString() })
      .eq("singleton", true)
      .select("friend_enabled");
    if (error || !data?.length) {
      console.error("[BeatBubble] AI settings update failed:", error?.code);
      return false;
    }
    setFriendEnabled(on);
    return true;
  }, []);

  return { friendEnabled: enabled ? friendEnabled : null, setFriend };
}
