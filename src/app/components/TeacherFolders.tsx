"use client";

import { useMemo, useState } from "react";
import type { Translations } from "@/lib/i18n";
import { CLASS_OPTIONS, GRADES } from "@/lib/classes";
import { useTeacherFolders } from "@/hooks/useTeacherFolders";

// Same limits as the database (migration 0016). The inputs enforce them, so a
// create can't fail on length.
const MAX_NAME = 40;
const MAX_PROMPT = 200;

// The teacher's half of lesson folders (#143): make one per lesson, close it
// when the lesson is over, remove one made by mistake. What children see of a
// folder comes in later steps; nothing here changes their screens.
export function TeacherFolders({ t }: { t: Translations }) {
  const { folders, loading, error, create, setArchived, remove } = useTeacherFolders();

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  // "" is the whole grade, which the database stores as a null class.
  const [className, setClassName] = useState("");
  // Which folder (or "new") has a write in flight, so only its buttons disable.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [writeFailed, setWriteFailed] = useState(false);

  // Open folders first — those are the ones a teacher acts on — newest first.
  const sorted = useMemo(
    () =>
      [...folders].sort(
        (a, b) =>
          Number(a.archived) - Number(b.archived) || b.created_at.localeCompare(a.created_at)
      ),
    [folders]
  );

  const closeForm = () => {
    setFormOpen(false);
    setName("");
    setPrompt("");
    setGrade(null);
    setClassName("");
  };

  // Every write here is the same shape: disable its buttons while in flight,
  // and say so if it didn't happen.
  const run = async (id: string, write: () => Promise<boolean>): Promise<boolean> => {
    setBusyId(id);
    setWriteFailed(false);
    const ok = await write();
    setBusyId(null);
    if (!ok) setWriteFailed(true);
    return ok;
  };

  const canCreate = name.trim() !== "" && grade !== null && busyId === null;

  const submit = async () => {
    if (!canCreate || grade === null) return;
    const ok = await run("new", () =>
      create({
        name: name.trim(),
        prompt: prompt.trim() || null,
        grade,
        className: className || null,
      })
    );
    if (ok) closeForm();
  };

  return (
    <section className="teacher-folders" aria-labelledby="teacher-folders-title">
      <div className="teacher-folders-head">
        <h2 id="teacher-folders-title" className="teacher-section-title">
          {t.folderSectionTitle}
        </h2>
        {!formOpen && (
          <button className="teacher-btn" onClick={() => setFormOpen(true)}>
            {t.folderNew}
          </button>
        )}
      </div>
      <p className="teacher-intro">{t.folderSectionIntro}</p>

      {formOpen && (
        <div className="teacher-folder-form">
          <label className="teacher-field">
            <span>{t.folderNameLabel}</span>
            <input
              className="teacher-input"
              value={name}
              maxLength={MAX_NAME}
              placeholder={t.folderNamePlaceholder}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="teacher-field">
            <span>{t.folderPromptLabel}</span>
            <textarea
              className="teacher-input"
              value={prompt}
              maxLength={MAX_PROMPT}
              placeholder={t.folderPromptPlaceholder}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
            />
          </label>
          <div className="teacher-field-row">
            <label className="teacher-field">
              <span>{t.folderGradeLabel}</span>
              <select
                className="teacher-input"
                value={grade ?? ""}
                onChange={(e) => setGrade(e.target.value === "" ? null : Number(e.target.value))}
              >
                <option value="">{t.profileNotSet}</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {t.profileGradeUnit(g)}
                  </option>
                ))}
              </select>
            </label>
            <label className="teacher-field">
              <span>{t.folderClassLabel}</span>
              <select
                className="teacher-input"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              >
                <option value="">{t.folderWholeGrade}</option>
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="teacher-folder-form-actions">
            <button className="teacher-btn primary" onClick={submit} disabled={!canCreate}>
              {t.folderCreate}
            </button>
            <button className="teacher-btn" onClick={closeForm} disabled={busyId === "new"}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {writeFailed && (
        <p className="teacher-folder-error" role="alert">
          {t.folderWriteError}
        </p>
      )}

      {error ? (
        <p className="teacher-empty">{t.folderLoadError}</p>
      ) : loading ? (
        <p className="teacher-empty">{t.loading}</p>
      ) : sorted.length === 0 ? (
        <p className="teacher-empty">{t.folderEmpty}</p>
      ) : (
        <ul className="teacher-folder-list">
          {sorted.map((folder) => (
            <li key={folder.id} className={`teacher-folder ${folder.archived ? "archived" : ""}`}>
              <div className="teacher-folder-body">
                <span className="teacher-folder-name">{folder.name}</span>
                <span className={`teacher-folder-badge ${folder.archived ? "" : "open"}`}>
                  {folder.archived ? t.folderClosedBadge : t.folderOpenBadge}
                </span>
                <span className="teacher-folder-target">
                  {t.folderTarget(folder.grade, folder.class_name)}
                </span>
                {folder.prompt && <span className="teacher-folder-prompt">{folder.prompt}</span>}
              </div>

              {confirmDeleteId === folder.id ? (
                // Two steps, because the children's work drops out of the folder.
                // The confirm says the work itself survives — the worry a teacher
                // would otherwise have about pressing it.
                <div className="teacher-folder-confirm">
                  <span>{t.folderDeleteConfirm(folder.name)}</span>
                  <button
                    className="teacher-btn danger"
                    onClick={async () => {
                      if (await run(folder.id, () => remove(folder.id))) setConfirmDeleteId(null);
                    }}
                    disabled={busyId === folder.id}
                  >
                    {t.folderDelete}
                  </button>
                  <button
                    className="teacher-btn"
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={busyId === folder.id}
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <div className="teacher-actions">
                  <button
                    className="teacher-btn"
                    onClick={() => run(folder.id, () => setArchived(folder.id, !folder.archived))}
                    disabled={busyId === folder.id}
                  >
                    {folder.archived ? t.folderReopen : t.folderArchive}
                  </button>
                  <button
                    className="teacher-btn danger"
                    onClick={() => setConfirmDeleteId(folder.id)}
                    disabled={busyId === folder.id}
                  >
                    {t.folderDelete}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
