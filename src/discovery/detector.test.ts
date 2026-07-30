import { describe, expect, it } from 'vitest';
import { DEFAULT_SONG } from '@/core/defaults';
import type { DrumHit, DrumId, MelodyNote, Song } from '@/core/types';
import { detectDiscoveries } from './detector';
import type { DiscoveryId } from './types';

let nextId = 0;

function note(name: string, startStep: number, durationSteps = 1): MelodyNote {
  return {
    id: `note-${nextId++}`,
    note: name,
    startStep,
    durationSteps,
  };
}

function hit(drumId: DrumId, step: number): DrumHit {
  return { id: `hit-${nextId++}`, drumId, step };
}

function song(notes: MelodyNote[], hits: DrumHit[] = [], overrides: Partial<Song> = {}): Song {
  return {
    ...structuredClone(DEFAULT_SONG),
    ...overrides,
    melody: { notes },
    drums: { hits },
  };
}

function ids(value: Song): DiscoveryId[] {
  return [...new Set(detectDiscoveries(value).map((match) => match.cardId))];
}

describe('interval discoveries', () => {
  it('finds a third when sustained notes overlap even if their starts differ', () => {
    const result = detectDiscoveries(song([note('C4', 0, 4), note('E4', 2, 2)]));
    const match = result.find((item) => item.cardId === 'interval_third');
    expect(match).toMatchObject({ startStep: 2, triggerStep: 2 });
    expect(match?.evidenceNoteIds).toHaveLength(2);
  });

  it('does not find an interval when the notes never overlap', () => {
    expect(ids(song([note('C4', 0, 2), note('E4', 2, 2)]))).not.toContain('interval_third');
  });

  it('finds a perfect fifth and octave but not a perfect fourth', () => {
    expect(ids(song([note('C4', 0), note('G4', 0)]))).toContain('open_fifth');
    expect(ids(song([note('C4', 0), note('C5', 0)]))).toContain('open_fifth');
    expect(ids(song([note('C4', 0), note('F4', 0)]))).not.toContain('open_fifth');
  });

  it('finds semitone-class tension, including the major-seventh inversion', () => {
    expect(ids(song([note('C4', 0), note('C#4', 0)]))).toContain('close_tension');
    expect(ids(song([note('C4', 0), note('B4', 0)]))).toContain('close_tension');
  });
});

describe('melodic discoveries', () => {
  it('finds four onsets moving stepwise in one direction', () => {
    const result = detectDiscoveries(
      song([note('C4', 0), note('D4', 1), note('E4', 2), note('F4', 3)]),
    );
    const match = result.find((item) => item.cardId === 'stepwise_run');
    expect(match).toMatchObject({ startStep: 0, triggerStep: 3 });
    expect(match?.evidenceNoteIds).toHaveLength(4);
  });

  it('does not call a zig-zag or a large leap a staircase', () => {
    expect(ids(song([note('C4', 0), note('D4', 1), note('C4', 2), note('D4', 3)]))).not.toContain(
      'stepwise_run',
    );
    expect(ids(song([note('C4', 0), note('D4', 1), note('G4', 2), note('A4', 3)]))).not.toContain(
      'stepwise_run',
    );
  });

  it('finds call-and-response with equal rhythm and contour', () => {
    const result = detectDiscoveries(
      song([
        note('C4', 0),
        note('E4', 1),
        note('D4', 2),
        note('G4', 5),
        note('B4', 6),
        note('A4', 7),
      ]),
    );
    const match = result.find((item) => item.cardId === 'call_and_response');
    expect(match).toMatchObject({ startStep: 0, triggerStep: 7 });
    expect(match?.evidenceNoteIds).toHaveLength(6);
  });

  it('rejects a response with a different contour', () => {
    expect(
      ids(
        song([
          note('C4', 0),
          note('E4', 1),
          note('D4', 2),
          note('G4', 5),
          note('A4', 6),
          note('B4', 7),
        ]),
      ),
    ).not.toContain('call_and_response');
  });
});

describe('rhythm and duration discoveries', () => {
  it('finds a silent beat followed by at least three events', () => {
    const result = detectDiscoveries(song([note('C4', 4), note('D4', 5)], [hit('kick', 6)]));
    const match = result.find((item) => item.cardId === 'rest_then_burst');
    expect(match).toMatchObject({ startStep: 0, triggerStep: 6 });
    expect([...(match?.evidenceNoteIds ?? []), ...(match?.evidenceHitIds ?? [])]).toHaveLength(3);
  });

  it('does not treat a beat covered by a sustained note as silence', () => {
    expect(
      ids(song([note('C4', 0, 5), note('D4', 4), note('E4', 5)], [hit('kick', 6)])),
    ).not.toContain('rest_then_burst');
  });

  it('finds the same two-event rhythm in adjacent beats', () => {
    const result = detectDiscoveries(
      song([note('C4', 0), note('D4', 2), note('E4', 4), note('F4', 6)]),
    );
    const match = result.find((item) => item.cardId === 'rhythm_loop');
    expect(match).toMatchObject({ startStep: 0, triggerStep: 6 });
    expect(match?.evidenceNoteIds).toHaveLength(4);
  });

  it('does not find a one-event pulse or unequal rhythm as a loop', () => {
    expect(ids(song([note('C4', 0), note('D4', 4)]))).not.toContain('rhythm_loop');
    expect(ids(song([note('C4', 0), note('D4', 2), note('E4', 4), note('F4', 7)]))).not.toContain(
      'rhythm_loop',
    );
  });

  it('finds a beat-long sustain followed by two short notes', () => {
    const result = detectDiscoveries(song([note('C4', 0, 4), note('D4', 4), note('E4', 5)]));
    const match = result.find((item) => item.cardId === 'sustain_contrast');
    expect(match).toMatchObject({ startStep: 0, triggerStep: 5 });
    expect(match?.evidenceNoteIds).toHaveLength(3);
  });

  it('does not call a sub-beat note sustained contrast', () => {
    expect(ids(song([note('C4', 0, 3), note('D4', 3), note('E4', 4)]))).not.toContain(
      'sustain_contrast',
    );
  });
});

describe('detector invariants', () => {
  it('derives bounds from blocks * stepsPerBeat', () => {
    const shortSong = song(
      [note('C4', 0), note('E4', 0), note('D4', 7), note('F4', 7), note('G4', 8)],
      [],
      { blocks: 2, stepsPerBeat: 4 },
    );
    const matches = detectDiscoveries(shortSong);
    expect(matches.every((match) => match.startStep < 8 && match.triggerStep < 8)).toBe(true);
    expect(matches.some((match) => match.cardId === 'interval_third')).toBe(true);
  });

  it('skips an invalid imported note without crashing other discoveries', () => {
    const result = detectDiscoveries(song([note('not-a-note', 0), note('C4', 1), note('E4', 1)]));
    expect(result.some((match) => match.cardId === 'interval_third')).toBe(true);
  });
});
