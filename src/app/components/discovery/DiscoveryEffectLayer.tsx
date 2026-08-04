import Image from 'next/image';
import { creatureForDiscovery } from '@/creatures/catalog';
import type { DiscoveryId } from '@/discovery/types';

type DiscoveryEffectEvent = {
  key: number;
  cardId: DiscoveryId;
};

interface Props {
  events: readonly DiscoveryEffectEvent[];
  onEffectEnd: (key: number) => void;
}

export function DiscoveryEffectLayer({ events, onEffectEnd }: Props) {
  return (
    <div className="discovery-effect-layer" aria-hidden="true">
      {events.map((event) => {
        const creature = creatureForDiscovery(event.cardId);
        return (
          <div
            key={event.key}
            className={`discovery-effect discovery-effect--${creature.revealEffect}`}
            onAnimationEnd={(animationEvent) => {
              if (animationEvent.currentTarget === animationEvent.target) {
                onEffectEnd(event.key);
              }
            }}
          >
            <span className="discovery-effect-glow" />
            <Image
              className="discovery-effect-creature"
              src={creature.portraitPath}
              alt=""
              width={1024}
              height={1024}
              sizes="140px"
            />
          </div>
        );
      })}
    </div>
  );
}
