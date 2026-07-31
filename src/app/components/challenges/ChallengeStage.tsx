import { challengeCard } from '@/challenges/catalog';
import type { ChallengeId, ChallengeReaction } from '@/challenges/types';
import type { Translations } from '@/lib/i18n';
import { GhostWorld } from './worlds/GhostWorld';
import { RainWorld } from './worlds/RainWorld';
import { RunWorld } from './worlds/RunWorld';

interface Props {
  challengeId: ChallengeId;
  reaction: ChallengeReaction | null;
  isPlaying: boolean;
  t: Translations;
  onDone: () => void;
  onExit: () => void;
}

export function ChallengeStage({ challengeId, reaction, isPlaying, t, onDone, onExit }: Props) {
  const card = challengeCard(challengeId);
  const copy = t.challengeCards[challengeId];
  const techniqueClasses = reaction?.techniques.map((id) => `has-${id}`).join(' ') ?? '';

  return (
    <section
      className={`challenge-stage challenge-stage--${challengeId} ${
        isPlaying ? 'is-playing' : 'is-still'
      } ${techniqueClasses}`}
    >
      <div className="challenge-stage-copy">
        <span className="challenge-stage-kicker">{t.challengeActive}</span>
        <div className="challenge-stage-title-row">
          <span className="challenge-stage-icon" aria-hidden="true">
            {card.icon}
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.prompt}</p>
          </div>
        </div>
        {!isPlaying && <p className="challenge-stage-waiting">{t.challengeWorldWaiting}</p>}
        <div className="challenge-stage-actions">
          <button type="button" className="challenge-done-btn" onClick={onDone}>
            {t.challengeDone}
          </button>
          <button type="button" className="challenge-exit-btn" onClick={onExit}>
            {t.challengeExit}
          </button>
        </div>
      </div>

      <div
        className="challenge-stage-scene"
        role="img"
        aria-label={copy.sceneLabel}
        data-reaction-step={reaction?.step ?? undefined}
      >
        {challengeId === 'rain' && <RainWorld />}
        {challengeId === 'ghost' && <GhostWorld />}
        {challengeId === 'run' && <RunWorld />}
      </div>
    </section>
  );
}
