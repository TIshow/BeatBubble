import { isDiscoveryId } from '@/discovery/catalog';
import type { DiscoveryId } from '@/discovery/types';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type StoredCompanion = {
  version: 1;
  discoveryId: DiscoveryId;
};

export const GUEST_COMPANION_KEY = 'beatbubble-companion-v1';

export function readGuestCompanion(storage: StorageLike | null): DiscoveryId | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(GUEST_COMPANION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('version' in parsed) ||
      parsed.version !== 1 ||
      !('discoveryId' in parsed) ||
      !isDiscoveryId(parsed.discoveryId)
    ) {
      return null;
    }
    return parsed.discoveryId;
  } catch {
    return null;
  }
}

export function writeGuestCompanion(
  storage: StorageLike | null,
  discoveryId: DiscoveryId | null,
): void {
  if (!storage) return;
  try {
    if (!discoveryId) {
      storage.removeItem(GUEST_COMPANION_KEY);
      return;
    }
    const value: StoredCompanion = { version: 1, discoveryId };
    storage.setItem(GUEST_COMPANION_KEY, JSON.stringify(value));
  } catch {
    // Storage can be disabled or full. The hook still retains in-memory state.
  }
}
