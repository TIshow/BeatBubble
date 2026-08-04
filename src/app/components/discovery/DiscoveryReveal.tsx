'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { creatureForDiscovery } from '@/creatures/catalog';
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
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'right'>('right');

  useEffect(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      restoreFocusRef.current = activeElement;
    }

    return () => {
      const previousFocus = restoreFocusRef.current;
      if (previousFocus?.isConnected && !previousFocus.hasAttribute('disabled')) {
        previousFocus.focus();
        return;
      }
      document.querySelector<HTMLButtonElement>('.play-btn:not(:disabled)')?.focus();
    };
  }, []);

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

  const creature = creatureForDiscovery(item.cardId);
  const copy = t.creatures[creature.discoveryId];
  const titleId = `discovery-reveal-title-${item.cardId}`;
  const personalityId = `discovery-reveal-personality-${item.cardId}`;
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
        aria-describedby={`${personalityId} ${descriptionId} ${theoryId}`}
      >
        <div className="discovery-reveal-rays" aria-hidden="true" />
        <div className="discovery-reveal-label">{t.discoveryFound}</div>
        <div
          className={`discovery-reveal-creature-stage discovery-reveal-creature-stage--${creature.revealEffect}`}
        >
          <span className="discovery-reveal-creature-glow" aria-hidden="true" />
          <Image
            className="discovery-reveal-creature"
            src={creature.portraitPath}
            alt={copy.alt}
            width={1024}
            height={1024}
            loading="eager"
            sizes="180px"
          />
        </div>
        <strong className="discovery-reveal-name" id={titleId}>
          {copy.name}
        </strong>
        <p className="discovery-reveal-personality" id={personalityId}>
          {copy.personality}
        </p>
        <span className="discovery-reveal-message">{copy.reveal}</span>
        <div className="discovery-reveal-reason" id={descriptionId}>
          <strong>{t.discoveryCreatureReasonLabel}</strong>
          <p>{copy.description}</p>
        </div>
        <p className="discovery-reveal-focus-hint">
          <span aria-hidden="true">◎</span>
          {t.discoveryFocusHint}
        </p>
        <div className="discovery-reveal-theory" id={theoryId}>
          <strong>{t.discoveryTheoryLabel}</strong>
          <span>{t.discoveryAhaLabel}</span>
          <p>{copy.theory}</p>
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
