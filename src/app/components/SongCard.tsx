"use client";

import { useState } from "react";
import Link from "next/link";
import type { Translations } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  MAX_TITLE_LENGTH,
  validateSongMeta,
} from "@/lib/validation";

interface Props {
  id: string;
  title: string;
  author: string;
  time: string;
  gradient: string;
  isOwner: boolean;
  isTemplate: boolean;
  t: Translations;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, title: string) => void;
  onTemplateToggled: (id: string, isTemplate: boolean) => void;
}

type Mode = "view" | "rename" | "confirmDelete";

export function SongCard({
  id,
  title,
  author,
  time,
  gradient,
  isOwner,
  isTemplate,
  t,
  onDeleted,
  onRenamed,
  onTemplateToggled,
}: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(title);
  const [busy, setBusy] = useState(false);

  const saveRename = async () => {
    const next = draft.trim();
    // Reuse the same title rules as saving (length, empty, blocked word).
    const meta = validateSongMeta({ title: next, author });
    if (!meta.ok || next === title) {
      setMode("view");
      setDraft(title);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("songs").update({ title: next }).eq("id", id);
    setBusy(false);
    if (!error) {
      onRenamed(id, next);
      setMode("view");
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    const { error } = await supabase.from("songs").delete().eq("id", id);
    setBusy(false);
    if (!error) onDeleted(id);
    else setMode("view");
  };

  const toggleTemplate = async () => {
    const next = !isTemplate;
    setBusy(true);
    const { error } = await supabase
      .from("songs")
      .update({ is_template: next })
      .eq("id", id);
    setBusy(false);
    if (!error) onTemplateToggled(id, next);
  };

  return (
    <div className="song-card">
      <div className="song-card-art" style={{ background: gradient }}>
        {isTemplate && <span className="song-card-template-badge">{t.templateBadge}</span>}
      </div>
      <div className="song-card-body">
        {mode === "rename" ? (
          <div className="song-card-rename">
            <input
              className="song-card-rename-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              autoFocus
            />
            <div className="song-card-rename-actions">
              <button className="song-card-mini save" onClick={saveRename} disabled={busy}>
                {t.save}
              </button>
              <button
                className="song-card-mini"
                onClick={() => {
                  setMode("view");
                  setDraft(title);
                }}
                disabled={busy}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <p className="song-card-title">{title}</p>
        )}

        <p className="song-card-author">{author}</p>
        <p className="song-card-time">{time}</p>

        {mode === "confirmDelete" ? (
          <div className="song-card-confirm">
            <span className="song-card-confirm-label">{t.confirmDeleteSong}</span>
            <div className="song-card-rename-actions">
              <button className="song-card-mini danger" onClick={confirmDelete} disabled={busy}>
                {t.confirmYes}
              </button>
              <button
                className="song-card-mini"
                onClick={() => setMode("view")}
                disabled={busy}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <Link href={`/?load=${id}`} className="song-card-play">
            {t.playBtn}
          </Link>
        )}

        {isOwner && mode === "view" && (
          <>
            <button
              className={`song-card-mini template ${isTemplate ? "active" : ""}`}
              onClick={toggleTemplate}
              disabled={busy}
            >
              {isTemplate ? `★ ${t.templateOff}` : `☆ ${t.templateOn}`}
            </button>
            <div className="song-card-owner">
              <button className="song-card-mini" onClick={() => setMode("rename")}>
                ✎ {t.rename}
              </button>
              <button className="song-card-mini danger" onClick={() => setMode("confirmDelete")}>
                🗑 {t.deleteSong}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
