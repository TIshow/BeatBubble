import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CREATURE_CATALOG } from '@/creatures/catalog';
import { translations } from '@/lib/i18n';
import type { Speech } from '@/ui/companionLine';
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
        talk: null,
        t,
      }),
    );

    expect(markup).toContain('editor-companion-portrait');
    expect(markup).toContain(t.companionMoveHint);
    expect(markup).not.toContain('editor-companion-copy');
    expect(markup).not.toContain('<strong');
    expect(markup).not.toContain('<a');
  });

  it('offers a tap only where the companion can talk, and starts silent', () => {
    const t = translations.ja;
    const render = (canTalk: boolean, speech: Speech | null = null) =>
      renderToStaticMarkup(
        createElement(EditorCompanion, {
          creature: CREATURE_CATALOG.interval_third,
          isPlaying: false,
          reactionKey: 0,
          talk: canTalk ? { speech, speak: async () => {}, hush: () => {} } : null,
          t,
        }),
      );

    expect(render(false)).not.toContain(t.companionMoveAndTalkHint);
    expect(render(false)).not.toContain('aria-live');
    expect(render(true)).toContain(t.companionMoveAndTalkHint);
    expect(render(true)).toContain('aria-live="polite"');
    expect(render(true)).not.toContain('editor-companion-bubble');
  });

  it('marks only the lines an AI wrote', () => {
    const t = translations.ja;
    const render = (speech: Speech) =>
      renderToStaticMarkup(
        createElement(EditorCompanion, {
          creature: CREATURE_CATALOG.interval_third,
          isPlaying: false,
          reactionKey: 0,
          talk: { speech, speak: async () => {}, hush: () => {} },
          t,
        }),
      );

    const ai = render({ kind: 'ai', text: 'さいごの ほう、ドが のびてるね。' });
    expect(ai).toContain('editor-companion-ai-mark');
    expect(ai).toContain('さいごの ほう、ドが のびてるね。');

    const own = render({ kind: 'own', line: 'empty' });
    expect(own).toContain(t.companionSilentSong);
    expect(own).not.toContain('editor-companion-ai-mark');
  });
});
