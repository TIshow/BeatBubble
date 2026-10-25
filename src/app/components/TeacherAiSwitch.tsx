"use client";

import { useState } from "react";
import type { Translations } from "@/lib/i18n";
import { useAiSettings } from "@/hooks/useAiSettings";

// The one AI switch for the whole school (#151). One switch rather than one
// per class: a class here is only what a child picks on their own profile —
// most haven't, and any child can pick another — so it can't be a boundary a
// teacher manages. Off by default; the daily cap is school-wide too.
export function TeacherAiSwitch({ t }: { t: Translations }) {
  const { friendEnabled, setFriend } = useAiSettings(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = async () => {
    if (friendEnabled === null) return;
    setBusy(true);
    setFailed(false);
    const ok = await setFriend(!friendEnabled);
    setBusy(false);
    if (!ok) setFailed(true);
  };

  return (
    <section className="teacher-ai" aria-labelledby="teacher-ai-title">
      <div className="teacher-folders-head">
        <h2 id="teacher-ai-title" className="teacher-section-title">
          {t.aiFriendTitle}
        </h2>
        {friendEnabled !== null && (
          <>
            <span className={`teacher-folder-badge ${friendEnabled ? "open" : ""}`}>
              {friendEnabled ? t.aiFriendOnBadge : t.aiFriendOffBadge}
            </span>
            <button className="teacher-btn" onClick={toggle} disabled={busy}>
              {friendEnabled ? t.aiFriendTurnOff : t.aiFriendTurnOn}
            </button>
          </>
        )}
      </div>
      <p className="teacher-intro">{t.aiFriendHint}</p>
      {failed && (
        <p className="teacher-folder-error" role="alert">
          {t.folderWriteError}
        </p>
      )}
    </section>
  );
}
