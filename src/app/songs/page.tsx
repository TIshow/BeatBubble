"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  useSongFeed,
  fetchClassOptions,
  type FeedView,
  type ClassOption,
} from "@/hooks/useSongFeed";
import { AccountMenu } from "@/app/components/AccountMenu";
import { ProfileModal } from "@/app/components/ProfileModal";
import { SongCard } from "@/app/components/SongCard";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #ff6b6b, #feca57)",
  "linear-gradient(135deg, #48dbfb, #a29bfe)",
  "linear-gradient(135deg, #ff9ff3, #54a0ff)",
  "linear-gradient(135deg, #00d2d3, #ff9f43)",
  "linear-gradient(135deg, #5f27cd, #ff6b6b)",
  "linear-gradient(135deg, #feca57, #48dbfb)",
];

function timeAgo(dateStr: string, locale: Locale): string {
  const t = translations[locale];
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return t.justNow;
  const min = Math.floor(sec / 60);
  if (min < 60) return t.minutesAgo(min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return t.hoursAgo(hr);
  return t.daysAgo(Math.floor(hr / 24));
}

export default function SongsPage() {
  const { locale, t, changeLocale } = useLocale();
  const { user, signInWithGoogle, signOut } = useAuth();
  const { profile, saveProfile } = useProfile(user);
  const [view, setView] = useState<FeedView>("all");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // `searchInput` tracks the field; `search` is the debounced value that
  // actually drives the query, so we don't hit the DB on every keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    fetchClassOptions().then((opts) => {
      if (active) setClassOptions(opts);
    });
    return () => {
      active = false;
    };
  }, []);

  // Distinct grades, and the classes available for the selected grade.
  const grades = [...new Set(classOptions.map((o) => o.grade).filter((g): g is number => g != null))];
  const classNames = [
    ...new Set(
      classOptions
        .filter((o) => grade == null || o.grade === grade)
        .map((o) => o.className)
        .filter((c): c is string => c != null)
    ),
  ];
  const hasClassFilters = grades.length > 0 || classNames.length > 0;

  // "mine" needs sign-in; "all" and "templates" are open to everyone.
  const effectiveView: FeedView = !user && view === "mine" ? "all" : view;

  const {
    songs,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    sentinelRef,
    removeSong,
    renameSong,
    setSongTemplate,
  } = useSongFeed(effectiveView, user, { search, grade, className });

  // Identity line for the account menu, from whatever profile fields are set.
  const profileSubtitle = [
    profile?.school,
    profile?.grade != null ? t.profileGradeUnit(profile.grade) : null,
    profile?.className,
  ]
    .filter(Boolean)
    .join("・");

  return (
    <div className="songs-page">
      <header className="songs-header">
        <Link href="/" className="songs-back-btn">
          {t.backToCreate}
        </Link>
        <h1 className="songs-heading">{t.pageTitle}</h1>
        <AccountMenu
          user={user}
          t={t}
          locale={locale}
          displayName={profile?.displayName}
          subtitle={profileSubtitle || null}
          onSetLocale={changeLocale}
          onSignIn={signInWithGoogle}
          onSignOut={signOut}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      </header>

      {isProfileModalOpen && user && (
        <ProfileModal
          t={t}
          profile={profile}
          onSave={saveProfile}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

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
                  onChange={(e) => {
                    setGrade(e.target.value === "" ? null : Number(e.target.value));
                    setClassName(null); // classes depend on grade
                  }}
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

        {loading ? (
          <div className="songs-grid" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="song-card-skeleton" aria-hidden="true">
                <div className="song-card-skeleton-art" />
                <div className="song-card-skeleton-body">
                  <div className="song-card-skeleton-line wide" />
                  <div className="song-card-skeleton-line" />
                  <div className="song-card-skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <p className="songs-status">
            {search
              ? t.noResults
              : effectiveView === "mine"
                ? t.noMySongs
                : effectiveView === "templates"
                  ? t.noTemplates
                  : t.noSongs}
          </p>
        ) : (
          <>
            <div className="songs-grid">
              {songs.map((song, i) => (
                <SongCard
                  key={song.id}
                  id={song.id}
                  title={song.title}
                  author={song.author}
                  time={timeAgo(song.updated_at, locale)}
                  gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
                  isOwner={!!user && song.user_id === user.id}
                  isTemplate={song.is_template}
                  t={t}
                  onDeleted={removeSong}
                  onRenamed={renameSong}
                  onTemplateToggled={setSongTemplate}
                />
              ))}
            </div>
            {hasMore && <div ref={sentinelRef} className="songs-sentinel" aria-hidden="true" />}
            {hasMore &&
              (loadingMore ? (
                <p className="songs-more-status">{t.loadingMore}</p>
              ) : (
                // Auto-loads on scroll via the observer; this button is a
                // reliable fallback for environments where it doesn't fire.
                <div className="songs-more-wrap">
                  <button className="songs-more-btn" onClick={loadMore}>
                    {t.showMore}
                  </button>
                </div>
              ))}
          </>
        )}
      </main>
    </div>
  );
}
