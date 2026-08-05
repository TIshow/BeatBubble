import { describe, expect, it } from 'vitest';
import { clampFloatingPosition } from './floatingPosition';

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
