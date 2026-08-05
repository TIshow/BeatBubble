import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREATURE_CATALOG } from '@/creatures/catalog';
import { translations } from '@/lib/i18n';
import { EditorCompanion } from './EditorCompanion';

describe('EditorCompanion', () => {
  it('renders only the draggable creature without visible copy or a card link', () => {
    const t = translations.ja;
    const creature = CREATURE_CATALOG.interval_third;
    const markup = renderToStaticMarkup(
      createElement(EditorCompanion, {
        creature,
        isPlaying: false,
        reactionKey: 0,
        t,
      }),
    );

    expect(markup).toContain('editor-companion-portrait');
    expect(markup).toContain(t.companionMoveHint);
    expect(markup).not.toContain('editor-companion-copy');
    expect(markup).not.toContain('<strong');
    expect(markup).not.toContain('<a');
  });
});
