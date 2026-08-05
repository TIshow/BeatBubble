import Image from 'next/image';
import { creatureForDiscovery } from '@/creatures/catalog';
import type { DiscoveryId } from '@/discovery/types';

interface DiscoveryEffectLayerProps {
  events: readonly DiscoveryId[];
  onEffectEnd: (cardId: DiscoveryId) => void;
}

export function DiscoveryEffectLayer({ events, onEffectEnd }: DiscoveryEffectLayerProps) {
  return (
    <div className="discovery-effect-layer" aria-hidden="true">
      {events.map((cardId) => {
        const creature = creatureForDiscovery(cardId);
        return (
          <div
            key={cardId}
            className={`discovery-effect discovery-effect--${creature.revealEffect}`}
            onAnimationEnd={(animationEvent) => {
              if (animationEvent.currentTarget === animationEvent.target) {
                onEffectEnd(cardId);
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
