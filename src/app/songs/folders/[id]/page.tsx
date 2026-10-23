"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { useAccount } from "@/app/components/AccountProvider";
import { useFolder, useFolderShortcuts } from "@/hooks/useFolders";
import { useSongFeed } from "@/hooks/useSongFeed";
import { AccountMenu } from "@/app/components/AccountMenu";
import { SongGrid } from "@/app/components/SongGrid";

// One lesson's folder (#143): the teacher's prompt, then everyone's answers to
// it side by side. Its own route rather than /songs?folder= so the link can be
// shared or put on the classroom screen, and the back button returns to the
// feed. Public songs only, like the feed: a song submitted as unlisted is for
// the teacher (/teacher), not for classmates browsing here.
export default function FolderPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useLocale();
  const { user, isTeacher, profile } = useAccount();
  const { folder, loading } = useFolder(id);
  const feed = useSongFeed("all", user, { folderId: id });
  // For the cards' menus: taking a song back out of this folder, and naming it.
  const folders = useFolderShortcuts({
    isTeacher,
    grade: profile?.grade ?? null,
    className: profile?.className ?? null,
  });

  return (
    <div className="songs-page">
      <header className="songs-header">
        <Link href="/songs" className="songs-back-btn">
          {t.folderBack}
        </Link>
        <h1 className="songs-heading">{t.pageTitle}</h1>
        <AccountMenu />
      </header>

      <main className="songs-main">
        {loading ? (
          <p className="songs-status">{t.loading}</p>
        ) : !folder ? (
          <p className="songs-status">{t.folderNotFound}</p>
        ) : (
          <>
            <section className="folder-intro">
              <h2 className="folder-intro-name">📁 {folder.name}</h2>
              <div className="folder-intro-meta">
                <span>{t.folderTarget(folder.grade, folder.class_name)}</span>
                {folder.archived && (
                  <span className="folder-intro-closed">{t.folderClosedChip}</span>
                )}
                {!feed.loading && feed.total != null && feed.songs.length > 0 && (
                  <span>{t.songsCount(feed.total)}</span>
                )}
              </div>
              {folder.prompt && <p className="folder-intro-prompt">{folder.prompt}</p>}
            </section>

            <SongGrid
              feed={feed}
              emptyText={t.folderNoSongs}
              user={user}
              isTeacher={isTeacher}
              folders={folders}
              locale={locale}
              t={t}
            />
          </>
        )}
      </main>
    </div>
  );
}
