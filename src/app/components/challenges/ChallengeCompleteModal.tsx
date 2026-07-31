'use client';

import { useEffect } from 'react';
import { challengeCard } from '@/challenges/catalog';
import type { ChallengeCompletion } from '@/challenges/types';
import type { Translations } from '@/lib/i18n';

interface Props {
  completed: ChallengeCompletion;
  t: Translations;
  onKeepCreating: () => void;
  onChooseAnother: () => void;
}

export function ChallengeCompleteModal({ completed, t, onKeepCreating, onChooseAnother }: Props) {
  const card = challengeCard(completed.challengeId);
  const challenge = t.challengeCards[completed.challengeId];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onKeepCreating();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onKeepCreating]);

  return (
    <div className="challenge-overlay">
      <section
        className="challenge-complete"
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-complete-title"
      >
        <div className="challenge-complete-burst" aria-hidden="true">
          ✦
        </div>
        <span className="challenge-complete-icon" aria-hidden="true">
          {card.icon}
        </span>
        <p className="challenge-complete-prompt">{challenge.title}</p>
        <h2 id="challenge-complete-title">{t.challengeCompleteTitle}</h2>
        <p className="challenge-complete-intro">{t.challengeCompleteIntro}</p>

        <div className="challenge-ideas">
          <h3>{t.challengeIdeasTitle}</h3>
          {completed.usedTechniques.length > 0 ? (
            <ul>
              {completed.usedTechniques.map((technique) => (
                <li key={technique}>
                  <span aria-hidden="true">✦</span>
                  {t.challengeTechniques[technique]}
                </li>
              ))}
            </ul>
          ) : (
            <p>{t.challengeIdeasEmpty}</p>
          )}
        </div>

        <div className="challenge-complete-actions">
          <button type="button" className="challenge-keep-btn" onClick={onKeepCreating} autoFocus>
            {t.challengeKeepCreating}
          </button>
          <button type="button" className="challenge-another-btn" onClick={onChooseAnother}>
            {t.challengeChooseAnother}
          </button>
        </div>
      </section>
    </div>
  );
}
