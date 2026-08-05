'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { readGuestCompanion, writeGuestCompanion } from '@/creatures/companionStorage';
import type { DiscoveryId } from '@/discovery/types';
import { safeSessionStorage } from '@/lib/browserStorage';

type SaveAccountCompanion = (discoveryId: DiscoveryId | null) => Promise<{ error: unknown }>;

export function useCompanionSelection({
  user,
  authReady,
  profileLoading,
  accountCompanionId,
  saveAccountCompanion,
}: {
  user: User | null;
  authReady: boolean;
  profileLoading: boolean;
  accountCompanionId: DiscoveryId | null;
  saveAccountCompanion: SaveAccountCompanion;
}) {
  const [guestCompanionId, setGuestCompanionId] = useState<DiscoveryId | null>(null);
  const [guestReady, setGuestReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadGuestSelection() {
      await Promise.resolve();
      if (!active) return;
      setGuestCompanionId(readGuestCompanion(safeSessionStorage()));
      setGuestReady(true);
    }
    void loadGuestSelection();
    return () => {
      active = false;
    };
  }, []);

  const selectCompanion = useCallback(
    async (discoveryId: DiscoveryId | null): Promise<{ error: unknown }> => {
      if (user) return saveAccountCompanion(discoveryId);
      setGuestCompanionId(discoveryId);
      writeGuestCompanion(safeSessionStorage(), discoveryId);
      return { error: null };
    },
    [saveAccountCompanion, user],
  );

  return {
    companionDiscoveryId: user ? accountCompanionId : guestCompanionId,
    companionLoading: !authReady || (user ? profileLoading : !guestReady),
    selectCompanion,
  };
}
