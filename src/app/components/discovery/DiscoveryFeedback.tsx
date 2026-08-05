import type { DiscoveryRevealItem } from '@/discovery/revealQueue';
import type { DiscoveryId } from '@/discovery/types';
import type { Translations } from '@/lib/i18n';
import { DiscoveryEffectLayer } from './DiscoveryEffectLayer';
import { DiscoveryReveal } from './DiscoveryReveal';

interface DiscoveryFeedbackProps {
  effects: readonly DiscoveryId[];
  revealQueue: readonly DiscoveryRevealItem[];
  t: Translations;
  onEffectEnd: (cardId: DiscoveryId) => void;
  onRevealDone: () => void;
}

export function DiscoveryFeedback({
  effects,
  revealQueue,
  t,
  onEffectEnd,
  onRevealDone,
}: DiscoveryFeedbackProps) {
  return (
    <>
      <DiscoveryEffectLayer events={effects} onEffectEnd={onEffectEnd} />
      {revealQueue[0] && <DiscoveryReveal item={revealQueue[0]} t={t} onDone={onRevealDone} />}
    </>
  );
}
