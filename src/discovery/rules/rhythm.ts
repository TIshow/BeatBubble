import type { DiscoveryTimeline } from '../timeline';
import type { DiscoveryMatch } from '../types';
import { makeMatch, type DiscoveryRule } from './shared';

function eventIdsInBeat(
  timeline: DiscoveryTimeline,
  beat: number,
): {
  noteIds: string[];
  hitIds: string[];
  eventSteps: number[];
} {
  const start = beat * timeline.stepsPerBeat;
  const end = Math.min(timeline.totalSteps, start + timeline.stepsPerBeat);
  const noteIds: string[] = [];
  const hitIds: string[] = [];
  const eventSteps: number[] = [];

  for (let step = start; step < end; step++) {
    const frame = timeline.steps[step];
    if (frame.startingNotes.length > 0 || frame.hits.length > 0) {
      eventSteps.push(step);
    }
    noteIds.push(...frame.startingNotes.map((note) => note.id));
    hitIds.push(...frame.hits.map((hit) => hit.id));
  }

  return { noteIds, hitIds, eventSteps };
}

const restThenBurst: DiscoveryRule = (timeline) => {
  const matches: DiscoveryMatch[] = [];
  const beats = Math.ceil(timeline.totalSteps / timeline.stepsPerBeat);

  for (let beat = 1; beat < beats; beat++) {
    const restStart = (beat - 1) * timeline.stepsPerBeat;
    const burstStart = beat * timeline.stepsPerBeat;
    const previousBeatIsSilent = timeline.steps
      .slice(restStart, burstStart)
      .every((frame) => frame.activeNotes.length === 0 && frame.hits.length === 0);
    if (!previousBeatIsSilent) continue;

    const burst = eventIdsInBeat(timeline, beat);
    const eventCount = burst.noteIds.length + burst.hitIds.length;
    if (eventCount < 3 || burst.eventSteps.length === 0) continue;

    matches.push(
      makeMatch(
        'rest_then_burst',
        restStart,
        burst.eventSteps[burst.eventSteps.length - 1],
        burst.noteIds,
        burst.hitIds,
      ),
    );
  }

  return matches;
};

function beatRhythmSignature(
  timeline: DiscoveryTimeline,
  beat: number,
): {
  signature: string;
  noteIds: string[];
  hitIds: string[];
  eventCount: number;
  lastStep: number;
} {
  const start = beat * timeline.stepsPerBeat;
  const end = Math.min(timeline.totalSteps, start + timeline.stepsPerBeat);
  const tokens: string[] = [];
  const noteIds: string[] = [];
  const hitIds: string[] = [];
  let lastStep = start;

  for (let step = start; step < end; step++) {
    const relativeStep = step - start;
    const frame = timeline.steps[step];
    for (const note of frame.startingNotes) {
      tokens.push(`m:${relativeStep}:${Math.min(note.durationSteps, timeline.stepsPerBeat)}`);
      noteIds.push(note.id);
      lastStep = step;
    }
    for (const hit of frame.hits) {
      tokens.push(`d:${relativeStep}:${hit.drumId}`);
      hitIds.push(hit.id);
      lastStep = step;
    }
  }

  return {
    signature: tokens.sort().join('|'),
    noteIds,
    hitIds,
    eventCount: noteIds.length + hitIds.length,
    lastStep,
  };
}

const rhythmLoop: DiscoveryRule = (timeline) => {
  const matches: DiscoveryMatch[] = [];
  const beats = Math.floor(timeline.totalSteps / timeline.stepsPerBeat);

  for (let beat = 0; beat + 1 < beats; beat++) {
    const first = beatRhythmSignature(timeline, beat);
    const second = beatRhythmSignature(timeline, beat + 1);
    if (
      first.eventCount < 2 ||
      first.signature.length === 0 ||
      first.signature !== second.signature
    ) {
      continue;
    }

    matches.push(
      makeMatch(
        'rhythm_loop',
        beat * timeline.stepsPerBeat,
        second.lastStep,
        [...first.noteIds, ...second.noteIds],
        [...first.hitIds, ...second.hitIds],
      ),
    );
    beat += 1;
  }

  return matches;
};

const sustainContrast: DiscoveryRule = (timeline) => {
  const matches: DiscoveryMatch[] = [];
  const notes = timeline.steps.flatMap((frame) => frame.startingNotes);
  const shortNotes = notes.filter((note) => note.durationSteps === 1);

  for (const sustained of notes) {
    if (sustained.durationSteps < timeline.stepsPerBeat) continue;
    const following = shortNotes
      .filter(
        (note) =>
          note.startStep >= sustained.endStep &&
          note.startStep < sustained.endStep + timeline.stepsPerBeat,
      )
      .sort((a, b) => a.startStep - b.startStep || a.midi - b.midi);
    if (following.length < 2) continue;

    const pair = following.slice(0, 2);
    matches.push(
      makeMatch('sustain_contrast', sustained.startStep, pair[1].startStep, [
        sustained.id,
        ...pair.map((note) => note.id),
      ]),
    );
  }

  return matches;
};

export const RHYTHM_RULES: readonly DiscoveryRule[] = [restThenBurst, rhythmLoop, sustainContrast];
