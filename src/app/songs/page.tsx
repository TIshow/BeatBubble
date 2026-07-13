"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AccountMenu } from "@/app/components/AccountMenu";
import { ProfileModal } from "@/app/components/ProfileModal";
import { SongCard } from "@/app/components/SongCard";
import type { Song } from "@/core/types";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

type FeedSong = {
  id: string;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  song_data: Song;
  user_id: string | null;
  is_template: boolean;
};

type View = "all" | "mine" | "templates";

// How many songs to fetch per page. The feed loads more as you scroll.
const PAGE_SIZE = 24;

const SONG_COLUMNS = "id, title, author, created_at, updated_at, song_data, user_id, is_template";

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
  const [songs, setSongs] = useState<FeedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [view, setView] = useState<View>("all");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Ref (not state) so overlapping triggers — the scroll observer and the
  // button firing together — can't start two fetches for the same page.
  const loadingMoreRef = useRef(false);

  // Identity line for the account menu, from whatever profile fields are set.
  const profileSubtitle = [
    profile?.school,
    profile?.grade != null ? t.profileGradeUnit(profile.grade) : null,
    profile?.className,
  ]
    .filter(Boolean)
    .join("・");

  // "mine" needs sign-in; "all" and "templates" are open to everyone.
  const effectiveView: View = !user && view === "mine" ? "all" : view;

  // One page of the current view, ordered newest-first. `count: "exact"` on
  // every request keeps the total in sync as songs are added/removed.
  const fetchPage = useCallback(
    (from: number) => {
      let query = supabase.from("songs").select(SONG_COLUMNS, { count: "exact" });
      if (effectiveView === "mine" && user) query = query.eq("user_id", user.id);
      else if (effectiveView === "templates") query = query.eq("is_template", true);
      else query = query.eq("is_template", false); // "all" excludes templates
      return query.order("updated_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    },
    [effectiveView, user]
  );

  // Initial load, and reset whenever the view (or sign-in state) changes.
  useEffect(() => {
    let active = true;
    async function loadFirstPage() {
      setLoading(true);
      setSongs([]);
      setHasMore(false);
      pageRef.current = 0;
      loadingMoreRef.current = false;
      const { data, count } = await fetchPage(0);
      if (!active) return;
      const rows = (data as FeedSong[]) ?? [];
      setSongs(rows);
      setTotal(count ?? rows.length);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    }
    loadFirstPage();
    return () => {
      active = false;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const { data, count } = await fetchPage(nextPage * PAGE_SIZE);
      const rows = (data as FeedSong[]) ?? [];
      pageRef.current = nextPage;
      // De-dupe by id in case a song was inserted between page fetches.
      setSongs((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      if (count != null) setTotal(count);
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore]);

  // Infinite scroll: pull the next page as the sentinel nears the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Client-side filter keeps the view correct instantly while a refetch lands.
  const displayed =
    effectiveView === "mine" && user
      ? songs.filter((s) => s.user_id === user.id)
      : effectiveView === "templates"
        ? songs.filter((s) => s.is_template)
        : songs.filter((s) => !s.is_template);

  const handleDeleted = useCallback((id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleRenamed = useCallback((id: string, title: string) => {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  }, []);

  const handleTemplateToggled = useCallback((id: string, isTemplate: boolean) => {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, is_template: isTemplate } : s)));
  }, []);

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
          {!loading && total != null && displayed.length > 0 && (
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
        ) : displayed.length === 0 ? (
          <p className="songs-status">
            {effectiveView === "mine"
              ? t.noMySongs
              : effectiveView === "templates"
                ? t.noTemplates
                : t.noSongs}
          </p>
        ) : (
          <>
            <div className="songs-grid">
              {displayed.map((song, i) => (
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
                  onDeleted={handleDeleted}
                  onRenamed={handleRenamed}
                  onTemplateToggled={handleTemplateToggled}
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
