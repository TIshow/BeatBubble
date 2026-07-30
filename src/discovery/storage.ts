import { isDiscoveryId } from './catalog';
import type { DiscoveryId } from './types';

export type StoredDiscovery = {
  cardId: DiscoveryId;
  discoveredAt: string;
};

type StoredPayload = {
  version: 1;
  cards: StoredDiscovery[];
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const GUEST_DISCOVERIES_KEY = 'beatbubble-discoveries-v1';
const PENDING_KEY_PREFIX = 'beatbubble-discovery-pending-v1:';

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function normalizeCards(value: unknown): StoredDiscovery[] {
  if (!Array.isArray(value)) return [];
  const earliestById = new Map<DiscoveryId, StoredDiscovery>();

  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      !('cardId' in item) ||
      !('discoveredAt' in item) ||
      !isDiscoveryId(item.cardId) ||
      !isTimestamp(item.discoveredAt)
    ) {
      continue;
    }
    const next: StoredDiscovery = {
      cardId: item.cardId,
      discoveredAt: item.discoveredAt,
    };
    const current = earliestById.get(next.cardId);
    if (!current || next.discoveredAt < current.discoveredAt) {
      earliestById.set(next.cardId, next);
    }
  }

  return [...earliestById.values()].sort(
    (a, b) => a.discoveredAt.localeCompare(b.discoveredAt) || a.cardId.localeCompare(b.cardId),
  );
}

export function readDiscoveries(storage: StorageLike | null, key: string): StoredDiscovery[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('version' in parsed) ||
      parsed.version !== 1 ||
      !('cards' in parsed)
    ) {
      return [];
    }
    return normalizeCards(parsed.cards);
  } catch {
    return [];
  }
}

export function writeDiscoveries(
  storage: StorageLike | null,
  key: string,
  cards: readonly StoredDiscovery[],
): StoredDiscovery[] {
  const normalized = normalizeCards(cards);
  if (!storage) return normalized;
  const payload: StoredPayload = { version: 1, cards: normalized };
  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage may be disabled or full. The caller still keeps in-memory state.
  }
  return normalized;
}

export function mergeDiscoveries(
  existing: readonly StoredDiscovery[],
  additions: readonly StoredDiscovery[],
): StoredDiscovery[] {
  return normalizeCards([...existing, ...additions]);
}

export function clearDiscoveries(storage: StorageLike | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Treat unavailable storage as already cleared.
  }
}

export function pendingDiscoveriesKey(userId: string): string {
  return `${PENDING_KEY_PREFIX}${userId}`;
}
