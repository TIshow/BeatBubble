"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTeacherSongs, type TeacherSong } from "@/hooks/useTeacherSongs";
import { useSongAuthors } from "@/hooks/useSongAuthors";
import { accountLineFor, reviewReasonFor } from "@/lib/songAuthor";

type Filter = "all" | "review" | "hidden";

export default function TeacherPage() {
  const { locale, t } = useLocale();
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const isTeacher = !!profile?.isTeacher;

  const { songs, loading, error, setHidden } = useTeacherSongs(isTeacher);
  const authors = useSongAuthors(
    songs.map((s) => s.user_id),
    isTeacher
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const labels = useMemo(
    () => ({
      none: t.authorAccountNone,
      notSet: t.profileNotSet,
      gradeUnit: t.profileGradeUnit,
    }),
    [t]
  );

  const reasonFor = (song: TeacherSong) =>
    reviewReasonFor(song, authors, {
      anonymous: t.teacherReasonAnonymous,
      nameMismatch: t.teacherReasonNameMismatch,
    });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return songs.filter((song) => {
      if (filter === "hidden" && !song.hidden) return false;
      if (filter === "review" && !reasonFor(song)) return false;
      if (filter === "all" && song.hidden) return false; // hidden lives in its own tab
      if (!term) return true;
      const account = song.user_id ? authors.get(song.user_id)?.displayName ?? "" : "";
      return [song.title, song.author, account].some((v) => v.toLowerCase().includes(term));
    });
    // reasonFor depends on `authors`, which is in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, authors, search, filter, t]);

  const reviewCount = useMemo(
    () => songs.filter((s) => !s.hidden && reasonFor(s)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [songs, authors, t]
  );

  const toggleHidden = async (song: TeacherSong) => {
    setBusyId(song.id);
    await setHidden(song.id, !song.hidden);
    setBusyId(null);
  };

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
        <p className="teacher-intro">{t.teacherIntro}</p>

        <div className="teacher-toolbar">
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
                        {reason && <span className="teacher-reason">{reason}</span>}
                      </td>
                      <td>
                        {account?.text ?? "…"}
                        {account?.differs && (
                          <span className="teacher-typed">{t.teacherTypedAs(song.author)}</span>
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
