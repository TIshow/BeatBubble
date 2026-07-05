"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Locale, Translations } from "@/lib/i18n";
import { authDisplayName } from "@/hooks/useAuth";

interface Props {
  user: User | null;
  t: Translations;
  locale: Locale;
  // Preferred display name (profile) — falls back to the OAuth name/email.
  displayName?: string | null;
  // Secondary identity line, e.g. "○○小・3年・2". Omitted when empty.
  subtitle?: string | null;
  onSetLocale: (locale: Locale) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  // Shown as a menu item when signed in.
  onOpenProfile: () => void;
}

// Account dropdown shared by the editor and songs headers: identity, profile,
// language, login/logout. The trigger is a Google-style avatar circle — the
// pattern kids already know from Classroom/Docs on GIGA devices. The initial
// is drawn locally (no external avatar image: school networks may block
// googleusercontent.com).
export function AccountMenu({
  user,
  t,
  locale,
  displayName,
  subtitle,
  onSetLocale,
  onSignIn,
  onSignOut,
  onOpenProfile,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const name = (displayName ?? "").trim() || authDisplayName(user);
  // Array.from keeps surrogate pairs (e.g. rare kanji, emoji) intact.
  const initial = Array.from(name)[0] ?? "";

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        className={`account-trigger ${user ? "" : "anon"}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.accountMenu}
        title={name || t.accountMenu}
      >
        {user ? (
          <span className="account-initial">{initial}</span>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="currentColor" />
          </svg>
        )}
      </button>

      {open && (
        <div className="account-dropdown" role="menu">
          {user && (
            <div className="account-identity">
              <div className="account-name">{name}</div>
              {subtitle && <div className="account-subtitle">{subtitle}</div>}
            </div>
          )}

          {user && (
            <button
              className="account-item"
              role="menuitem"
              onClick={() => pick(onOpenProfile)}
            >
              {t.profile}
            </button>
          )}

          <div className="account-section-label">{t.languageLabel}</div>
          {/* Each language is named in itself so it's readable either way. */}
          <button
            className="account-item"
            role="menuitemradio"
            aria-checked={locale === "ja"}
            onClick={() => pick(() => onSetLocale("ja"))}
          >
            <span className="account-check" aria-hidden="true">
              {locale === "ja" ? "✓" : ""}
            </span>
            にほんご
          </button>
          <button
            className="account-item"
            role="menuitemradio"
            aria-checked={locale === "en"}
            onClick={() => pick(() => onSetLocale("en"))}
          >
            <span className="account-check" aria-hidden="true">
              {locale === "en" ? "✓" : ""}
            </span>
            English
          </button>

          <div className="account-divider" />
          {user ? (
            <button
              className="account-item account-logout"
              role="menuitem"
              onClick={() => pick(() => setConfirmingLogout(true))}
            >
              {t.logout}
            </button>
          ) : (
            <button className="account-item" role="menuitem" onClick={() => pick(onSignIn)}>
              {t.login}
            </button>
          )}
        </div>
      )}

      {confirmingLogout && (
        <div className="modal-overlay" onClick={() => setConfirmingLogout(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t.logoutConfirm}</h2>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setConfirmingLogout(false)}>
                {t.cancel}
              </button>
              <button
                className="modal-save"
                onClick={() => {
                  setConfirmingLogout(false);
                  onSignOut();
                }}
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
