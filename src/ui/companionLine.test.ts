import { describe, expect, it } from 'vitest';
import { DEFAULT_SONG } from '@/core/defaults';
import { isSilent, lineForError, replay, type Heard } from './companionLine';

const heard: Heard = { score: 'A', lines: ['one', 'two'], next: 0 };

describe('replay', () => {
  it('asks when nothing was heard, or the song has changed since', () => {
    expect(replay(null, 'A')).toBeNull();
    expect(replay(heard, 'B')).toBeNull();
  });

  it('moves on to the next line on each tap, then goes round again', () => {
    const first = replay(heard, 'A')!;
    expect(first.speech).toEqual({ kind: 'ai', text: 'one' });
    const second = replay(first.heard, 'A')!;
    expect(second.speech).toEqual({ kind: 'ai', text: 'two' });
    expect(replay(second.heard, 'A')!.speech).toEqual({ kind: 'ai', text: 'one' });
  });

  it("doesn't ask again about notes that got no lines", () => {
    expect(replay({ score: 'A', lines: [], next: 0 }, 'A')!.speech).toEqual({ kind: 'own', line: 'no-words' });
  });
});

describe('isSilent', () => {
  it('is silent only with no notes and no drums', () => {
    const empty = { ...DEFAULT_SONG, melody: { notes: [] }, drums: { hits: [] } };
    expect(isSilent(empty)).toBe(true);
    expect(isSilent({ ...empty, drums: { hits: [{ id: 'd', drumId: 'kick', step: 0 }] } })).toBe(false);
    expect(
      isSilent({ ...empty, melody: { notes: [{ id: 'n', note: 'C4', startStep: 0, durationSteps: 1 }] } }),
    ).toBe(false);
  });
});

describe('lineForError', () => {
  it('says "tomorrow" only at the limit; anything else is a plain "couldn\'t hear"', () => {
    expect(lineForError('limit')).toBe('limit');
    for (const error of ['signed-out', 'not-enabled', 'unavailable'] as const) {
      expect(lineForError(error)).toBe('unavailable');
    }
  });
});
