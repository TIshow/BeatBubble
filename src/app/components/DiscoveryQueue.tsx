import type { DiscoveryRevealItem } from '@/discovery/revealQueue';
import type { Translations } from '@/lib/i18n';
import { DiscoveryReveal } from './DiscoveryReveal';

interface Props {
  items: readonly DiscoveryRevealItem[];
  t: Translations;
  onDone: () => void;
}

export function DiscoveryQueue({ items, t, onDone }: Props) {
  const current = items[0];
  return current ? <DiscoveryReveal item={current} t={t} onDone={onDone} /> : null;
}
