import type { PostgrestError } from '@supabase/supabase-js';
import { isDiscoveryId } from '@/discovery/catalog';
import { mergeDiscoveries, type StoredDiscovery } from '@/discovery/storage';
import { supabase } from './supabase';

type DiscoveryRow = {
  card_id: string;
  discovered_at: string;
};

export async function fetchUserDiscoveries(
  userId: string,
): Promise<{ cards: StoredDiscovery[]; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('user_discovery_cards')
    .select('card_id, discovered_at')
    .eq('user_id', userId);

  if (error) return { cards: [], error };

  const cards = (data ?? []).flatMap((row) => {
    const typed = row as DiscoveryRow;
    return isDiscoveryId(typed.card_id)
      ? [{ cardId: typed.card_id, discoveredAt: typed.discovered_at }]
      : [];
  });
  return { cards: mergeDiscoveries([], cards), error: null };
}

export async function insertUserDiscoveries(
  userId: string,
  cards: readonly StoredDiscovery[],
): Promise<PostgrestError | null> {
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
