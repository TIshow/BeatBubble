import type { DiscoveryId } from '@/discovery/types';

type DiscoveryEffectEvent = {
  key: number;
  cardId: DiscoveryId;
};

interface Props {
  events: readonly DiscoveryEffectEvent[];
  onEffectEnd: (key: number) => void;
}

const EFFECT_MARKS: Record<DiscoveryId, string> = {
  interval_third: '✦ ✦',
  open_fifth: '◯',
  close_tension: 'ϟ',
  stepwise_run: '▁ ▃ ▅ ▇',
  call_and_response: '● · ●',
  rest_then_burst: '○ ◌ ✹',
  rhythm_loop: '↻',
  sustain_contrast: '━ ✦',
};

export function DiscoveryEffectLayer({ events, onEffectEnd }: Props) {
  return (
    <div className="discovery-effect-layer" aria-hidden="true">
      {events.map((event) => (
        <div
          key={event.key}
          className={`discovery-effect discovery-effect--${event.cardId}`}
          onAnimationEnd={() => onEffectEnd(event.key)}
        >
          {EFFECT_MARKS[event.cardId]}
        </div>
      ))}
    </div>
  );
}
