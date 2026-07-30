import type { Translations } from '@/lib/i18n';

interface DiscoveryAlbumProgressProps {
  earned: number;
  total: number;
  t: Translations;
}

export function DiscoveryAlbumProgress({ earned, total, t }: DiscoveryAlbumProgressProps) {
  const percentage = total === 0 ? 0 : Math.round((earned / total) * 100);
  return (
    <>
      <div className="discoveries-progress-label">{t.discoveryProgress(earned, total)}</div>
      <div
        className="discoveries-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={earned}
        aria-label={t.discoveryProgress(earned, total)}
      >
        <div className="discoveries-progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </>
  );
}
