"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSongFeed, type FeedView } from "@/hooks/useSongFeed";
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

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

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
  } = useSongFeed(effectiveView, user, search);

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
