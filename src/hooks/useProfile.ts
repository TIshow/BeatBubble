'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isDiscoveryId } from '@/discovery/catalog';
import type { DiscoveryId } from '@/discovery/types';
import { supabase } from '@/lib/supabase';

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';

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
  companionDiscoveryId: DiscoveryId | null;
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
  companion_discovery_id: string | null;
};

const PROFILE_FIELDS =
  'id, is_teacher, display_name, school, grade, class_name, gender, companion_discovery_id';

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    isTeacher: row.is_teacher,
    displayName: row.display_name,
    school: row.school,
    grade: row.grade,
    className: row.class_name,
    gender: row.gender,
    companionDiscoveryId: isDiscoveryId(row.companion_discovery_id)
      ? row.companion_discovery_id
      : null,
  };
}

// Loads the signed-in user's profile row (auto-created on signup by a DB
// trigger) and exposes a saver for the editable fields. Null user → no profile.
export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Callers that branch on a profile field (e.g. is_teacher) need to tell
  // "still finding out" from "no". Without it a teacher briefly looks like a
  // non-teacher, and a permission-shaped screen flashes at them.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      setProfile(data ? fromRow(data as ProfileRow) : null);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const saveProfile = useCallback(
    async (edits: ProfileEdits): Promise<{ error: unknown }> => {
      if (!user) return { error: new Error('Not signed in') };
      // Upsert (not update) so a missing row — e.g. the trigger hasn't run
      // yet — still succeeds. is_teacher is omitted: users can't set it, and
      // the DB defaults it to false / preserves it on update.
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            display_name: edits.displayName,
            school: edits.school,
            grade: edits.grade,
            class_name: edits.className,
            gender: edits.gender,
          },
          { onConflict: 'id' },
        )
        .select(PROFILE_FIELDS)
        .maybeSingle();
      if (!error && data) setProfile(fromRow(data as ProfileRow));
      return { error };
    },
    [user],
  );

  const saveCompanion = useCallback(
    async (companionDiscoveryId: DiscoveryId | null): Promise<{ error: unknown }> => {
      if (!user) return { error: new Error('Not signed in') };
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            companion_discovery_id: companionDiscoveryId,
          },
          { onConflict: 'id' },
        )
        .select(PROFILE_FIELDS)
        .maybeSingle();
      if (!error && data) setProfile(fromRow(data as ProfileRow));
      return { error };
    },
    [user],
  );

  return { profile, loading, saveProfile, saveCompanion };
}
