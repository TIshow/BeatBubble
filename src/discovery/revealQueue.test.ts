import { describe, expect, it } from 'vitest';
import { revealItemsFor } from './revealQueue';
import type { DiscoveryMatch } from './types';

describe('discovery reveal queue', () => {
  const matches: DiscoveryMatch[] = [
    {
      cardId: 'interval_third',
      startStep: 0,
      triggerStep: 0,
      evidenceNoteIds: ['note-c', 'note-e'],
      evidenceHitIds: [],
    },
    {
      cardId: 'interval_third',
      startStep: 0,
      triggerStep: 0,
      evidenceNoteIds: ['note-e', 'note-g'],
      evidenceHitIds: [],
    },
    {
      cardId: 'rest_then_burst',
      startStep: 0,
      triggerStep: 6,
      evidenceNoteIds: ['note-c'],
      evidenceHitIds: ['hit-kick'],
    },
  ];

  it('deduplicates cards while preserving order and merges their evidence', () => {
    expect(
      revealItemsFor(['interval_third', 'rest_then_burst', 'interval_third'], matches),
    ).toEqual([
      {
        cardId: 'interval_third',
        evidenceNoteIds: ['note-c', 'note-e', 'note-g'],
        evidenceHitIds: [],
      },
      {
        cardId: 'rest_then_burst',
        evidenceNoteIds: ['note-c'],
        evidenceHitIds: ['hit-kick'],
      },
    ]);
  });

  it('keeps a card even when no evidence match is available', () => {
    expect(revealItemsFor(['open_fifth'], matches)).toEqual([
      {
        cardId: 'open_fifth',
        evidenceNoteIds: [],
        evidenceHitIds: [],
      },
    ]);
  });
});
