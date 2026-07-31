'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authDisplayName } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { useAccount } from '@/app/components/AccountProvider';

// Account dropdown shared by the editor and songs headers: identity, profile,
// language, login/logout. The trigger is a Google-style avatar circle — the
// pattern kids already know from Classroom/Docs on GIGA devices. The initial
// is drawn locally (no external avatar image: school networks may block
// googleusercontent.com).
export function AccountMenu() {
  const { locale, t, changeLocale } = useLocale();
  const { user, profile, isTeacher, signIn, signOut, openProfile } = useAccount();
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const name = (profile?.displayName ?? '').trim() || authDisplayName(user);
  // The identity line under the name — school・grade・class, skipping blanks.
  // Built here rather than by each page, which is where it used to be copied.
  const subtitle =
    [
      profile?.school,
      profile?.grade != null ? t.profileGradeUnit(profile.grade) : null,
      profile?.className,
    ]
      .filter(Boolean)
      .join('・') || null;
  // Array.from keeps surrogate pairs (e.g. rare kanji, emoji) intact.
  const initial = Array.from(name)[0] ?? '';

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        className={`account-trigger ${user ? '' : 'anon'}`}
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
            <button className="account-item" role="menuitem" onClick={() => pick(openProfile)}>
              {t.profile}
            </button>
          )}

          {user && isTeacher && (
            <Link
              href="/teacher"
              className="account-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {t.teacherLink}
            </Link>
          )}

          <Link
            href="/discoveries"
            className="account-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {t.discoveriesLink}
          </Link>

          <div className="account-section-label">{t.languageLabel}</div>
          {/* Each language is named in itself so it's readable either way. */}
          <button
            className="account-item"
            role="menuitemradio"
            aria-checked={locale === 'ja'}
            onClick={() => pick(() => changeLocale('ja'))}
          >
            <span className="account-check" aria-hidden="true">
              {locale === 'ja' ? '✓' : ''}
            </span>
            にほんご
          </button>
          <button
            className="account-item"
            role="menuitemradio"
            aria-checked={locale === 'en'}
            onClick={() => pick(() => changeLocale('en'))}
          >
            <span className="account-check" aria-hidden="true">
              {locale === 'en' ? '✓' : ''}
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
            <button className="account-item" role="menuitem" onClick={() => pick(signIn)}>
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
                  signOut();
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
