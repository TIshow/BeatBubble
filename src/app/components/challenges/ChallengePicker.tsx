'use client';

import { useEffect } from 'react';
import { CHALLENGE_CARDS } from '@/challenges/catalog';
import type { ChallengeId } from '@/challenges/types';
import type { Translations } from '@/lib/i18n';

interface Props {
  t: Translations;
  onSelect: (id: ChallengeId) => void;
  onRandom: () => void;
  onClose: () => void;
}

export function ChallengePicker({ t, onSelect, onRandom, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="challenge-overlay" onClick={onClose}>
      <section
        className="challenge-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="challenge-dialog-close"
          onClick={onClose}
          aria-label={t.close}
        >
          ×
        </button>
        <div className="challenge-picker-heading">
          <span className="challenge-picker-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <h2 id="challenge-picker-title">{t.challengePickerTitle}</h2>
            <p>{t.challengePickerIntro}</p>
          </div>
        </div>

        <div className="challenge-card-grid">
          {CHALLENGE_CARDS.map((card) => {
            const copy = t.challengeCards[card.id];
            return (
              <button
                type="button"
                key={card.id}
                className={`challenge-card challenge-card--${card.id}`}
                onClick={() => onSelect(card.id)}
                autoFocus={card.id === CHALLENGE_CARDS[0].id}
              >
                <span className="challenge-card-icon" aria-hidden="true">
                  {card.icon}
                </span>
                <span className="challenge-card-title">{copy.title}</span>
                <span className="challenge-card-prompt">{copy.prompt}</span>
              </button>
            );
          })}
        </div>

        <button type="button" className="challenge-random-btn" onClick={onRandom}>
          <span aria-hidden="true">🎲</span>
          {t.challengeRandom}
        </button>
      </section>
    </div>
  );
}
