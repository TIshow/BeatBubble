import { describe, expect, it } from 'vitest';
import { CHALLENGE_CARDS, CHALLENGE_IDS } from './catalog';

describe('challenge catalog invariants', () => {
  it('keeps at least three uniquely addressable open-ended prompts', () => {
    expect(CHALLENGE_CARDS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(CHALLENGE_IDS).size).toBe(CHALLENGE_IDS.length);
  });

  it('gives every prompt multiple distinct ways to affect its world', () => {
    for (const card of CHALLENGE_CARDS) {
      expect(card.techniqueIds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(card.techniqueIds).size).toBe(card.techniqueIds.length);
    }
  });

  it('does not reuse a scene-specific technique in another prompt', () => {
    const techniqueIds = CHALLENGE_CARDS.flatMap((card) => [...card.techniqueIds]);
    expect(new Set(techniqueIds).size).toBe(techniqueIds.length);
  });
});
