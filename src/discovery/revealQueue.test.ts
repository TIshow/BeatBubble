import { describe, expect, it } from 'vitest';
import { revealItemsFor } from './revealQueue';

describe('discovery reveal queue', () => {
  it('deduplicates cards while preserving order', () => {
    expect(revealItemsFor(['interval_third', 'open_fifth', 'interval_third'])).toEqual([
      { kind: 'card', cardId: 'interval_third' },
      { kind: 'card', cardId: 'open_fifth' },
    ]);
  });

  it('summarizes cards after the first three', () => {
    expect(
      revealItemsFor([
        'interval_third',
        'open_fifth',
        'close_tension',
        'stepwise_run',
        'rhythm_loop',
      ]),
    ).toEqual([
      { kind: 'card', cardId: 'interval_third' },
      { kind: 'card', cardId: 'open_fifth' },
      { kind: 'card', cardId: 'close_tension' },
      { kind: 'summary', count: 2 },
    ]);
  });
});
