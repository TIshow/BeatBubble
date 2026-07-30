import type { DiscoveryTimeline, TimelineNote } from '../timeline';
import type { DiscoveryId, DiscoveryMatch } from '../types';
import { makeMatch, type DiscoveryRule } from './shared';

function intervalClass(a: TimelineNote, b: TimelineNote): number {
  const distance = Math.abs(a.midi - b.midi) % 12;
  return Math.min(distance, 12 - distance);
}

function overlappingIntervalMatches(
  timeline: DiscoveryTimeline,
  cardId: DiscoveryId,
  predicate: (a: TimelineNote, b: TimelineNote) => boolean,
): DiscoveryMatch[] {
  const matches: DiscoveryMatch[] = [];
  const seenPairs = new Set<string>();

  for (const frame of timeline.steps) {
    for (let i = 0; i < frame.activeNotes.length; i++) {
      for (let j = i + 1; j < frame.activeNotes.length; j++) {
        const a = frame.activeNotes[i];
        const b = frame.activeNotes[j];
        const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
        if (seenPairs.has(key) || !predicate(a, b)) continue;
        seenPairs.add(key);
        matches.push(makeMatch(cardId, frame.step, frame.step, [a.id, b.id]));
      }
    }
  }

  return matches;
}

const intervalThird: DiscoveryRule = (timeline) =>
  overlappingIntervalMatches(timeline, 'interval_third', (a, b) => {
    const distance = Math.abs(a.midi - b.midi) % 12;
    return distance === 3 || distance === 4;
  });

const openFifth: DiscoveryRule = (timeline) =>
  overlappingIntervalMatches(timeline, 'open_fifth', (a, b) => {
    const distance = Math.abs(a.midi - b.midi);
    return distance % 12 === 7 || (distance >= 12 && distance % 12 === 0);
  });

const closeTension: DiscoveryRule = (timeline) =>
  overlappingIntervalMatches(timeline, 'close_tension', (a, b) => intervalClass(a, b) === 1);

export const HARMONY_RULES: readonly DiscoveryRule[] = [intervalThird, openFifth, closeTension];
