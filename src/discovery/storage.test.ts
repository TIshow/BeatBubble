import { describe, expect, it } from 'vitest';
import {
  clearDiscoveries,
  GUEST_DISCOVERIES_KEY,
  mergeDiscoveries,
  pendingDiscoveriesKey,
  readDiscoveries,
  type StorageLike,
  writeDiscoveries,
} from './storage';

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe('discovery storage', () => {
  it('round-trips versioned guest progress', () => {
    const storage = memoryStorage();
    writeDiscoveries(storage, GUEST_DISCOVERIES_KEY, [
      { cardId: 'interval_third', discoveredAt: '2026-07-30T01:00:00.000Z' },
    ]);
    expect(readDiscoveries(storage, GUEST_DISCOVERIES_KEY)).toEqual([
      { cardId: 'interval_third', discoveredAt: '2026-07-30T01:00:00.000Z' },
    ]);
  });

  it('ignores unknown IDs, invalid timestamps, and malformed payloads', () => {
    const storage = memoryStorage();
    storage.setItem(
      GUEST_DISCOVERIES_KEY,
      JSON.stringify({
        version: 1,
        cards: [
          { cardId: 'not-a-card', discoveredAt: '2026-07-30T01:00:00.000Z' },
          { cardId: 'interval_third', discoveredAt: 'not-a-date' },
          { cardId: 'open_fifth', discoveredAt: '2026-07-30T02:00:00.000Z' },
        ],
      }),
    );
    expect(readDiscoveries(storage, GUEST_DISCOVERIES_KEY)).toEqual([
      { cardId: 'open_fifth', discoveredAt: '2026-07-30T02:00:00.000Z' },
    ]);

    storage.setItem(GUEST_DISCOVERIES_KEY, '{bad json');
    expect(readDiscoveries(storage, GUEST_DISCOVERIES_KEY)).toEqual([]);
  });

  it('deduplicates by card ID and preserves the earliest discovery', () => {
    expect(
      mergeDiscoveries(
        [{ cardId: 'interval_third', discoveredAt: '2026-07-30T03:00:00.000Z' }],
        [
          { cardId: 'interval_third', discoveredAt: '2026-07-30T01:00:00.000Z' },
          { cardId: 'open_fifth', discoveredAt: '2026-07-30T02:00:00.000Z' },
        ],
      ),
    ).toEqual([
      { cardId: 'interval_third', discoveredAt: '2026-07-30T01:00:00.000Z' },
      { cardId: 'open_fifth', discoveredAt: '2026-07-30T02:00:00.000Z' },
    ]);
  });

  it('clears stored progress and scopes pending writes by user', () => {
    const storage = memoryStorage();
    writeDiscoveries(storage, GUEST_DISCOVERIES_KEY, [
      { cardId: 'interval_third', discoveredAt: '2026-07-30T01:00:00.000Z' },
    ]);
    clearDiscoveries(storage, GUEST_DISCOVERIES_KEY);
    expect(readDiscoveries(storage, GUEST_DISCOVERIES_KEY)).toEqual([]);
    expect(pendingDiscoveriesKey('user-a')).not.toBe(pendingDiscoveriesKey('user-b'));
  });
});
