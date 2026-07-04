"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Locale, Translations } from "@/lib/i18n";
import { AccountMenu } from "./AccountMenu";

interface Props {
  t: Translations;
  locale: Locale;
  isPlaying: boolean;
  canUndo: boolean;
  isSettingsOpen: boolean;
  onPlay: () => void;
  onStop: () => void;
  onUndo: () => void;
  onToggleSettings: () => void;
  onOpenSave: () => void;
  onExport: () => void;
  isExporting: boolean;
  onSetLocale: (locale: Locale) => void;
  user: User | null;
  profileName?: string | null;
  profileSubtitle?: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenProfile: () => void;
}

export function Header({
  t,
  locale,
  isPlaying,
  canUndo,
  isSettingsOpen,
  onPlay,
  onStop,
  onUndo,
  onToggleSettings,
  onOpenSave,
  onExport,
  isExporting,
  onSetLocale,
  user,
  profileName,
  profileSubtitle,
  onSignIn,
  onSignOut,
  onOpenProfile,
}: Props) {
  return (
    <header className="header">
      <h1>BeatBubble</h1>
      <div className="transport">
        <button
          className={`transport-btn play-btn ${isPlaying ? "disabled" : ""}`}
          onClick={onPlay}
          disabled={isPlaying}
        >
          {t.play}
        </button>
        <button
          className={`transport-btn stop-btn ${!isPlaying ? "disabled" : ""}`}
          onClick={onStop}
          disabled={!isPlaying}
        >
          {t.stop}
        </button>
      </div>
      <button className="undo-btn" onClick={onUndo} disabled={!canUndo}>
        {t.undo}
      </button>
      <button
        className={`settings-btn ${isSettingsOpen ? "active" : ""}`}
        onClick={onToggleSettings}
        aria-expanded={isSettingsOpen}
      >
        <span className="settings-icon" aria-hidden="true">
          ⚙
        </span>
        {t.settings}
        <span className="settings-arrow">{isSettingsOpen ? "▲" : "▼"}</span>
      </button>
      <button className="save-btn" onClick={onOpenSave}>
        {t.save}
      </button>
      <button className="export-btn" onClick={onExport} disabled={isExporting}>
        {isExporting ? t.exporting : t.exportWav}
      </button>
      <Link href="/songs" className="songs-nav-link">
        {t.songsLink}
      </Link>
      <AccountMenu
        user={user}
        t={t}
        locale={locale}
        displayName={profileName}
        subtitle={profileSubtitle}
        onSetLocale={onSetLocale}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onOpenProfile={onOpenProfile}
      />
    </header>
  );
}
