'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { DISCOVERY_CARDS, isDiscoveryId } from '@/discovery/catalog';
import {
  clearDiscoveries,
  GUEST_DISCOVERIES_KEY,
  mergeDiscoveries,
  pendingDiscoveriesKey,
  readDiscoveries,
  type StoredDiscovery,
  writeDiscoveries,
} from '@/discovery/storage';
import type { DiscoveryId } from '@/discovery/types';
import { supabase } from '@/lib/supabase';

type DiscoveryRow = {
  card_id: string;
  discovered_at: string;
};

function currentSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function sortProgress(cards: readonly StoredDiscovery[]): StoredDiscovery[] {
  const order = new Map(DISCOVERY_CARDS.map((card) => [card.id, card.sortOrder]));
  return [...cards].sort((a, b) => (order.get(a.cardId) ?? 0) - (order.get(b.cardId) ?? 0));
}

function mergeIntoMap(
  current: ReadonlyMap<DiscoveryId, StoredDiscovery>,
  additions: readonly StoredDiscovery[],
): Map<DiscoveryId, StoredDiscovery> {
  const next = new Map(current);
  for (const item of additions) {
    const existing = next.get(item.cardId);
    if (!existing || item.discoveredAt < existing.discoveredAt) {
      next.set(item.cardId, item);
    }
  }
  return next;
}

async function upsertCards(userId: string, cards: readonly StoredDiscovery[]): Promise<unknown> {
  if (cards.length === 0) return null;
  const { error } = await supabase.from('user_discovery_cards').upsert(
    cards.map((card) => ({
      user_id: userId,
      card_id: card.cardId,
    })),
    {
      onConflict: 'user_id,card_id',
      ignoreDuplicates: true,
    },
  );
  return error;
}

