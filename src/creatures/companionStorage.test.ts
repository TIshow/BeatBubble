import { describe, expect, it } from 'vitest';
import { GUEST_COMPANION_KEY, readGuestCompanion, writeGuestCompanion } from './companionStorage';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe('guest companion storage', () => {
  it('round-trips a versioned discovery ID', () => {
    const storage = memoryStorage();
    writeGuestCompanion(storage, 'interval_third');
    expect(readGuestCompanion(storage)).toBe('interval_third');
  });

  it('rejects unknown IDs and malformed payloads', () => {
    const storage = memoryStorage();
    storage.setItem(
      GUEST_COMPANION_KEY,
      JSON.stringify({ version: 1, discoveryId: 'not-a-creature' }),
    );
    expect(readGuestCompanion(storage)).toBeNull();

    storage.setItem(GUEST_COMPANION_KEY, '{bad json');
    expect(readGuestCompanion(storage)).toBeNull();
  });

  it('removes the selection when no companion is chosen', () => {
    const storage = memoryStorage();
    writeGuestCompanion(storage, 'open_fifth');
    writeGuestCompanion(storage, null);
    expect(readGuestCompanion(storage)).toBeNull();
  });

  it('treats unavailable storage as no selection', () => {
    expect(readGuestCompanion(null)).toBeNull();
    expect(() => writeGuestCompanion(null, 'rhythm_loop')).not.toThrow();
  });
});
