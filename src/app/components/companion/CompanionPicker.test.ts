import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREATURE_CATALOG } from '@/creatures/catalog';
import { translations } from '@/lib/i18n';
import { CompanionPicker } from './CompanionPicker';

const t = translations.ja;

describe('CompanionPicker', () => {
  it('does not offer a redundant save when no companion is already selected', () => {
    const markup = renderToStaticMarkup(
      createElement(CompanionPicker, {
        selectedCreature: null,
        hasSelection: false,
        isAccount: true,
        isLoading: false,
        isSaving: false,
        t,
        onChooseNone: () => {},
      }),
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('disabled=""');
  });

  it('allows an existing selection to be removed', () => {
    const markup = renderToStaticMarkup(
      createElement(CompanionPicker, {
        selectedCreature: CREATURE_CATALOG.interval_third,
        hasSelection: true,
        isAccount: true,
        isLoading: false,
        isSaving: false,
        t,
        onChooseNone: () => {},
      }),
    );

    expect(markup).toContain(t.companionCurrent(t.creatures.interval_third.name));
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toContain('disabled=""');
  });
});
