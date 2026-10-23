"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { useAccount } from "@/app/components/AccountProvider";
import { useSongFeed, type FeedView } from "@/hooks/useSongFeed";
import { useSongFilters } from "@/hooks/useSongFilters";
import { useFolderShortcuts } from "@/hooks/useFolders";
import { AccountMenu } from "@/app/components/AccountMenu";
import { SongGrid } from "@/app/components/SongGrid";

export default function SongsPage() {
  const { locale, t } = useLocale();
  const { user, isTeacher, profile } = useAccount();
  const folders = useFolderShortcuts({
    isTeacher,
    grade: profile?.grade ?? null,
    className: profile?.className ?? null,
  });
  const [view, setView] = useState<FeedView>("all");

  const {
    filters,
    searchInput,
    setSearchInput,
    grade,
    selectGrade,
    className,
    setClassName,
    grades,
    classNames,
    hasClassFilters,
  } = useSongFilters();


  // "mine" needs sign-in; "all" and "templates" are open to everyone.
  const effectiveView: FeedView = !user && view === "mine" ? "all" : view;

  const feed = useSongFeed(effectiveView, user, filters);
  const { songs, total, loading } = feed;

  return (
    <div className="songs-page">
      <header className="songs-header">
        {/* つくる means "make a new song": ?new=1 tells the editor to start
            from a plain sheet instead of restoring the previous work.
            Browser back / reload carry no ?new, so accidental navigation
            still restores the in-progress song (#78). */}
        <Link href="/?new=1" className="songs-back-btn">
          {t.backToCreate}
        </Link>
        <h1 className="songs-heading">{t.pageTitle}</h1>
        <AccountMenu />
      </header>

      <main className="songs-main">
        <div className="songs-search-wrap">
          <span className="songs-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="songs-search"
            placeholder={t.searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label={t.searchPlaceholder}
          />
          {searchInput && (
            <button
              className="songs-search-clear"
              onClick={() => setSearchInput("")}
              aria-label={t.searchClear}
            >
              ×
            </button>
          )}
        </div>

        {/* Lesson folders for this child's class (#143). Only rendered when
            there are some, so nothing changes for a class without folders. */}
        {folders.length > 0 && (
          <nav className="songs-folders" aria-label={t.folderShortcutsLabel}>
            <span className="songs-folders-label">{t.folderShortcutsLabel}</span>
            <div className="songs-folders-row">
              {folders.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/songs/folders/${folder.id}`}
                  className={`songs-folder-chip ${folder.archived ? "closed" : ""}`}
                  prefetch={false}
                >
                  📁 {folder.name}
                  {folder.archived && (
                    // Said in words, not only by dimming the chip.
                    <span className="songs-folder-chip-note">{t.folderClosedChip}</span>
                  )}
                  {isTeacher && (
                    <span className="songs-folder-chip-note">
                      {t.folderTarget(folder.grade, folder.class_name)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
        )}

        <div className="songs-toolbar">
          <div className="songs-tabs">
            <button
              className={`songs-tab ${effectiveView === "all" ? "active" : ""}`}
              onClick={() => setView("all")}
            >
              {t.feedAll}
            </button>
            <button
              className={`songs-tab ${effectiveView === "templates" ? "active" : ""}`}
              onClick={() => setView("templates")}
            >
              {t.feedTemplates}
            </button>
            {user && (
              <button
                className={`songs-tab ${effectiveView === "mine" ? "active" : ""}`}
                onClick={() => setView("mine")}
              >
                {t.feedMine}
              </button>
            )}
          </div>

          {hasClassFilters && (
            <div className="songs-filters">
              {grades.length > 0 && (
                <select
                  className="songs-filter-select"
                  value={grade ?? ""}
                  onChange={(e) => selectGrade(e.target.value === "" ? null : Number(e.target.value))}
                  aria-label={t.profileGrade}
                >
                  <option value="">{t.filterGradeAll}</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {t.profileGradeUnit(g)}
                    </option>
                  ))}
                </select>
              )}
              {classNames.length > 0 && (
                <select
                  className="songs-filter-select"
                  value={className ?? ""}
                  onChange={(e) => setClassName(e.target.value === "" ? null : e.target.value)}
                  aria-label={t.profileClass}
                >
                  <option value="">{t.filterClassAll}</option>
                  {classNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!loading && total != null && songs.length > 0 && (
            <span className="songs-count">{t.songsCount(total)}</span>
          )}
        </div>

        <SongGrid
          feed={feed}
          emptyText={
            filters.search
              ? t.noResults
              : effectiveView === "mine"
                ? t.noMySongs
                : effectiveView === "templates"
                  ? t.noTemplates
                  : t.noSongs
          }
          user={user}
          isTeacher={isTeacher}
          folders={folders}
          locale={locale}
          t={t}
        />
      </main>
    </div>
  );
}
