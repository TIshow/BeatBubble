"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Translations } from "@/lib/i18n";
import type { Visibility } from "@/hooks/useSongFeed";
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
  visibility: Visibility;
  // Whether the viewer (the owner) is a teacher — only teachers may make a
  // song a template. Unsetting stays open to any owner.
  isTeacher: boolean;
  t: Translations;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, title: string) => void;
  onTemplateToggled: (id: string, isTemplate: boolean) => void;
  onVisibilityChanged: (id: string, visibility: Visibility) => void;
}

type Mode = "view" | "rename" | "confirmDelete";

const VISIBILITY_ORDER: Visibility[] = ["public", "unlisted", "draft"];

export function SongCard({
  id,
  title,
  author,
  time,
  gradient,
  isOwner,
  isTemplate,
  visibility,
  isTeacher,
  t,
  onDeleted,
  onRenamed,
  onTemplateToggled,
  onVisibilityChanged,
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

  const changeVisibility = async (next: Visibility) => {
    setMenuOpen(false);
    if (next === visibility) return;
    setBusy(true);
    const { error } = await supabase.from("songs").update({ visibility: next }).eq("id", id);
    setBusy(false);
    if (!error) onVisibilityChanged(id, next);
  };

  const visLabel = (v: Visibility) =>
    v === "public" ? t.visPublic : v === "unlisted" ? t.visUnlisted : t.visDraft;

  return (
    <div className="song-card">
      <div className="song-card-art" style={{ background: gradient }}>
        {isTemplate ? (
          <span className="song-card-template-badge">{t.templateBadge}</span>
        ) : visibility === "draft" ? (
          <span className="song-card-vis-badge draft">{t.visDraft}</span>
        ) : visibility === "unlisted" ? (
          <span className="song-card-vis-badge unlisted">{t.visUnlisted}</span>
        ) : null}
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
                {!isTemplate && (
                  <>
                    <span className="song-card-menu-label">{t.visibilityLabel}</span>
                    {VISIBILITY_ORDER.map((v) => (
                      <button
                        key={v}
                        role="menuitemradio"
                        aria-checked={visibility === v}
                        onClick={() => changeVisibility(v)}
                        disabled={busy}
                      >
                        <span className="song-card-menu-check" aria-hidden="true">
                          {visibility === v ? "✓" : ""}
                        </span>
                        {visLabel(v)}
                      </button>
                    ))}
                    <div className="song-card-menu-divider" />
                  </>
                )}
                {isTemplate ? (
                  <button role="menuitem" onClick={toggleTemplate} disabled={busy}>
                    ★ {t.templateOff}
                  </button>
                ) : isTeacher && visibility === "public" ? (
                  // Only teachers can make a template, and only from a public
                  // song (templates must be public — see the DB check).
                  <button role="menuitem" onClick={toggleTemplate} disabled={busy}>
                    ☆ {t.templateOn}
                  </button>
                ) : null}
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
            {/* prefetch={false}: Next.js would preload every card in view, and
                /?load=<id> is a dynamic RSC route served no-store — so each one
                is an uncacheable request (plus a function invocation) for a song
                the child probably won't open. A feed page was spending ~23 of
                them to save one navigation (#104). */}
            <Link href={`/?load=${id}`} className="song-card-play" prefetch={false}>
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
