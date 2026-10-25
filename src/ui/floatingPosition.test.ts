import { describe, expect, it } from 'vitest';
import {
  BUBBLE_ROOM,
  bubbleSide,
  clampFloatingPosition,
  movedBeyondTap,
  TAP_SLOP,
} from './floatingPosition';

const viewport = { width: 800, height: 600 };
const element = { width: 120, height: 140 };
const insets = { top: 80, right: 12, bottom: 12, left: 12 };

describe('clampFloatingPosition', () => {
  it('keeps a point that is already inside the usable viewport', () => {
    expect(clampFloatingPosition({ left: 300, top: 200 }, element, viewport, insets)).toEqual({
      left: 300,
      top: 200,
    });
  });

  it('keeps the floating element below the header and inside every viewport edge', () => {
    expect(clampFloatingPosition({ left: -40, top: 20 }, element, viewport, insets)).toEqual({
      left: 12,
      top: 80,
    });
    expect(clampFloatingPosition({ left: 900, top: 700 }, element, viewport, insets)).toEqual({
      left: 668,
      top: 448,
    });
  });

  it('uses the safe inset when the floating element is larger than the usable viewport', () => {
    expect(
      clampFloatingPosition(
        { left: 100, top: 100 },
        { width: 500, height: 500 },
        { width: 320, height: 400 },
        insets,
      ),
    ).toEqual({ left: 12, top: 80 });
  });
});

describe('movedBeyondTap', () => {
  it('treats a wobble as a tap and a real move as a drag', () => {
    expect(movedBeyondTap(0, 0)).toBe(false);
    expect(movedBeyondTap(3, -4)).toBe(false);
    expect(movedBeyondTap(TAP_SLOP, 0)).toBe(false);
    expect(movedBeyondTap(TAP_SLOP + 1, 0)).toBe(true);
    expect(movedBeyondTap(-5, 5)).toBe(true);
  });
});

describe('bubbleSide', () => {
  const width = 112;

  it('puts the bubble above and growing leftwards from where the companion starts, bottom right', () => {
    expect(bubbleSide({ left: 676, top: 476, width }, 800)).toEqual({ vertical: 'above', horizontal: 'end' });
  });

  it('flips below near the top and rightwards on the left half, so it stays onscreen', () => {
    expect(bubbleSide({ left: 12, top: BUBBLE_ROOM - 1, width }, 800)).toEqual({
      vertical: 'below',
      horizontal: 'start',
    });
  });
});
