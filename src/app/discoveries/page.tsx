'use client';

import Link from 'next/link';
import { AccountMenu } from '@/app/components/AccountMenu';
import { DiscoveryAlbumProgress } from '@/app/components/discovery/DiscoveryAlbumProgress';
import { DiscoveryCard } from '@/app/components/discovery/DiscoveryCard';
import { DISCOVERY_CARDS } from '@/discovery/catalog';
import { useDiscoveries } from '@/hooks/useDiscoveries';
import { useLocale } from '@/hooks/useLocale';
import { useAccount } from '@/app/components/AccountProvider';

export default function DiscoveriesPage() {
  const { locale, t } = useLocale();
  const { user, signIn } = useAccount();
  const { progress, isLoading, syncError, retrySync } = useDiscoveries(user);
  const progressById = new Map(progress.map((item) => [item.cardId, item]));

  return (
    <div className="discoveries-page">
      <header className="discoveries-header">
        <Link href="/" className="discoveries-back-btn">
          {t.backToCreate}
        </Link>
        <h1 className="discoveries-heading">{t.discoveryAlbumTitle}</h1>
        <AccountMenu />
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
              <button className="modal-save" onClick={signIn}>
                {t.login}
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
    </div>
  );
}
