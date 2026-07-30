'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AccountMenu } from '@/app/components/AccountMenu';
import { DiscoveryAlbumProgress } from '@/app/components/discovery/DiscoveryAlbumProgress';
import { DiscoveryCard } from '@/app/components/discovery/DiscoveryCard';
import { ProfileModal } from '@/app/components/ProfileModal';
import { DISCOVERY_CARDS } from '@/discovery/catalog';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoveries } from '@/hooks/useDiscoveries';
import { useLocale } from '@/hooks/useLocale';
import { useProfile } from '@/hooks/useProfile';

export default function DiscoveriesPage() {
  const { locale, t, changeLocale } = useLocale();
  const { user, signInWithGoogle, signOut } = useAuth();
  const { profile, saveProfile } = useProfile(user);
  const {
    progress,
    isLoading,
    syncError,
    guestCount,
    importGuestDiscoveries,
    discardGuestDiscoveries,
    retrySync,
  } = useDiscoveries(user);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const profileSubtitle = [
    profile?.school,
    profile?.grade != null ? t.profileGradeUnit(profile.grade) : null,
    profile?.className,
  ]
    .filter(Boolean)
    .join('・');
  const progressById = new Map(progress.map((item) => [item.cardId, item]));

  const handleImport = async () => {
    setIsImporting(true);
    await importGuestDiscoveries();
    setIsImporting(false);
  };

  return (
    <div className="discoveries-page">
      <header className="discoveries-header">
        <Link href="/" className="discoveries-back-btn">
          {t.backToCreate}
        </Link>
        <h1 className="discoveries-heading">{t.discoveryAlbumTitle}</h1>
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

      <main className="discoveries-main">
        <section className="discoveries-hero">
          <h2 className="discoveries-title">{t.discoveryAlbumTitle}</h2>
          <p className="discoveries-intro">{t.discoveryAlbumIntro}</p>
          <DiscoveryAlbumProgress earned={progress.length} total={DISCOVERY_CARDS.length} t={t} />
        </section>

        {!user && (
          <div className="discoveries-notice">
            <p>{t.discoveryGuestNotice}</p>
            <p>{t.discoveryLoginToKeep}</p>
            <div className="discoveries-notice-actions">
              <button className="modal-save" onClick={signInWithGoogle}>
                {t.login}
              </button>
            </div>
          </div>
        )}

        {user && guestCount > 0 && (
          <div className="discoveries-notice" role="status">
            <strong>{t.discoveryImportTitle}</strong>
            <p>{t.discoveryImportBody(guestCount)}</p>
            <div className="discoveries-notice-actions">
              <button className="modal-save" onClick={handleImport} disabled={isImporting}>
                {isImporting ? t.saving : t.discoveryImportYes}
              </button>
              <button
                className="modal-cancel"
                onClick={discardGuestDiscoveries}
                disabled={isImporting}
              >
                {t.discoveryImportNo}
              </button>
            </div>
          </div>
        )}

        {syncError && (
          <div className="discoveries-notice" role="alert">
            <p>{t.discoverySyncError}</p>
            <div className="discoveries-notice-actions">
              <button className="modal-save" onClick={() => void retrySync()}>
                {t.discoveryRetry}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="songs-status">{t.loading}</p>
        ) : (
          <section className="discoveries-grid" aria-label={t.discoveryAlbumTitle}>
            {DISCOVERY_CARDS.map((definition) => (
              <DiscoveryCard
                key={definition.id}
                definition={definition}
                progress={progressById.get(definition.id) ?? null}
                locale={locale}
                t={t}
              />
            ))}
          </section>
        )}
      </main>

      {isProfileModalOpen && user && (
        <ProfileModal
          t={t}
          profile={profile}
          onSave={saveProfile}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
