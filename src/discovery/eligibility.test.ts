import { describe, expect, it } from 'vitest';
import { DEFAULT_SONG } from '@/core/defaults';
import type { Song } from '@/core/types';
import { captureDiscoverySource, hasUserContribution } from './eligibility';
import type { DiscoveryMatch } from './types';

const sourceSong: Song = {
  ...structuredClone(DEFAULT_SONG),
  melody: {
    notes: [
      { id: 'source-c', note: 'C4', startStep: 0, durationSteps: 2, locked: true },
      { id: 'source-e', note: 'E4', startStep: 0, durationSteps: 2, locked: true },
    ],
  },
  drums: { hits: [{ id: 'source-kick', drumId: 'kick', step: 0, locked: true }] },
};

const sourceMatch: DiscoveryMatch = {
  cardId: 'interval_third',
  startStep: 0,
  triggerStep: 0,
  evidenceNoteIds: ['source-c', 'source-e'],
  evidenceHitIds: [],
};

describe('discovery eligibility', () => {
  it('allows every match when there is no external source', () => {
    expect(hasUserContribution(sourceMatch, sourceSong, null)).toBe(true);
  });

  it('rejects a match made entirely from unchanged source elements', () => {
    expect(hasUserContribution(sourceMatch, sourceSong, captureDiscoverySource(sourceSong))).toBe(
      false,
    );
  });

  it('allows a match containing a newly added note', () => {
    const snapshot = captureDiscoverySource(sourceSong);
    const edited: Song = {
      ...sourceSong,
      melody: {
        notes: [
          ...sourceSong.melody.notes,
          { id: 'mine', note: 'G4', startStep: 0, durationSteps: 1 },
        ],
      },
    };
    expect(
      hasUserContribution(
        { ...sourceMatch, evidenceNoteIds: ['source-c', 'mine'] },
        edited,
        snapshot,
      ),
    ).toBe(true);
  });

  it('allows a source note whose musical content was changed', () => {
    const snapshot = captureDiscoverySource(sourceSong);
    const edited: Song = {
      ...sourceSong,
      melody: {
        notes: sourceSong.melody.notes.map((note) =>
          note.id === 'source-c' ? { ...note, durationSteps: 3 } : note,
        ),
      },
    };
    expect(hasUserContribution(sourceMatch, edited, snapshot)).toBe(true);
  });

  it('does not count a lock-only change as a musical contribution', () => {
    const snapshot = captureDiscoverySource(sourceSong);
    const edited: Song = {
      ...sourceSong,
      melody: {
        notes: sourceSong.melody.notes.map((note) => ({ ...note, locked: false })),
      },
    };
    expect(hasUserContribution(sourceMatch, edited, snapshot)).toBe(false);
  });
});
