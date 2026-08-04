import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREATURE_CATALOG } from '@/creatures/catalog';
import { translations } from '@/lib/i18n';
import { CreatureEntry } from './CreatureEntry';

const creature = CREATURE_CATALOG.interval_third;
const t = translations.ja;

describe('CreatureEntry', () => {
  it('does not reveal the creature name or descriptive alt text before discovery', () => {
    const markup = renderToStaticMarkup(
      createElement(CreatureEntry, {
        creature,
        number: 1,
        progress: null,
        locale: 'ja',
        t,
      }),
    );

    expect(markup).toContain(t.discoveryCreatureLocked);
    expect(markup).toContain(t.creatures.interval_third.hint);
    expect(markup).not.toContain(t.creatures.interval_third.name);
    expect(markup).not.toContain(t.creatures.interval_third.alt);
  });

  it('shows the full creature entry after discovery', () => {
    const markup = renderToStaticMarkup(
      createElement(CreatureEntry, {
        creature,
        number: 1,
        progress: {
          cardId: creature.discoveryId,
          discoveredAt: '2026-08-04T00:00:00.000Z',
        },
        locale: 'ja',
        t,
      }),
    );

    expect(markup).toContain(t.creatures.interval_third.name);
    expect(markup).toContain(t.creatures.interval_third.personality);
    expect(markup).toContain(t.creatures.interval_third.description);
    expect(markup).toContain(t.creatures.interval_third.theory);
    expect(markup).toContain(t.creatures.interval_third.alt);
  });
});
