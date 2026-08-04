import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREATURES } from '@/creatures/catalog';
import { DiscoveryEffectLayer } from './DiscoveryEffectLayer';

describe('DiscoveryEffectLayer', () => {
  it('uses the matching creature for each short non-modal reaction', () => {
    const markup = renderToStaticMarkup(
      createElement(DiscoveryEffectLayer, {
        events: CREATURES.map((creature, index) => ({
          key: index,
          cardId: creature.discoveryId,
        })),
        onEffectEnd: () => undefined,
      }),
    );

    expect(markup).toContain('aria-hidden="true"');
    for (const creature of CREATURES) {
      expect(markup).toContain(encodeURIComponent(creature.portraitPath));
      expect(markup).toContain(`discovery-effect--${creature.revealEffect}`);
    }
  });
});
