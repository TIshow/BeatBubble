"use client";

import type { NoteName } from "@/core/types";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { colorForNote } from "@/ui/color";
import { noteLabel } from "@/ui/noteLabel";

interface Props {
  rangeNotes: NoteName[];
  allowedNotes: NoteName[] | null;
  locale: Locale;
  onNoteClick: (note: NoteName) => void;
  onClear: () => void;
}

export function NotePanel({ rangeNotes, allowedNotes, locale, onNoteClick, onClear }: Props) {
  const t = translations[locale];

  return (
    <div className="note-panel">
      <div className="note-panel-header">
        <div>
          <span className="note-panel-title">{t.activeNotes}</span>
          {allowedNotes === null && (
            <span className="note-panel-hint">{t.tapToExclude}</span>
          )}
        </div>
        {allowedNotes !== null && (
          <button className="note-panel-reset" onClick={onClear}>
            {t.showAll}
          </button>
        )}
      </div>
      <div className="note-panel-chips">
        {rangeNotes.map((noteName) => {
          const isActive = allowedNotes === null || allowedNotes.includes(noteName);
          return (
            <button
              key={noteName}
              className={`note-chip ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? { backgroundColor: colorForNote(noteName) }
                  : { borderColor: colorForNote(noteName), color: colorForNote(noteName) }
              }
              onClick={() => onNoteClick(noteName)}
            >
              {noteLabel(noteName, locale)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
