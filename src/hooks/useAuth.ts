"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Optional Google sign-in. Anonymous use keeps working; signing in lets a
// user own (and later manage) the songs they save.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // onAuthStateChange emits INITIAL_SESSION after it has read storage, so a
    // separate getSession() duplicates the same initialization. Supabase may
    // also emit SIGNED_IN again when a tab regains focus; retaining the current
    // object for the same user avoids re-fetching profile and discovery data.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser((currentUser) => {
        if (event !== "USER_UPDATED" && currentUser?.id === nextUser?.id) {
          return currentUser;
        }
        return nextUser;
      });
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      // Works for both localhost and the deployed origin.
      options: { redirectTo: window.location.origin },
    });

  const signOut = () => supabase.auth.signOut();

  return { user, ready, signInWithGoogle, signOut };
}

// Friendly display name from Google metadata, falling back to email.
export function authDisplayName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata as { full_name?: string; name?: string };
  return meta.full_name || meta.name || user.email || "";
}
