"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Translations } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { MAX_TITLE_LENGTH, validateSongMeta } from "@/lib/validation";

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
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?load=${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context) — silently ignore
    }
  };

  const saveRename = async () => {
    const next = draft.trim();
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
    setMenuOpen(false);
    setBusy(true);
    const { error } = await supabase.from("songs").update({ is_template: next }).eq("id", id);
    setBusy(false);
    if (!error) onTemplateToggled(id, next);
  };

  return (
    <div className="song-card">
      <div className="song-card-art" style={{ background: gradient }}>
        {isTemplate && <span className="song-card-template-badge">{t.templateBadge}</span>}
        {isOwner && (
          <div className="song-card-menu" ref={menuRef}>
            <button
              className="song-card-kebab"
              aria-label={t.songMenu}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="song-card-menu-pop" role="menu">
                <button role="menuitem" onClick={toggleTemplate} disabled={busy}>
                  {isTemplate ? `★ ${t.templateOff}` : `☆ ${t.templateOn}`}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setMode("rename");
                  }}
                >
                  ✎ {t.rename}
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setMenuOpen(false);
                    setMode("confirmDelete");
                  }}
                >
                  🗑 {t.deleteSong}
                </button>
              </div>
            )}
          </div>
        )}
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

        <p className="song-card-meta">
          {author} ・ {time}
        </p>

        {mode === "confirmDelete" ? (
          <div className="song-card-confirm">
            <span className="song-card-confirm-label">{t.confirmDeleteSong}</span>
            <div className="song-card-rename-actions">
              <button className="song-card-mini danger" onClick={confirmDelete} disabled={busy}>
                {t.confirmYes}
              </button>
              <button className="song-card-mini" onClick={() => setMode("view")} disabled={busy}>
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="song-card-actions">
            <Link href={`/?load=${id}`} className="song-card-play">
              {t.playBtn}
            </Link>
            <button
              className="song-card-copy"
              onClick={copyLink}
              aria-label={copied ? t.linkCopied : t.copyLink}
              title={copied ? t.linkCopied : t.copyLink}
            >
              {copied ? "✓" : "🔗"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
