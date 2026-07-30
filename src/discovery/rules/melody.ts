import type { TimelineOnset } from '../timeline';
import type { DiscoveryMatch } from '../types';
import { makeMatch, type DiscoveryRule } from './shared';

const stepwiseRun: DiscoveryRule = (timeline) => {
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

const callAndResponse: DiscoveryRule = (timeline) => {
  const matches: DiscoveryMatch[] = [];
  const line = timeline.onsets;
  const phraseOnsets = 3;

  for (let i = 0; i + phraseOnsets * 2 <= line.length; i++) {
    const call = line.slice(i, i + phraseOnsets);
    const response = line.slice(i + phraseOnsets, i + phraseOnsets * 2);
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
    i += phraseOnsets * 2 - 1;
  }

  return matches;
};

export const MELODY_RULES: readonly DiscoveryRule[] = [stepwiseRun, callAndResponse];
