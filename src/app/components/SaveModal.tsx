"use client";

import { useRef, useState } from "react";
import type { Song } from "@/core/types";
import type { Locale, Translations } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  validateSongMeta,
  songWithinSizeLimit,
  containsSensitiveWord,
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
  existing?: { id: string; title: string; author: string; description?: string | null } | null;
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
  const [description, setDescription] = useState(existing?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a successful new save, show a confirmation telling the child what
  // happened and where the song went, instead of silently closing.
  const [savedAs, setSavedAs] = useState<"draft" | "public" | null>(null);
  // Reflection nudge: when the title/author holds a sensitive (not blocked)
  // word, pause once and ask the child to reconsider before the save runs.
  const [reflecting, setReflecting] = useState(false);
  // The save to run if they proceed past the nudge, and a latch so we only
  // nudge once per name (reset when they edit the title/author).
  const pendingSaveRef = useRef<(() => void) | null>(null);
  const reflectionAckedRef = useRef(false);

  const guard = (): boolean => {
    const meta = validateSongMeta({ title, author, description });
    if (!meta.ok) {
      // Empty/length are gated by the disabled button + maxLength; the
      // meaningful client-side rejection here is the blocked word.
      if (meta.reason === "blocked-word") setError(t.saveErrorBlockedWord);
      if (meta.reason === "description-too-long") setError(t.saveErrorDescriptionTooLong);
      return false;
    }
    if (!songWithinSizeLimit(song)) {
      setError(t.saveErrorTooLarge);
      return false;
    }
    return true;
  };

  // The DB call itself, with no pre-checks — used once the nudge is cleared.
  const execute = async (op: () => Promise<{ error: unknown }>, onSuccess: () => void) => {
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

  const run = (op: () => Promise<{ error: unknown }>, onSuccess: () => void) => {
    if (!guard()) return;
    // Sensitive (not blocked) word → reflection nudge. Blocked words never get
    // here: guard() rejects them first. Stash the save and let the child decide.
    if (
      !reflectionAckedRef.current &&
      (containsSensitiveWord(title) ||
        containsSensitiveWord(author) ||
        containsSensitiveWord(description))
    ) {
      pendingSaveRef.current = () => execute(op, onSuccess);
      setReflecting(true);
      return;
    }
    execute(op, onSuccess);
  };

  // "このままで ほぞん" — proceed with the stashed save; don't nudge again for
  // this name.
  const proceedPastReflection = () => {
    reflectionAckedRef.current = true;
    setReflecting(false);
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    pending?.();
  };

  // "なまえを かえる" — back to the form without saving.
  const cancelReflection = () => {
    pendingSaveRef.current = null;
    setReflecting(false);
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
          description: description.trim() || null,
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
          .update({
            title: title.trim(),
            author: author.trim(),
            description: description.trim() || null,
            song_data: song,
          })
          .eq("id", existing!.id),
      () => {
        onOverwritten?.(title.trim(), author.trim());
        onClose();
      }
    );

  const canSave = !saving && !!title.trim() && !!author.trim();

  // Reflection nudge: a kind, one-question pause before a sensitive name is
  // saved. "Change the name" is the primary (green) action; "save anyway" is
  // the quiet secondary. We never show which word tripped it — the point is to
  // prompt a moment of thought, not to teach the word or play banned-word bingo.
  if (reflecting) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">{t.reflectTitle}</h2>
          <p className="modal-warn">{t.reflectBody}</p>
          <div className="modal-actions">
            <button className="modal-cancel" onClick={proceedPastReflection}>
              {t.reflectSaveAnyway}
            </button>
            <button className="modal-save" onClick={cancelReflection} autoFocus>
              {t.reflectChangeName}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              reflectionAckedRef.current = false; // a new name gets a fresh nudge
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
              reflectionAckedRef.current = false; // a new name gets a fresh nudge
            }}
            maxLength={MAX_AUTHOR_LENGTH}
          />
          {/* Optional. The prompt asks what they worked on rather than what the
              song is, because naming your own intent is the thing being learned
              — a summary of the notes would just restate the grid. */}
          <textarea
            className="modal-input modal-textarea"
            placeholder={t.descriptionPlaceholder}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (error) setError(null);
              reflectionAckedRef.current = false;
            }}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={3}
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
        {/* Teachers can see which account made a song (#117). Say so plainly:
            being watched over is only healthy when it isn't a secret — a hidden
            check would be surveillance, this is the classroom norm. */}
        {userId && <p className="modal-hint">{t.saveVisibleToTeacher}</p>}
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
