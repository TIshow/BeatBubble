import type { Song } from '@/core/types';
import type { FriendError } from '@/lib/aiClient';

// What the companion says when tapped (#151), apart from React and the network.

/** The companion's own fixed lines — never from AI, so never marked as AI. */
export type OwnLine = 'thinking' | 'empty' | 'no-words' | 'limit' | 'unavailable';

export type Speech = { kind: 'ai'; text: string } | { kind: 'own'; line: OwnLine };

/**
 * The lines already heard for one score, and which to say next. Kept so that
 * tapping again moves on to another place in the same song without asking
 * again: a new request goes out only once the song has changed.
 */
export type Heard = { score: string; lines: string[]; next: number };

/** Nothing to listen to yet: there is no point asking about silence. */
export function isSilent(song: Song): boolean {
  return song.melody.notes.length === 0 && song.drums.hits.length === 0;
}

/**
 * What to say for this score from what was already heard, or null to ask.
 * Goes round again after the last line. A score that got no lines stays
 * answered — asking the same notes again would spend the school's allowance on
 * what is most likely the same silence.
 */
export function replay(heard: Heard | null, score: string): { speech: Speech; heard: Heard } | null {
  if (!heard || heard.score !== score) return null;
  if (heard.lines.length === 0) return { speech: { kind: 'own', line: 'no-words' }, heard };
  const text = heard.lines[heard.next % heard.lines.length];
  return { speech: { kind: 'ai', text }, heard: { ...heard, next: heard.next + 1 } };
}

/** The companion's answer when asking failed. */
export function lineForError(error: FriendError): OwnLine {
  return error === 'limit' ? 'limit' : 'unavailable';
}
