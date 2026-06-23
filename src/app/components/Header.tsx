"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Translations } from "@/lib/i18n";
import { AuthButton } from "./AuthButton";

interface Props {
  t: Translations;
  isPlaying: boolean;
  canUndo: boolean;
  isSettingsOpen: boolean;
  onPlay: () => void;
  onStop: () => void;
  onUndo: () => void;
  onToggleSettings: () => void;
  onOpenSave: () => void;
  onToggleLocale: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Header({
  t,
  isPlaying,
  canUndo,
  isSettingsOpen,
  onPlay,
  onStop,
  onUndo,
  onToggleSettings,
  onOpenSave,
  onToggleLocale,
  user,
  onSignIn,
  onSignOut,
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
      <Link href="/songs" className="songs-nav-link">
        {t.songsLink}
      </Link>
      <button className="locale-toggle" onClick={onToggleLocale}>
        {t.switchLocale}
      </button>
      <AuthButton user={user} t={t} onSignIn={onSignIn} onSignOut={onSignOut} />
    </header>
  );
}
