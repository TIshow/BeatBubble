import type { Song } from '@/core/types';
import type { DiscoveryMatch } from './types';

export type DiscoverySourceSnapshot = {
  notes: Readonly<Record<string, string>>;
  hits: Readonly<Record<string, string>>;
};

function noteFingerprint(note: Song['melody']['notes'][number]): string {
  // Lock state is deliberately excluded: locking an unchanged source note is
  // not a musical contribution and must not make an imported match earnable.
  return `${note.note}:${note.startStep}:${note.durationSteps}`;
}

function hitFingerprint(hit: Song['drums']['hits'][number]): string {
  return `${hit.drumId}:${hit.step}`;
}

export function captureDiscoverySource(song: Song): DiscoverySourceSnapshot {
  return {
    notes: Object.fromEntries(song.melody.notes.map((note) => [note.id, noteFingerprint(note)])),
    hits: Object.fromEntries(song.drums.hits.map((hit) => [hit.id, hitFingerprint(hit)])),
  };
}

export function hasUserContribution(
  match: DiscoveryMatch,
  song: Song,
  source: DiscoverySourceSnapshot | null,
): boolean {
  // A fresh, restored, or owned composition has no external baseline.
  if (!source) return true;

  const notesById = new Map(song.melody.notes.map((note) => [note.id, note]));
  const hitsById = new Map(song.drums.hits.map((hit) => [hit.id, hit]));

  for (const noteId of match.evidenceNoteIds) {
    const note = notesById.get(noteId);
    if (!note) continue;
    const original = source.notes[noteId];
    if (original === undefined || original !== noteFingerprint(note)) return true;
  }

  for (const hitId of match.evidenceHitIds) {
    const hit = hitsById.get(hitId);
    if (!hit) continue;
    const original = source.hits[hitId];
    if (original === undefined || original !== hitFingerprint(hit)) return true;
  }

  return false;
}
