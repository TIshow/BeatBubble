"use client";

import { useState } from "react";
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
  const [confirming, setConfirming] = useState(false);

  if (!name) {
    return (
      <button className="auth-btn" onClick={onSignIn}>
        {t.login}
      </button>
    );
  }

  return (
    <>
      <button className="auth-btn" onClick={() => setConfirming(true)} title={name}>
        {t.logout}
      </button>
      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t.logoutConfirm}</h2>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setConfirming(false)}>
                {t.cancel}
              </button>
              <button
                className="modal-save"
                onClick={() => {
                  setConfirming(false);
                  onSignOut();
                }}
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
