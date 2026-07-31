import type { SongTimeline } from '@/core/timeline';

export { buildSongTimeline as buildDiscoveryTimeline } from '@/core/timeline';
export type { TimelineNote, TimelineOnset, TimelineStep } from '@/core/timeline';

export type DiscoveryTimeline = SongTimeline;
