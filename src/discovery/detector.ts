import type { Song } from '@/core/types';
import { DISCOVERY_CARDS } from './catalog';
import {
  buildDiscoveryTimeline,
  type DiscoveryTimeline,
  type TimelineNote,
  type TimelineOnset,
} from './timeline';
import type { DiscoveryId, DiscoveryMatch } from './types';

type Rule = (timeline: DiscoveryTimeline) => DiscoveryMatch[];

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function makeMatch(
  cardId: DiscoveryId,
  startStep: number,
  triggerStep: number,
  noteIds: string[],
  hitIds: string[] = [],
): DiscoveryMatch {
  return {
    cardId,
    startStep,
    triggerStep,
    evidenceNoteIds: sortedUnique(noteIds),
    evidenceHitIds: sortedUnique(hitIds),
  };
}

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

const intervalThird: Rule = (timeline) =>
  overlappingIntervalMatches(timeline, 'interval_third', (a, b) => {
    const distance = Math.abs(a.midi - b.midi) % 12;
    return distance === 3 || distance === 4;
  });

const openFifth: Rule = (timeline) =>
  overlappingIntervalMatches(timeline, 'open_fifth', (a, b) => {
    const distance = Math.abs(a.midi - b.midi);
    return distance % 12 === 7 || (distance >= 12 && distance % 12 === 0);
  });

const closeTension: Rule = (timeline) =>
  overlappingIntervalMatches(timeline, 'close_tension', (a, b) => intervalClass(a, b) === 1);

const stepwiseRun: Rule = (timeline) => {
  const matches: DiscoveryMatch[] = [];
  const line = timeline.onsets;
  let runStart = 0;
  let runLength = line.length > 0 ? 1 : 0;
  let direction = 0;

  for (let i = 1; i < line.length; i++) {
    const semitones = line[i].topNote.midi - line[i - 1].topNote.midi;
    const nextDirection = Math.sign(semitones);
    const gap = line[i].step - line[i - 1].step;
    const isStep =
      nextDirection !== 0 && Math.abs(semitones) <= 2 && gap > 0 && gap <= timeline.stepsPerBeat;

    if (!isStep) {
      runStart = i;
      runLength = 1;
      direction = 0;
      continue;
    }

    if (direction === 0 || direction === nextDirection) {
      if (runLength === 1) runStart = i - 1;
      runLength += 1;
      direction = nextDirection;
    } else {
      runStart = i - 1;
      runLength = 2;
      direction = nextDirection;
    }

    if (runLength === 4) {
      const run = line.slice(runStart, i + 1);
      matches.push(
        makeMatch(
          'stepwise_run',
          run[0].step,
          run[run.length - 1].step,
          run.map((onset) => onset.topNote.id),
        ),
      );
    }
  }

  return matches;
};

function relativeRhythm(onsets: TimelineOnset[]): number[] {
  const start = onsets[0].step;
  return onsets.map((onset) => onset.step - start);
}

function contour(onsets: TimelineOnset[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    result.push(onsets[i].topNote.midi - onsets[i - 1].topNote.midi);
  }
  return result;
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const callAndResponse: Rule = (timeline) => {
  const matches: DiscoveryMatch[] = [];
  const line = timeline.onsets;
  const PHRASE_ONSETS = 3;

  for (let i = 0; i + PHRASE_ONSETS * 2 <= line.length; i++) {
    const call = line.slice(i, i + PHRASE_ONSETS);
    const response = line.slice(i + PHRASE_ONSETS, i + PHRASE_ONSETS * 2);
    const callSpan = call[call.length - 1].step - call[0].step;
    const phraseGap = response[0].step - call[call.length - 1].step;

    if (
      callSpan < 1 ||
      phraseGap < 2 ||
      phraseGap > timeline.stepsPerBeat * 2 ||
      !arraysEqual(relativeRhythm(call), relativeRhythm(response)) ||
      !arraysEqual(contour(call), contour(response))
    ) {
      continue;
    }

    matches.push(
      makeMatch(
        'call_and_response',
        call[0].step,
        response[response.length - 1].step,
        [...call, ...response].map((onset) => onset.topNote.id),
      ),
    );
    i += PHRASE_ONSETS * 2 - 1;
  }

  return matches;
};

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

const restThenBurst: Rule = (timeline) => {
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

const rhythmLoop: Rule = (timeline) => {
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

const sustainContrast: Rule = (timeline) => {
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

const RULES: readonly Rule[] = [
  intervalThird,
  openFifth,
  closeTension,
  stepwiseRun,
  callAndResponse,
  restThenBurst,
  rhythmLoop,
  sustainContrast,
];

const SORT_ORDER = new Map(DISCOVERY_CARDS.map((card) => [card.id, card.sortOrder]));

export function detectDiscoveries(song: Song): DiscoveryMatch[] {
  const timeline = buildDiscoveryTimeline(song);
  return RULES.flatMap((rule) => rule(timeline)).sort(
    (a, b) =>
      a.triggerStep - b.triggerStep ||
      (SORT_ORDER.get(a.cardId) ?? 0) - (SORT_ORDER.get(b.cardId) ?? 0) ||
      a.startStep - b.startStep,
  );
}
