"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { AuthButton } from "@/app/components/AuthButton";
import { SongCard } from "@/app/components/SongCard";
import type { Song } from "@/core/types";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

type FeedSong = {
  id: string;
  title: string;
  author: string;
  created_at: string;
  song_data: Song;
  user_id: string | null;
  is_template: boolean;
};

type View = "all" | "mine" | "templates";

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
  const { locale, t, toggleLocale } = useLocale();
  const { user, signInWithGoogle, signOut } = useAuth();
  const [songs, setSongs] = useState<FeedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("all");

  // "mine" needs sign-in; "all" and "templates" are open to everyone.
  const effectiveView: View = !user && view === "mine" ? "all" : view;

  useEffect(() => {
    let query = supabase
      .from("songs")
      .select("id, title, author, created_at, song_data, user_id, is_template");
    if (effectiveView === "mine" && user) query = query.eq("user_id", user.id);
    else if (effectiveView === "templates") query = query.eq("is_template", true);
    else query = query.eq("is_template", false); // "all" excludes templates
    query
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSongs((data as FeedSong[]) ?? []);
        setLoading(false);
      });
  }, [effectiveView, user]);

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
        <button className="locale-toggle" onClick={toggleLocale}>
          {t.switchLocale}
        </button>
        <AuthButton user={user} t={t} onSignIn={signInWithGoogle} onSignOut={signOut} />
      </header>

      <main className="songs-main">
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

        {loading ? (
          <p className="songs-status">{t.loading}</p>
        ) : displayed.length === 0 ? (
          <p className="songs-status">
            {effectiveView === "mine"
              ? t.noMySongs
              : effectiveView === "templates"
                ? t.noTemplates
                : t.noSongs}
          </p>
        ) : (
          <div className="songs-grid">
            {displayed.map((song, i) => (
              <SongCard
                key={song.id}
                id={song.id}
                title={song.title}
                author={song.author}
                time={timeAgo(song.created_at, locale)}
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
        )}
      </main>
    </div>
  );
}
