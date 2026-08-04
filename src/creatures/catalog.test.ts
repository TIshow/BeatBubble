import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISCOVERY_IDS } from '@/discovery/catalog';
import { translations } from '@/lib/i18n';
import { CREATURE_CATALOG, CREATURES, creatureForDiscovery } from './catalog';
import { CREATURE_REVEAL_EFFECTS } from './types';

describe('creature catalog invariants', () => {
  it('maps every discovery exactly once and keeps discovery order', () => {
    expect(Object.keys(CREATURE_CATALOG)).toEqual(DISCOVERY_IDS);
    expect(CREATURES.map((creature) => creature.discoveryId)).toEqual(DISCOVERY_IDS);
    expect(new Set(CREATURES.map((creature) => creature.discoveryId)).size).toBe(
      DISCOVERY_IDS.length,
    );
  });

  it('keeps ids and portrait paths aligned', () => {
    for (const id of DISCOVERY_IDS) {
      const creature = creatureForDiscovery(id);
      expect(creature.discoveryId).toBe(id);
      expect(creature.portraitPath).toBe(`/creatures/${id}/portrait.png`);
      expect(CREATURE_REVEAL_EFFECTS).toContain(creature.revealEffect);
    }
  });

  it('points to an existing portrait for every creature', () => {
    for (const creature of CREATURES) {
      expect(existsSync(resolve('public', creature.portraitPath.slice(1)))).toBe(true);
    }
  });

  it('has complete child-facing copy in every locale', () => {
    for (const locale of Object.values(translations)) {
      expect(Object.keys(locale.creatures)).toEqual(DISCOVERY_IDS);
      for (const creature of CREATURES) {
        const copy = locale.creatures[creature.discoveryId];
        expect(copy.name.trim()).not.toBe('');
        expect(copy.personality.trim()).not.toBe('');
        expect(copy.reveal.trim()).not.toBe('');
        expect(copy.description.trim()).not.toBe('');
        expect(copy.hint.trim()).not.toBe('');
        expect(copy.theory.trim()).not.toBe('');
        expect(copy.alt.trim()).toContain(copy.name);
      }
    }
  });
});
