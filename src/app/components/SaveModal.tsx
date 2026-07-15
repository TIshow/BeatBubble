"use client";

import { useState } from "react";
import type { Song } from "@/core/types";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  validateSongMeta,
  songWithinSizeLimit,
} from "@/lib/validation";

interface Props {
  song: Song;
  locale: Locale;
  userId: string | null;
  defaultAuthor?: string;
  // When set, the loaded song is owned by the current user and can be overwritten.
  existing?: { id: string; title: string; author: string } | null;
  // Called after a successful overwrite so the caller can keep its loaded-song
  // title/author in sync (avoids a stale prefill reverting the name next time).
  onOverwritten?: (title: string, author: string) => void;
  onClose: () => void;
}

export function SaveModal({
  song,
  locale,
  userId,
  defaultAuthor = "",
  existing = null,
  onOverwritten,
  onClose,
}: Props) {
  const t = translations[locale];
  const [title, setTitle] = useState(existing ? existing.title : "");
  const [author, setAuthor] = useState(existing ? existing.author : defaultAuthor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guard = (): boolean => {
    const meta = validateSongMeta({ title, author });
    if (!meta.ok) {
      // Empty/length are gated by the disabled button + maxLength; the
      // meaningful client-side rejection here is the blocked word.
      if (meta.reason === "blocked-word") setError(t.saveErrorBlockedWord);
      return false;
    }
    if (!songWithinSizeLimit(song)) {
      setError(t.saveErrorTooLarge);
      return false;
    }
    return true;
  };

  const run = async (op: () => Promise<{ error: unknown }>, onSuccess?: () => void) => {
    if (!guard()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await op();
      if (dbError) {
        setError(t.saveErrorFailed);
        return;
      }
      onSuccess?.();
      onClose();
    } catch {
      setError(t.saveErrorFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleInsert = () =>
    run(async () =>
      supabase.from("songs").insert({
        title: title.trim(),
        author: author.trim(),
        song_data: song,
        user_id: userId,
        // Signed-in saves start private (publish later); anonymous saves have
        // no owner to manage a draft, so they go straight to public.
        visibility: userId ? "draft" : "public",
      })
    );

  const handleOverwrite = () =>
    run(
      async () =>
        supabase
          .from("songs")
          .update({ title: title.trim(), author: author.trim(), song_data: song })
          .eq("id", existing!.id),
      () => onOverwritten?.(title.trim(), author.trim())
    );

  const canSave = !saving && !!title.trim() && !!author.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{t.saveModalTitle}</h2>
        <div className="modal-fields">
          <input
            className="modal-input"
            placeholder={t.titlePlaceholder}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            maxLength={MAX_TITLE_LENGTH}
            autoFocus
          />
          <input
            className="modal-input"
            placeholder={t.authorPlaceholder}
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              if (error) setError(null);
            }}
            maxLength={MAX_AUTHOR_LENGTH}
          />
        </div>
        {!existing && (
          <p className="modal-hint">{userId ? t.saveDraftHint : t.savePublicHint}</p>
        )}
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            {t.cancel}
          </button>
          {existing ? (
            <>
              <button className="modal-cancel" onClick={handleInsert} disabled={!canSave}>
                {t.saveAsNew}
              </button>
              <button className="modal-save" onClick={handleOverwrite} disabled={!canSave}>
                {saving ? t.saving : t.overwrite}
              </button>
            </>
          ) : (
            <button className="modal-save" onClick={handleInsert} disabled={!canSave}>
              {saving ? t.saving : t.save}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
