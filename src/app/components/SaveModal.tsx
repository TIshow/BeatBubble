"use client";

import { useState } from "react";
import type { Song } from "@/core/types";
import { supabase } from "@/lib/supabase";

interface Props {
  song: Song;
  onClose: () => void;
}

export function SaveModal({ song, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !author.trim()) return;
    setSaving(true);
    try {
      await supabase.from("songs").insert({
        title: title.trim(),
        author: author.trim(),
        song_data: song,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Save Song</h2>
        <div className="modal-fields">
          <input
            className="modal-input"
            placeholder="Song title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            autoFocus
          />
          <input
            className="modal-input"
            placeholder="Your name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-save"
            onClick={handleSave}
            disabled={saving || !title.trim() || !author.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
