"use client";

import { createContext, useContext, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, type Profile, type ProfileEdits } from "@/hooks/useProfile";
import { useLocale } from "@/hooks/useLocale";
import { ProfileModal } from "@/app/components/ProfileModal";

type AccountState = {
  user: User | null;
  ready: boolean;
  profile: Profile | null;
  // Distinguishes "still finding out" from "no" for callers that branch on a
  // profile field, so a teacher never briefly looks like a non-teacher.
  profileLoading: boolean;
  isTeacher: boolean;
  signIn: () => void;
  signOut: () => void;
  saveProfile: (edits: ProfileEdits) => Promise<{ error: unknown }>;
  openProfile: () => void;
};

const AccountContext = createContext<AccountState | null>(null);

// Who is signed in, and everything that hangs off that.
//
// This exists because the account menu appears on four pages and used to be fed
// by hand: each page called useAuth + useProfile, recomputed the same identity
// subtitle, and passed nine props down (through Header, for the editor). Adding
// one of them meant editing four files, and the teacher link went missing on
// three of them for exactly that reason.
//
// Holding it in one place makes that class of bug impossible — a new piece of
// account state is added here and read where it's needed — and collapses the
// duplicate auth subscription and profile fetch each page was making.
//
// The profile dialog lives here too: every page rendered its own copy with its
// own open flag, purely because the menu needed something to open.
//
// Locale is deliberately NOT here: useLocale is a useSyncExternalStore over
// localStorage, so every caller already shares one value.
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, ready, signInWithGoogle, signOut } = useAuth();
  const { profile, loading, saveProfile } = useProfile(user);
  const { t } = useLocale();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <AccountContext.Provider
      value={{
        user,
        ready,
        profile,
        profileLoading: loading,
        isTeacher: !!profile?.isTeacher,
        signIn: signInWithGoogle,
        signOut,
        saveProfile,
        openProfile: () => setProfileOpen(true),
      }}
    >
      {children}
      {profileOpen && (
        <ProfileModal
          t={t}
          profile={profile}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountState {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used within AccountProvider");
  return value;
}
