export interface FloatingPoint {
  left: number;
  top: number;
}

export interface FloatingSize {
  width: number;
  height: number;
}

export interface FloatingInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clamps a floating element to the usable inset rectangle. */
export function clampFloatingPosition(
  point: FloatingPoint,
  element: FloatingSize,
  viewport: FloatingSize,
  insets: FloatingInsets,
): FloatingPoint {
  const maxLeft = Math.max(insets.left, viewport.width - insets.right - element.width);
  const maxTop = Math.max(insets.top, viewport.height - insets.bottom - element.height);

  return {
    left: clamp(point.left, insets.left, maxLeft),
    top: clamp(point.top, insets.top, maxTop),
  };
}

/** How far a press may wander and still be a tap — fingers wobble. */
export const TAP_SLOP = 6;

/** Whether a press has moved far enough to be a drag rather than a tap. */
export function movedBeyondTap(dx: number, dy: number): boolean {
  return dx * dx + dy * dy > TAP_SLOP * TAP_SLOP;
}

/** Room a speech bubble needs above the element before it goes below instead. */
export const BUBBLE_ROOM = 200;

export interface BubbleSide {
  vertical: 'above' | 'below';
  /** 'start' grows rightwards from the element's left edge; 'end' leftwards from its right. */
  horizontal: 'start' | 'end';
}

/** Where a speech bubble fits beside a floating element, so it stays onscreen. */
export function bubbleSide(
  rect: { left: number; top: number; width: number },
  viewportWidth: number,
): BubbleSide {
  return {
    vertical: rect.top < BUBBLE_ROOM ? 'below' : 'above',
    horizontal: rect.left + rect.width / 2 < viewportWidth / 2 ? 'start' : 'end',
  };
}
