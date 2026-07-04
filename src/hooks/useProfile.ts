"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Gender = "male" | "female" | "other" | "undisclosed";

// App-level attributes for a signed-in user, stored in public.profiles.
// `isTeacher` is admin-set (a user can't change their own — see the migration);
// everything else the user fills in via the profile form.
export type Profile = {
  id: string;
  isTeacher: boolean;
  displayName: string | null;
  school: string | null;
  grade: number | null;
  className: string | null;
  gender: Gender | null;
};

// The user-editable subset of a profile.
export type ProfileEdits = {
  displayName: string | null;
  school: string | null;
  grade: number | null;
  className: string | null;
  gender: Gender | null;
};

type ProfileRow = {
  id: string;
  is_teacher: boolean;
  display_name: string | null;
  school: string | null;
  grade: number | null;
  class_name: string | null;
  gender: Gender | null;
};

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    isTeacher: row.is_teacher,
    displayName: row.display_name,
    school: row.school,
    grade: row.grade,
    className: row.class_name,
    gender: row.gender,
  };
}

// Loads the signed-in user's profile row (auto-created on signup by a DB
// trigger) and exposes a saver for the editable fields. Null user → no profile.
export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, is_teacher, display_name, school, grade, class_name, gender")
        .eq("id", user.id)
        .maybeSingle();
      if (active) setProfile(data ? fromRow(data as ProfileRow) : null);
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const saveProfile = useCallback(
    async (edits: ProfileEdits): Promise<{ error: unknown }> => {
      if (!user) return { error: new Error("Not signed in") };
      // Upsert (not update) so a missing row — e.g. the trigger hasn't run
      // yet — still succeeds. is_teacher is omitted: users can't set it, and
      // the DB defaults it to false / preserves it on update.
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            display_name: edits.displayName,
            school: edits.school,
            grade: edits.grade,
            class_name: edits.className,
            gender: edits.gender,
          },
          { onConflict: "id" }
        )
        .select("id, is_teacher, display_name, school, grade, class_name, gender")
        .maybeSingle();
      if (!error && data) setProfile(fromRow(data as ProfileRow));
      return { error };
    },
    [user]
  );

  return { profile, saveProfile };
}
