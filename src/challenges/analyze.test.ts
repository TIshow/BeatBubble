import { describe, expect, it } from 'vitest';
import { DEFAULT_SONG } from '@/core/defaults';
import type { DrumHit, DrumId, MelodyNote, Song } from '@/core/types';
import { analyzeChallenge, reactionAt } from './analyze';

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

describe('rain challenge', () => {
  it('turns different musical ideas into independent rain reactions', () => {
    const analysis = analyzeChallenge(
      song(
        [note('G4', 0), note('C4', 0), note('D4', 4, 4), note('E4', 8), note('G4', 9)],
        [hit('kick', 0)],
      ),
      'rain',
    );

    expect(reactionAt(analysis, 0)?.techniques).toEqual(
      expect.arrayContaining(['rain_droplets', 'rain_downpour', 'rain_thunder']),
    );
    expect(reactionAt(analysis, 4)?.techniques).toContain('rain_ripples');
    expect(reactionAt(analysis, 9)?.techniques).toContain('rain_wind');
    expect(analysis.usedTechniques).toEqual(
      expect.arrayContaining([
        'rain_droplets',
        'rain_downpour',
        'rain_ripples',
        'rain_thunder',
        'rain_clearing',
        'rain_wind',
      ]),
    );
  });
});

describe('ghost challenge', () => {
  it('reacts to low tones, close harmony, density, and a surprise after silence', () => {
    const analysis = analyzeChallenge(
      song([note('C4', 0, 2), note('C4', 4, 2), note('C#4', 4, 2), note('D4', 8)]),
      'ghost',
    );

    expect(reactionAt(analysis, 0)?.techniques).toContain('ghost_shadow');
    expect(reactionAt(analysis, 4)?.techniques).toEqual(
      expect.arrayContaining(['ghost_shiver', 'ghost_approach', 'ghost_surprise']),
    );
    expect(reactionAt(analysis, 8)?.techniques).toContain('ghost_surprise');
  });
});

describe('run challenge', () => {
  it('reacts to pulse, tempo, drums, rising motion, and long tones', () => {
    const analysis = analyzeChallenge(
      song([note('C4', 0), note('D4', 2), note('E4', 4, 4)], [hit('hihat', 4)], { bpm: 140 }),
      'run',
    );

    expect(reactionAt(analysis, 4)?.techniques).toEqual(
      expect.arrayContaining(['run_stride', 'run_fast', 'run_footsteps', 'run_uphill', 'run_jump']),
    );
  });
});

describe('challenge analysis invariants', () => {
  it('returns no credited techniques for an empty song', () => {
    expect(analyzeChallenge(song([]), 'rain').usedTechniques).toEqual([]);
    expect(analyzeChallenge(song([], [], { bpm: 160 }), 'run').usedTechniques).toEqual([]);
  });

  it('derives reactions from blocks * stepsPerBeat', () => {
    const analysis = analyzeChallenge(song([note('C4', 0)], [], { blocks: 2 }), 'ghost');
    expect(analysis.reactions).toHaveLength(8);
    expect(reactionAt(analysis, 8)).toEqual(reactionAt(analysis, 0));
  });

  it('does not credit an unused trailing grid as an intentional quiet space', () => {
    const analysis = analyzeChallenge(song([note('C5', 0, 4)]), 'rain');

    expect(reactionAt(analysis, 5)?.techniques).toContain('rain_clearing');
    expect(analysis.usedTechniques).not.toContain('rain_clearing');
  });

  it('credits a quiet space when sound returns after it', () => {
    const analysis = analyzeChallenge(song([note('C5', 0), note('C5', 4)]), 'rain');

    expect(analysis.usedTechniques).toContain('rain_clearing');
  });

  it('ignores an invalid imported note without crashing', () => {
    expect(() =>
      analyzeChallenge(song([note('not-a-note', 0), note('C4', 1)]), 'rain'),
    ).not.toThrow();
  });
});
