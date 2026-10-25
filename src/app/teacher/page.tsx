"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { useAccount } from "@/app/components/AccountProvider";
import { useTeacherSongs, type TeacherSong } from "@/hooks/useTeacherSongs";
import { useProfileDirectory } from "@/hooks/useProfileDirectory";
import { useUserEmails } from "@/hooks/useUserEmails";
import { accountLineFor, reviewReasonFor } from "@/lib/songAuthor";
import { TeacherFolders } from "@/app/components/TeacherFolders";
import { TeacherAiSwitch } from "@/app/components/TeacherAiSwitch";
import { useTeacherFolders } from "@/hooks/useTeacherFolders";
import { byOpenThenNewest } from "@/lib/folders";

type Filter = "all" | "review" | "hidden";

export default function TeacherPage() {
  const { locale, t } = useLocale();
  const { user, isTeacher, profileLoading } = useAccount();

  const { songs, loading, error, setHidden } = useTeacherSongs(isTeacher);
  const authors = useProfileDirectory(isTeacher);
  const folderState = useTeacherFolders(isTeacher);

  // On by default: staff identify pupils by their school address, which is why
  // this was asked for. The toggle exists because this page can end up on the
  // classroom projector, and 300 children's addresses should not.
  const [showEmails, setShowEmails] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Lesson folder filter (#143). Applied only while that folder still exists,
  // so removing the folder being viewed doesn't leave an empty table behind.
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const folderById = useMemo(
    () => new Map(folderState.folders.map((f) => [f.id, f])),
    [folderState.folders]
  );
  const sortedFolders = useMemo(
    () => [...folderState.folders].sort(byOpenThenNewest),
    [folderState.folders]
  );
  const activeFolder = folderFilter && folderById.has(folderFilter) ? folderFilter : null;

  // What was handed in to each folder, as the "all" tab would show it: unlisted
  // included (a submission for the teacher only), hidden songs left out.
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const song of songs) {
      if (song.folder_id && !song.hidden) {
        counts.set(song.folder_id, (counts.get(song.folder_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [songs]);

  // From a folder's "N songs": show exactly what was handed in, so clear the
  // other narrowing too, and bring the table into view below the folders.
  const showFolderSongs = (folderId: string) => {
    setFolderFilter(folderId);
    setFilter("all");
    setSearch("");
    document.getElementById("teacher-songs")?.scrollIntoView({ block: "start" });
  };

  // Nothing is requested while the column is hidden.
  const emails = useUserEmails(
    songs.map((s) => s.user_id),
    isTeacher && showEmails
  );

  const labels = useMemo(
    () => ({
      none: t.authorAccountNone,
      notSet: t.profileNotSet,
      gradeUnit: t.profileGradeUnit,
    }),
    [t]
  );

  // useCallback so the memos below can depend on it honestly, instead of
  // listing its captures by hand and silencing the lint rule.
  const reasonFor = useCallback(
    (song: TeacherSong) =>
      reviewReasonFor(song, authors, {
        anonymous: t.teacherReasonAnonymous,
        nameMismatch: t.teacherReasonNameMismatch,
      }),
    [authors, t]
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return songs.filter((song) => {
      if (activeFolder && song.folder_id !== activeFolder) return false;
      if (filter === "hidden" && !song.hidden) return false;
      if (filter === "review" && !reasonFor(song)) return false;
      if (filter === "all" && song.hidden) return false; // hidden lives in its own tab
      if (!term) return true;
      const account = song.user_id ? authors.get(song.user_id)?.displayName ?? "" : "";
      const email = song.user_id ? emails.get(song.user_id) ?? "" : "";
      return [song.title, song.author, account, email].some((v) =>
        v.toLowerCase().includes(term)
      );
    });
  }, [songs, authors, emails, search, filter, reasonFor, activeFolder]);

  const reviewCount = useMemo(
    () => songs.filter((s) => !s.hidden && reasonFor(s)).length,
    [songs, reasonFor]
  );

  const toggleHidden = async (song: TeacherSong) => {
    setBusyId(song.id);
    await setHidden(song.id, !song.hidden);
    setBusyId(null);
  };

  if (user && profileLoading) {
    // Don't show the no-access view before we know: a teacher opening this page
    // would otherwise read the flash as "I'm not allowed in".
    return (
      <div className="songs-page">
        <header className="songs-header">
          <Link href="/" className="songs-back-btn">
            {t.backToCreate}
          </Link>
          <h1 className="songs-heading">{t.teacherTitle}</h1>
        </header>
        <main className="teacher-main">
          <p className="teacher-empty">{t.loading}</p>
        </main>
      </div>
    );
  }

  if (!user || !isTeacher) {
    // Not an access control boundary — RLS is. This just avoids showing an
    // empty table to a child who found the URL.
    return (
      <div className="songs-page">
        <header className="songs-header">
          <Link href="/" className="songs-back-btn">
            {t.backToCreate}
          </Link>
          <h1 className="songs-heading">{t.teacherTitle}</h1>
        </header>
        <main className="teacher-main">
          <p className="teacher-empty">{t.teacherEmpty}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="songs-page">
      <header className="songs-header">
        <Link href="/" className="songs-back-btn">
          {t.backToCreate}
        </Link>
        <h1 className="songs-heading">{t.teacherTitle}</h1>
        <Link href="/songs" className="songs-back-btn">
          {t.songsLink}
        </Link>
      </header>

      <main className="teacher-main">
        {/* Above the song table, which runs to hundreds of rows: below it, making
            a folder would mean scrolling past every song first. */}
        <TeacherAiSwitch t={t} />

        <TeacherFolders
          t={t}
          state={folderState}
          counts={folderCounts}
          onShowSongs={showFolderSongs}
        />

        <p className="teacher-intro">
          {t.teacherIntro}
          {!showEmails && <> {t.teacherEmailsHiddenNote}</>}
        </p>

        <div className="teacher-toolbar" id="teacher-songs">
          <input
            className="teacher-search"
            placeholder={t.teacherSearch}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="teacher-tabs">
            {(["all", "review", "hidden"] as Filter[]).map((f) => (
              <button
                key={f}
                className={`teacher-tab ${filter === f ? "active" : ""} ${
                  f === "review" && reviewCount > 0 ? "flag" : ""
                }`}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
              >
                {f === "all"
                  ? t.teacherFilterAll
                  : f === "review"
                    ? `${t.teacherFilterReview}${reviewCount > 0 ? ` (${reviewCount})` : ""}`
                    : t.teacherFilterHidden}
              </button>
            ))}
          </div>
          {sortedFolders.length > 0 && (
            <select
              className={`teacher-folder-filter ${activeFolder ? "active" : ""}`}
              value={activeFolder ?? ""}
              onChange={(e) => setFolderFilter(e.target.value || null)}
              aria-label={t.teacherFolderFilterLabel}
            >
              <option value="">{t.teacherFolderFilterAll}</option>
              {sortedFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}（{t.folderTarget(f.grade, f.class_name)}）
                </option>
              ))}
            </select>
          )}
          <button
            className={`teacher-tab ${showEmails ? "" : "active"}`}
            onClick={() => setShowEmails((v) => !v)}
            aria-pressed={!showEmails}
          >
            {showEmails ? t.teacherHideEmails : t.teacherShowEmails}
          </button>
          <span className="teacher-count">{t.teacherSongCount(rows.length)}</span>
        </div>

        {error ? (
          <p className="teacher-empty">{t.teacherLoadError}</p>
        ) : loading ? (
          <p className="teacher-empty">{t.loading}</p>
        ) : rows.length === 0 ? (
          <p className="teacher-empty">{t.teacherEmpty}</p>
        ) : (
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>{t.teacherColTitle}</th>
                  <th>{t.teacherColAccount}</th>
                  <th>{t.teacherColClass}</th>
                  <th>{t.teacherColUpdated}</th>
                  <th>{t.teacherColActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((song) => {
                  const reason = reasonFor(song);
                  const account = accountLineFor(song, authors, labels);
                  return (
                    <tr key={song.id} className={reason ? "flagged" : ""}>
                      <td>
                        <span className="teacher-song-title">{song.title}</span>
                        {song.hidden && (
                          <span className="teacher-hidden-badge">{t.teacherHiddenBadge}</span>
                        )}
                        {/* Unlisted is how a child hands something in for the
                            teacher only; worth seeing at a glance here. */}
                        {song.visibility === "unlisted" && (
                          <span className="teacher-hidden-badge">{t.visUnlisted}</span>
                        )}
                        {song.folder_id && folderById.has(song.folder_id) && (
                          <span className="teacher-song-folder">
                            📁 {folderById.get(song.folder_id)!.name}
                          </span>
                        )}
                        {reason && <span className="teacher-reason">{reason}</span>}
                      </td>
                      <td>
                        {account?.text ?? "…"}
                        {account?.differs && (
                          <span className="teacher-typed">{t.teacherTypedAs(song.author)}</span>
                        )}
                        {showEmails && song.user_id && (
                          <span className="teacher-email">{emails.get(song.user_id) ?? "…"}</span>
                        )}
                      </td>
                      <td>
                        {[
                          song.grade != null ? t.profileGradeUnit(song.grade) : null,
                          song.class_name,
                        ]
                          .filter(Boolean)
                          .join("") || "—"}
                      </td>
                      <td>{new Date(song.updated_at).toLocaleDateString(locale)}</td>
                      <td className="teacher-actions">
                        <Link href={`/?load=${song.id}`} className="teacher-btn" prefetch={false}>
                          {t.teacherOpen}
                        </Link>
                        <button
                          className={`teacher-btn ${song.hidden ? "" : "danger"}`}
                          onClick={() => toggleHidden(song)}
                          disabled={busyId === song.id}
                        >
                          {song.hidden ? t.teacherUnhide : t.teacherHide}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
