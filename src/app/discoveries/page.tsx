'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AccountMenu } from '@/app/components/AccountMenu';
import { CompanionPicker } from '@/app/components/companion/CompanionPicker';
import { DiscoveryAlbumProgress } from '@/app/components/discovery/DiscoveryAlbumProgress';
import { CreatureEntry } from '@/app/components/discovery/CreatureEntry';
import { CREATURES, creatureForDiscovery } from '@/creatures/catalog';
import type { DiscoveryId } from '@/discovery/types';
import { useDiscoveries } from '@/hooks/useDiscoveries';
import { useLocale } from '@/hooks/useLocale';
import { useAccount } from '@/app/components/AccountProvider';

export default function DiscoveriesPage() {
  const { locale, t } = useLocale();
  const { user, signIn, companionDiscoveryId, companionLoading, selectCompanion } = useAccount();
  const { progress, isLoading, syncError, retrySync } = useDiscoveries(user);
  const [isCompanionSaving, setIsCompanionSaving] = useState(false);
  const [companionSaveError, setCompanionSaveError] = useState(false);
  const progressById = new Map(progress.map((item) => [item.cardId, item]));
  const selectedCreature =
    companionDiscoveryId && progressById.has(companionDiscoveryId)
      ? creatureForDiscovery(companionDiscoveryId)
      : null;

  async function handleCompanionChoice(discoveryId: DiscoveryId | null) {
    if (discoveryId && !progressById.has(discoveryId)) return;
    setIsCompanionSaving(true);
    setCompanionSaveError(false);
    const { error } = await selectCompanion(discoveryId);
    setCompanionSaveError(!!error);
    setIsCompanionSaving(false);
  }

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
          <DiscoveryAlbumProgress earned={progress.length} total={CREATURES.length} t={t} />
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

        <CompanionPicker
          selectedCreature={selectedCreature}
          isAccount={!!user}
          isLoading={companionLoading || isLoading}
          isSaving={isCompanionSaving}
          t={t}
          onChooseNone={() => void handleCompanionChoice(null)}
        />

        {companionSaveError && (
          <p className="discoveries-notice" role="alert">
            {t.companionSaveError}
          </p>
        )}

        {isLoading ? (
          <p className="songs-status">{t.loading}</p>
        ) : (
          <section className="discoveries-grid" aria-label={t.discoveryAlbumTitle}>
            {CREATURES.map((creature, index) => (
              <CreatureEntry
                key={creature.discoveryId}
                creature={creature}
                number={index + 1}
                progress={progressById.get(creature.discoveryId) ?? null}
                locale={locale}
                t={t}
                isCompanion={companionDiscoveryId === creature.discoveryId}
                companionDisabled={companionLoading || isCompanionSaving}
                onChooseCompanion={() => void handleCompanionChoice(creature.discoveryId)}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
