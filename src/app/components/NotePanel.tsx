"use client";

import type { NoteName } from "@/core/types";
import { colorForNote } from "@/ui/color";

interface Props {
  rangeNotes: NoteName[];
  allowedNotes: NoteName[] | null;
  onNoteClick: (note: NoteName) => void;
  onClear: () => void;
}

export function NotePanel({ rangeNotes, allowedNotes, onNoteClick, onClear }: Props) {
  return (
    <div className="note-panel">
      <div className="note-panel-header">
        <div>
          <span className="note-panel-title">Active notes</span>
          {allowedNotes === null && (
            <span className="note-panel-hint">Tap to exclude notes</span>
          )}
        </div>
        {allowedNotes !== null && (
          <button className="note-panel-reset" onClick={onClear}>
            Show all
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
              {noteName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
