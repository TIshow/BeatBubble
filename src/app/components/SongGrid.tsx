"use client";

import type { User } from "@supabase/supabase-js";
import type { SongFeed } from "@/hooks/useSongFeed";
import { SongCard } from "@/app/components/SongCard";
import type { SongFolder } from "@/lib/folders";
import type { Locale, Translations } from "@/lib/i18n";
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

interface Props {
  feed: SongFeed;
  // What to say when the feed is empty — it depends on what the page is showing.
  emptyText: string;
  user: User | null;
  isTeacher: boolean;
  // The viewer's lesson folders, for submitting from a card's menu (#143).
  folders: SongFolder[];
  locale: Locale;
  t: Translations;
}

// The card grid with its loading skeleton, empty state and infinite scroll.
// Shared by the feed (/songs) and a lesson folder (/songs/folders/[id]), so
// the two can't drift in how a song card behaves.
export function SongGrid({ feed, emptyText, user, isTeacher, folders, locale, t }: Props) {
  const { songs, loading, loadingMore, hasMore, loadMore, sentinelRef } = feed;

  if (loading) {
    return (
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
    );
  }

  if (songs.length === 0) {
    return <p className="songs-status">{emptyText}</p>;
  }

  return (
    <>
      <div className="songs-grid">
        {songs.map((song, i) => (
          <SongCard
            key={song.id}
            id={song.id}
            title={song.title}
            author={song.author}
            description={song.description}
            time={timeAgo(song.updated_at, locale)}
            gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
            isOwner={!!user && song.user_id === user.id}
            isTemplate={song.is_template}
            visibility={song.visibility}
            isTeacher={isTeacher}
            t={t}
            onDeleted={feed.removeSong}
            onRenamed={feed.renameSong}
            onTemplateToggled={feed.setSongTemplate}
            onVisibilityChanged={feed.setSongVisibility}
            folderId={song.folder_id}
            folders={folders}
            onFolderChanged={feed.setSongFolder}
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
  );
}
