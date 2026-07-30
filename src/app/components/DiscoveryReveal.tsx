'use client';

import { useEffect } from 'react';
import type { DiscoveryRevealItem } from '@/discovery/revealQueue';
import type { Translations } from '@/lib/i18n';

interface Props {
  item: DiscoveryRevealItem;
  t: Translations;
  onDone: () => void;
}

const REVEAL_DURATION_MS = 1900;

export function DiscoveryReveal({ item, t, onDone }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, REVEAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [item, onDone]);

  if (item.kind === 'summary') {
    return (
      <div className="discovery-reveal discovery-reveal--summary" role="status" aria-live="polite">
        <div className="discovery-reveal-burst" aria-hidden="true">
          ✦
        </div>
        <div className="discovery-reveal-name">{t.discoveryMoreFound(item.count)}</div>
      </div>
    );
  }

  const card = t.discoveryCards[item.cardId];
  return (
    <div
      className={`discovery-reveal discovery-reveal--${item.cardId}`}
      role="status"
      aria-live="polite"
    >
      <div className="discovery-reveal-rays" aria-hidden="true" />
      <div className="discovery-reveal-label">{t.discoveryFound}</div>
      <div className="discovery-reveal-card">
        <span className="discovery-reveal-card-mark" aria-hidden="true">
          ✦
        </span>
        <strong className="discovery-reveal-name">{card.name}</strong>
        <span className="discovery-reveal-message">{card.reveal}</span>
      </div>
    </div>
  );
}
