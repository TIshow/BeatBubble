"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/hooks/useLocale";
import { useAuth, authDisplayName } from "@/hooks/useAuth";
import type { Song } from "@/core/types";
import type { Locale } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

type FeedSong = {
  id: string;
  title: string;
  author: string;
  created_at: string;
  song_data: Song;
};

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

  useEffect(() => {
    supabase
      .from("songs")
      .select("id, title, author, created_at, song_data")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSongs((data as FeedSong[]) ?? []);
        setLoading(false);
      });
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
        {authDisplayName(user) ? (
          <button className="auth-btn" onClick={signOut} title={authDisplayName(user)}>
            {t.logout}
          </button>
        ) : (
          <button className="auth-btn" onClick={signInWithGoogle}>
            {t.login}
          </button>
        )}
      </header>

      <main className="songs-main">
        {loading ? (
          <p className="songs-status">{t.loading}</p>
        ) : songs.length === 0 ? (
          <p className="songs-status">{t.noSongs}</p>
        ) : (
          <div className="songs-grid">
            {songs.map((song, i) => (
              <div key={song.id} className="song-card">
                <div
                  className="song-card-art"
                  style={{ background: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}
                />
                <div className="song-card-body">
                  <p className="song-card-title">{song.title}</p>
                  <p className="song-card-author">{song.author}</p>
                  <p className="song-card-time">{timeAgo(song.created_at, locale)}</p>
                  <Link href={`/?load=${song.id}`} className="song-card-play">
                    {t.playBtn}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
