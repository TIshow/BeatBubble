"use client";

import type { User } from "@supabase/supabase-js";
import type { Translations } from "@/lib/i18n";
import { authDisplayName } from "@/hooks/useAuth";

interface Props {
  user: User | null;
  t: Translations;
  onSignIn: () => void;
  onSignOut: () => void;
}

// Shared login/logout control for the editor and songs headers.
export function AuthButton({ user, t, onSignIn, onSignOut }: Props) {
  const name = authDisplayName(user);
  return name ? (
    <button className="auth-btn" onClick={onSignOut} title={name}>
      {t.logout}
    </button>
  ) : (
    <button className="auth-btn" onClick={onSignIn}>
      {t.login}
    </button>
  );
}
