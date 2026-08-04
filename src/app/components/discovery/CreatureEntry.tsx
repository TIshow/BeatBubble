import Image from 'next/image';
import type { CreatureDefinition } from '@/creatures/types';
import type { StoredDiscovery } from '@/discovery/storage';
import type { Locale, Translations } from '@/lib/i18n';

interface CreatureEntryProps {
  creature: CreatureDefinition;
  number: number;
  progress: StoredDiscovery | null;
  locale: Locale;
  t: Translations;
}

interface LockedCreatureEntryProps {
  creature: CreatureDefinition;
  eager: boolean;
  numberLabel: string;
  hint: string;
  t: Translations;
}

function formatDiscoveryDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function CreaturePortrait({
  creature,
  alt,
  eager,
}: {
  creature: CreatureDefinition;
  alt: string;
  eager: boolean;
}) {
  return (
    <div className="creature-entry-portrait-frame">
      <Image
        className="creature-entry-portrait"
        src={creature.portraitPath}
        alt={alt}
        width={1024}
        height={1024}
        loading={eager ? 'eager' : 'lazy'}
        sizes="(max-width: 599px) 72vw, (max-width: 899px) 36vw, 260px"
      />
    </div>
  );
}

function LockedCreatureEntry({ creature, eager, numberLabel, hint, t }: LockedCreatureEntryProps) {
  const titleId = `creature-entry-locked-${creature.discoveryId}`;

  return (
    <article className="creature-entry creature-entry--locked" aria-labelledby={titleId}>
      <header className="creature-entry-header">
        <span className="creature-entry-number">{numberLabel}</span>
        <span className="creature-entry-status">{t.discoveryCreatureLocked}</span>
      </header>
      <div className="creature-entry-silhouette" aria-hidden="true">
        <CreaturePortrait creature={creature} alt="" eager={eager} />
      </div>
      <h2 className="creature-entry-name creature-entry-name--locked" id={titleId}>
        {t.discoveryLocked}
      </h2>
      <div className="creature-entry-section creature-entry-hint">
        <strong>{t.discoveryHintLabel}</strong>
        <p>{hint}</p>
      </div>
    </article>
  );
}

export function CreatureEntry({ creature, number, progress, locale, t }: CreatureEntryProps) {
  const numberLabel = t.discoveryEntryNumber(number);
  const copy = t.creatures[creature.discoveryId];
  const eager = number <= 3;

  if (!progress) {
    return (
      <LockedCreatureEntry
        creature={creature}
        eager={eager}
        numberLabel={numberLabel}
        hint={copy.hint}
        t={t}
      />
    );
  }

  const titleId = `creature-entry-${creature.discoveryId}`;

  return (
    <article className="creature-entry creature-entry--met" aria-labelledby={titleId}>
      <header className="creature-entry-header">
        <span className="creature-entry-number">{numberLabel}</span>
        <span className="creature-entry-status creature-entry-status--met">
          {t.discoveryCreatureMet}
        </span>
      </header>
      <CreaturePortrait creature={creature} alt={copy.alt} eager={eager} />
      <div className="creature-entry-body">
        <h2 className="creature-entry-name" id={titleId}>
          {copy.name}
        </h2>
        <p className="creature-entry-personality">{copy.personality}</p>
        <p className="creature-entry-date">
          {t.discoveryDate(formatDiscoveryDate(progress.discoveredAt, locale))}
        </p>
        <section className="creature-entry-section">
          <h3>{t.discoveryCreatureReasonLabel}</h3>
          <p>{copy.description}</p>
        </section>
        <section className="creature-entry-section creature-entry-theory">
          <h3>{t.discoveryTheoryLabel}</h3>
          <p>{copy.theory}</p>
        </section>
      </div>
    </article>
  );
}
