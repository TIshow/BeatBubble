"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Song } from "@/core/types";

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

function timeAgo(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "たったいま";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分まえ`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間まえ`;
  return `${Math.floor(hr / 24)}日まえ`;
}

export default function SongsPage() {
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
          ← つくる
        </Link>
        <h1 className="songs-heading">みんなの曲</h1>
      </header>

      <main className="songs-main">
        {loading ? (
          <p className="songs-status">よみこみちゅう...</p>
        ) : songs.length === 0 ? (
          <p className="songs-status">まだ曲がありません。さいしょに保存してみよう！</p>
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
                  <p className="song-card-time">{timeAgo(song.created_at)}</p>
                  <Link href={`/?load=${song.id}`} className="song-card-play">
                    あそぶ
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
