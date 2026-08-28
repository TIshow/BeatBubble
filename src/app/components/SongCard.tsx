"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Translations } from "@/lib/i18n";
import type { Visibility } from "@/hooks/useSongFeed";
import { supabase } from "@/lib/supabase";
import {
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  validateSongMeta,
  containsSensitiveWord,
} from "@/lib/validation";

interface Props {
  id: string;
  title: string;
  author: string;
  description: string | null;
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
  onRenamed: (id: string, title: string, description: string | null) => void;
  onTemplateToggled: (id: string, isTemplate: boolean) => void;
  onVisibilityChanged: (id: string, visibility: Visibility) => void;
}

type Mode = "view" | "edit" | "confirmSensitive" | "confirmDelete";

const VISIBILITY_ORDER: Visibility[] = ["public", "unlisted", "draft"];

export function SongCard({
  id,
  title,
  author,
  description,
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
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const [editError, setEditError] = useState<string | null>(null);
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

  const closeEdit = () => {
    setMode("view");
    setDraft(title);
    setDraftDescription(description ?? "");
    setEditError(null);
  };

  // The row the update will write, or null when nothing actually changed.
  const pendingEdit = () => {
    const nextTitle = draft.trim();
    const nextDescription = draftDescription.trim() || null;
    if (nextTitle === title && nextDescription === (description ?? null)) return null;
    return { title: nextTitle, description: nextDescription };
  };

  const writeEdit = async (next: { title: string; description: string | null }) => {
    setBusy(true);
    const { error } = await supabase.from("songs").update(next).eq("id", id);
    setBusy(false);
    if (error) {
      console.error("[BeatBubble] edit failed:", error);
      setEditError(t.saveErrorFailed);
      setMode("edit");
      return;
    }
    onRenamed(id, next.title, next.description);
    closeEdit();
  };

  const saveEdit = async () => {
    const next = pendingEdit();
    if (!next) {
      closeEdit();
      return;
    }
    const meta = validateSongMeta({ title: next.title, author, description: next.description ?? "" });
    if (!meta.ok) {
      // Previously an invalid rename just reverted in silence. That was already
      // unhelpful for a title; with a description in the box it would throw away
      // a paragraph the child had typed, so say what happened instead.
      setEditError(
        meta.reason === "blocked-word" ? t.saveErrorBlockedWord : t.saveErrorFailed
      );
      return;
    }
    // Editing must not become the way around the save-time pause (#94): a
    // sensitive word gets the same one-question stop here.
    if (containsSensitiveWord(next.title) || containsSensitiveWord(next.description ?? "")) {
      setEditError(null);
      setMode("confirmSensitive");
      return;
    }
    await writeEdit(next);
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
                    setDraft(title);
                    setDraftDescription(description ?? "");
                    setEditError(null);
                    setMode("edit");
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
        {mode === "edit" ? (
          <div className="song-card-rename">
            <input
              className="song-card-rename-input"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setEditError(null);
              }}
              maxLength={MAX_TITLE_LENGTH}
              aria-label={t.titlePlaceholder}
              autoFocus
            />
            <textarea
              className="song-card-rename-input song-card-rename-description"
              value={draftDescription}
              onChange={(e) => {
                setDraftDescription(e.target.value);
                setEditError(null);
              }}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder={t.descriptionPlaceholder}
              aria-label={t.descriptionPlaceholder}
              rows={3}
            />
            {editError && <p className="song-card-edit-error">{editError}</p>}
            <div className="song-card-rename-actions">
              <button className="song-card-mini save" onClick={saveEdit} disabled={busy}>
                {t.save}
              </button>
              <button className="song-card-mini" onClick={closeEdit} disabled={busy}>
                {t.cancel}
              </button>
            </div>
          </div>
        ) : mode === "confirmSensitive" ? (
          // Same pause as the save dialog, in the card's existing confirm shape.
          // "Change it" stays the primary action; the detected word is never shown.
          <div className="song-card-confirm">
            <span className="song-card-confirm-label">{t.reflectBody}</span>
            <div className="song-card-rename-actions">
              <button
                className="song-card-mini save"
                onClick={() => setMode("edit")}
                disabled={busy}
              >
                {t.reflectChangeName}
              </button>
              <button
                className="song-card-mini"
                onClick={() => {
                  const next = pendingEdit();
                  if (next) writeEdit(next);
                  else closeEdit();
                }}
                disabled={busy}
              >
                {t.reflectSaveAnyway}
              </button>
            </div>
          </div>
        ) : (
          <p className="song-card-title">{title}</p>
        )}

        <p className="song-card-meta">
          {author} ・ {time}
        </p>

        {/* What the child says they were going for. Clamped rather than
            truncated in JS so the full text stays selectable and readable to a
            screen reader. */}
        {description && <p className="song-card-description">{description}</p>}

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
