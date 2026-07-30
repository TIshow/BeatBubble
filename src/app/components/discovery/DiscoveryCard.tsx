import type { DiscoveryDefinition } from '@/discovery/types';
import type { StoredDiscovery } from '@/discovery/storage';
import type { Locale, Translations } from '@/lib/i18n';

interface DiscoveryCardProps {
  definition: DiscoveryDefinition;
  progress: StoredDiscovery | null;
  locale: Locale;
  t: Translations;
}

function formatDiscoveryDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function DiscoveryCard({ definition, progress, locale, t }: DiscoveryCardProps) {
  const copy = t.discoveryCards[definition.id];
  const number = String(definition.sortOrder / 10).padStart(2, '0');

  if (!progress) {
    return (
      <article className="discovery-album-card locked">
        <span className="discovery-card-number">CARD {number}</span>
        <div className="discovery-locked-mark">{t.discoveryLocked}</div>
        <div className="discovery-card-section">
          <strong>{t.discoveryHintLabel}</strong>
          <p>{copy.hint}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="discovery-album-card earned">
      <span className="discovery-card-number">CARD {number}</span>
      <h2 className="discovery-card-title">{copy.name}</h2>
      <p className="discovery-card-date">
        {t.discoveryDate(formatDiscoveryDate(progress.discoveredAt, locale))}
      </p>
      <p className="discovery-card-description">{copy.description}</p>
      <div className="discovery-card-section">
        <strong>{t.discoveryHintLabel}</strong>
        <p>{copy.hint}</p>
      </div>
      <div className="discovery-card-section">
        <strong>{t.discoveryTheoryLabel}</strong>
        <p>{copy.theory}</p>
      </div>
    </article>
  );
}
