"use client";

import { useState } from "react";
import type { Song } from "@/core/types";
import type { Locale, Translations } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  validateSongMeta,
  songWithinSizeLimit,
} from "@/lib/validation";

// Map a Supabase save error to a message a child can act on. The raw error is
// also logged (see run) so a recurrence can be diagnosed from the console.
// - auth/session (expired JWT, RLS uid mismatch) → tell them to re-login
// - rate limit (429, shared school IP under load) → tell them to wait
// - size check slipping past the client guard → the too-large message
function saveErrorMessage(error: unknown, t: Translations): string {
  const e = (error ?? {}) as { code?: string; message?: string; status?: number };
  const code = e.code ?? "";
  const msg = (e.message ?? "").toLowerCase();
  const status = e.status;
  if (code === "PGRST301" || code === "42501" || msg.includes("jwt") || status === 401 || status === 403) {
    return t.saveErrorAuth;
  }
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
    return t.saveErrorRateLimit;
  }
  if (code === "23514" || msg.includes("song_data")) {
    return t.saveErrorTooLarge;
  }
  return t.saveErrorFailed;
}

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
  // After a successful new save, show a confirmation telling the child what
  // happened and where the song went, instead of silently closing.
  const [savedAs, setSavedAs] = useState<"draft" | "public" | null>(null);

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

  const run = async (op: () => Promise<{ error: unknown }>, onSuccess: () => void) => {
    if (!guard()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await op();
      if (dbError) {
        console.error("[BeatBubble] save failed:", dbError);
        setError(saveErrorMessage(dbError, t));
        return;
      }
      onSuccess();
    } catch (err) {
      console.error("[BeatBubble] save threw:", err);
      setError(saveErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  // New saves pick their visibility explicitly (the child chooses; nothing is
  // decided silently). Anonymous saves are always public — there is no owner
  // to manage a draft.
  const handleInsert = (visibility: "draft" | "public") =>
    run(
      async () =>
        supabase.from("songs").insert({
          title: title.trim(),
          author: author.trim(),
          song_data: song,
          user_id: userId,
          visibility,
        }),
      () => setSavedAs(visibility)
    );

  const handleOverwrite = () =>
    run(
      async () =>
        supabase
          .from("songs")
          .update({ title: title.trim(), author: author.trim(), song_data: song })
          .eq("id", existing!.id),
      () => {
        onOverwritten?.(title.trim(), author.trim());
        onClose();
      }
    );

  const canSave = !saving && !!title.trim() && !!author.trim();

  // Post-save confirmation: say what happened and where the song went.
  if (savedAs) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">
            {savedAs === "draft" ? t.savedDraftMsg : t.savedPublicMsg}
          </h2>
          <div className="modal-actions">
            <button className="modal-save" onClick={onClose} autoFocus>
              {t.close}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {!existing &&
          (userId ? (
            <p className="modal-hint">{t.saveChoiceHint}</p>
          ) : (
            // Not signed in: an anonymous save has no owner, so the child can't
            // delete it later. Warn prominently before they publish.
            <p className="modal-warn">{t.saveAnonWarn}</p>
          ))}
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            {t.cancel}
          </button>
          {existing ? (
            <>
              <button
                className="modal-cancel"
                onClick={() => handleInsert("draft")}
                disabled={!canSave}
              >
                {t.saveAsNew}
              </button>
              <button className="modal-save" onClick={handleOverwrite} disabled={!canSave}>
                {saving ? t.saving : t.overwrite}
              </button>
            </>
          ) : userId ? (
            // Signed in: the child picks the visibility — draft (primary,
            // safe default) or publish right away. Nothing decided silently.
            <>
              <button
                className="modal-cancel"
                onClick={() => handleInsert("public")}
                disabled={!canSave}
              >
                {t.savePublicBtn}
              </button>
              <button
                className="modal-save"
                onClick={() => handleInsert("draft")}
                disabled={!canSave}
              >
                {saving ? t.saving : t.saveDraftBtn}
              </button>
            </>
          ) : (
            <button
              className="modal-save"
              onClick={() => handleInsert("public")}
              disabled={!canSave}
            >
              {saving ? t.saving : t.save}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
