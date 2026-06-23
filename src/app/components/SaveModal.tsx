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
  onClose: () => void;
}

export function SaveModal({ song, locale, userId, defaultAuthor = "", onClose }: Props) {
  const t = translations[locale];
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const meta = validateSongMeta({ title, author });
    if (!meta.ok) {
      // Empty/length issues are already gated by the disabled button + maxLength;
      // the meaningful client-side rejection here is the blocked word.
      if (meta.reason === "blocked-word") setError(t.saveErrorBlockedWord);
      return;
    }
    if (!songWithinSizeLimit(song)) {
      setError(t.saveErrorTooLarge);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase.from("songs").insert({
        title: title.trim(),
        author: author.trim(),
        song_data: song,
        user_id: userId,
      });
      if (dbError) {
        setError(t.saveErrorFailed);
        return;
      }
      onClose();
    } catch {
      setError(t.saveErrorFailed);
    } finally {
      setSaving(false);
    }
  };

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
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="modal-save"
            onClick={handleSave}
            disabled={saving || !title.trim() || !author.trim()}
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
