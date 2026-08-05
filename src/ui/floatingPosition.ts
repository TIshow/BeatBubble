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
