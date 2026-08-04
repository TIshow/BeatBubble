'use client';

import { useEffect, useRef, useState } from 'react';
import type { DiscoveryRevealItem } from '@/discovery/revealQueue';
import type { Translations } from '@/lib/i18n';
import { usesSideDiscoveryDialog } from './discoveryLayout';

interface DiscoveryRevealProps {
  item: DiscoveryRevealItem;
  t: Translations;
  onDone: () => void;
}

export function DiscoveryReveal({ item, t, onDone }: DiscoveryRevealProps) {
  const acknowledgeRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'right'>('right');

  useEffect(() => {
    acknowledgeRef.current?.focus();
  }, [item.cardId]);

  useEffect(() => {
    const updatePlacement = () => {
      if (usesSideDiscoveryDialog()) {
        setPlacement('right');
        return;
      }
      const targets = [...document.querySelectorAll<HTMLElement>('.cell.discovery-target')];
      if (targets.length === 0) {
        setPlacement('bottom');
        return;
      }
      const rects = targets.map((target) => target.getBoundingClientRect());
      const center =
        (Math.min(...rects.map((rect) => rect.top)) +
          Math.max(...rects.map((rect) => rect.bottom))) /
        2;
      setPlacement(center < window.innerHeight / 2 ? 'bottom' : 'top');
    };

    const frame = window.requestAnimationFrame(updatePlacement);
    window.addEventListener('resize', updatePlacement);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePlacement);
    };
  }, [item]);

  const card = t.creatures[item.cardId];
  const titleId = `discovery-reveal-title-${item.cardId}`;
  const descriptionId = `discovery-reveal-description-${item.cardId}`;
  const theoryId = `discovery-reveal-theory-${item.cardId}`;

  return (
    <div
      className={`discovery-reveal discovery-reveal--${placement}`}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          acknowledgeRef.current?.focus();
        }
      }}
    >
      <section
        className="discovery-reveal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId} ${theoryId}`}
      >
        <div className="discovery-reveal-rays" aria-hidden="true" />
        <div className="discovery-reveal-label">{t.discoveryFound}</div>
        <span className="discovery-reveal-card-mark" aria-hidden="true">
          ✦
        </span>
        <strong className="discovery-reveal-name" id={titleId}>
          {card.name}
        </strong>
        <span className="discovery-reveal-message">{card.reveal}</span>
        <p className="discovery-reveal-description" id={descriptionId}>
          {card.description}
        </p>
        <p className="discovery-reveal-focus-hint">
          <span aria-hidden="true">◎</span>
          {t.discoveryFocusHint}
        </p>
        <div className="discovery-reveal-theory" id={theoryId}>
          <strong>{t.discoveryAhaLabel}</strong>
          <p>{card.theory}</p>
        </div>
        <button
          ref={acknowledgeRef}
          type="button"
          className="discovery-reveal-acknowledge"
          onClick={onDone}
        >
          {t.discoveryAcknowledge}
        </button>
      </section>
    </div>
  );
}