export function useDiscoveries(user: User | null) {
  const [progress, setProgress] = useState<StoredDiscovery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const progressRef = useRef<Map<DiscoveryId, StoredDiscovery>>(new Map());
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const replaceProgress = useCallback((cards: readonly StoredDiscovery[]) => {
    const next = new Map(cards.map((card) => [card.cardId, card]));
    progressRef.current = next;
    setProgress(sortProgress([...next.values()]));
  }, []);

  const addProgress = useCallback((cards: readonly StoredDiscovery[]) => {
    if (cards.length === 0) return;
    const next = mergeIntoMap(progressRef.current, cards);
    progressRef.current = next;
    setProgress(sortProgress([...next.values()]));
  }, []);

  const flushPending = useCallback(async (userId: string): Promise<boolean> => {
    const storage = currentSessionStorage();
    const key = pendingDiscoveriesKey(userId);
    const pending = readDiscoveries(storage, key);
    if (pending.length === 0) return true;
    const error = await upsertCards(userId, pending);
    if (error) {
      setSyncError(true);
      return false;
    }
    const uploadedIds = new Set(pending.map((card) => card.cardId));
    const remaining = readDiscoveries(storage, key).filter((card) => !uploadedIds.has(card.cardId));
    if (remaining.length > 0) {
      writeDiscoveries(storage, key, remaining);
    } else {
      clearDiscoveries(storage, key);
    }
    setSyncError(false);
    return true;
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const storage = currentSessionStorage();
      const guest = readDiscoveries(storage, GUEST_DISCOVERIES_KEY);
      const userId = user?.id;
      const pending = userId ? readDiscoveries(storage, pendingDiscoveriesKey(userId)) : [];

      // Yield once so all initialization updates happen as the result of this
      // asynchronous external-storage read rather than synchronously in the
      // effect body.
      await Promise.resolve();
      if (!active) return;
      setGuestCount(guest.length);
      setIsLoading(true);
      setSyncError(false);

      if (!userId) {
        replaceProgress(guest);
        setIsLoading(false);
        return;
      }

      replaceProgress(pending);
      const { data, error } = await supabase
        .from('user_discovery_cards')
        .select('card_id, discovered_at')
        .eq('user_id', userId);
      if (!active) return;

      if (error) {
        setSyncError(true);
      } else {
        const remote = (data ?? []).flatMap((row) => {
          const typed = row as DiscoveryRow;
          return isDiscoveryId(typed.card_id)
            ? [{ cardId: typed.card_id, discoveredAt: typed.discovered_at }]
            : [];
        });
        replaceProgress(mergeDiscoveries(remote, [...progressRef.current.values()]));
      }
      setIsLoading(false);
      const pendingSynced = await flushPending(userId);
      if (active && (error || !pendingSynced)) setSyncError(true);
    }

    void load();
    return () => {
      active = false;
    };
  }, [flushPending, replaceProgress, user]);

  useEffect(() => {
    if (!user) return;
    const retry = () => {
      void flushPending(user.id);
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [flushPending, user]);

  const claimDiscoveries = useCallback(
    (cardIds: readonly DiscoveryId[]): DiscoveryId[] => {
      const now = new Date().toISOString();
      const additions = [...new Set(cardIds)]
        .filter((cardId) => !progressRef.current.has(cardId))
        .map((cardId) => ({ cardId, discoveredAt: now }));
      if (additions.length === 0) return [];

      addProgress(additions);
      const storage = currentSessionStorage();
      const currentUser = userRef.current;

      if (!currentUser) {
        const saved = writeDiscoveries(
          storage,
          GUEST_DISCOVERIES_KEY,
          mergeDiscoveries(readDiscoveries(storage, GUEST_DISCOVERIES_KEY), additions),
        );
        setGuestCount(saved.length);
        return additions.map((item) => item.cardId);
      }

      const pendingKey = pendingDiscoveriesKey(currentUser.id);
      writeDiscoveries(
        storage,
        pendingKey,
        mergeDiscoveries(readDiscoveries(storage, pendingKey), additions),
      );
      void flushPending(currentUser.id);
      return additions.map((item) => item.cardId);
    },
    [addProgress, flushPending],
  );

  const importGuestDiscoveries = useCallback(async (): Promise<boolean> => {
    const currentUser = userRef.current;
    if (!currentUser) return false;
    const storage = currentSessionStorage();
    const guest = readDiscoveries(storage, GUEST_DISCOVERIES_KEY);
    if (guest.length === 0) return true;

    const error = await upsertCards(currentUser.id, guest);
    if (error) {
      setSyncError(true);
      return false;
    }

    addProgress(guest);
    clearDiscoveries(storage, GUEST_DISCOVERIES_KEY);
    setGuestCount(0);
    setSyncError(false);
    return true;
  }, [addProgress]);

  const discardGuestDiscoveries = useCallback(() => {
    clearDiscoveries(currentSessionStorage(), GUEST_DISCOVERIES_KEY);
    setGuestCount(0);
  }, []);

  const retrySync = useCallback(async (): Promise<boolean> => {
    const currentUser = userRef.current;
    if (!currentUser) return true;

    const pendingSynced = await flushPending(currentUser.id);
    const { data, error } = await supabase
      .from('user_discovery_cards')
      .select('card_id, discovered_at')
      .eq('user_id', currentUser.id);
    if (error) {
      setSyncError(true);
      return false;
    }

    const remote = (data ?? []).flatMap((row) => {
      const typed = row as DiscoveryRow;
      return isDiscoveryId(typed.card_id)
        ? [{ cardId: typed.card_id, discoveredAt: typed.discovered_at }]
        : [];
    });
    replaceProgress(mergeDiscoveries(remote, [...progressRef.current.values()]));
    setSyncError(!pendingSynced);
    return pendingSynced;
  }, [flushPending, replaceProgress]);

  return {
    progress,
    earnedIds: new Set(progress.map((item) => item.cardId)),
    isLoading,
    syncError,
    guestCount,
    claimDiscoveries,
    importGuestDiscoveries,
    discardGuestDiscoveries,
    retrySync,
  };
}
