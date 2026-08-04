import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREATURES } from '@/creatures/catalog';
import { translations } from '@/lib/i18n';
import { DiscoveryReveal } from './DiscoveryReveal';

describe('DiscoveryReveal', () => {
  it('renders every first encounter as a complete creature introduction in both locales', () => {
    for (const locale of ['ja', 'en'] as const) {
      const t = translations[locale];
      for (const creature of CREATURES) {
        const copy = t.creatures[creature.translationKey];
        const markup = renderToStaticMarkup(
          createElement(DiscoveryReveal, {
            item: {
              cardId: creature.discoveryId,
              evidenceNoteIds: [],
              evidenceHitIds: [],
            },
            t,
            onDone: () => undefined,
          }),
        );

        expect(markup).toContain('role="dialog"');
        expect(markup).toContain(encodeURIComponent(creature.portraitPath));
        expect(markup).toContain(`discovery-reveal-creature-stage--${creature.revealEffect}`);
        expect(markup).toContain(copy.alt);
        expect(markup).toContain(copy.name);
        expect(markup).toContain(copy.personality);
        expect(markup).toContain(copy.description);
        expect(markup).toContain(copy.theory);
        expect(markup).toContain(t.discoveryCreatureReasonLabel);
        expect(markup).toContain(t.discoveryTheoryLabel);
        expect(markup).toContain(t.discoveryAcknowledge);
      }
    }
  });
});
