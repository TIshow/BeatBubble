'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  RefObject,
} from 'react';
import {
  clampFloatingPosition,
  movedBeyondTap,
  type FloatingInsets,
  type FloatingPoint,
  type FloatingSize,
} from '@/ui/floatingPosition';

const VIEWPORT_GUTTER = 12;
const HEADER_GAP = 8;
const KEYBOARD_STEP = 12;
// How soon after a press its click arrives, at most.
const CLICK_AFTER_PRESS_MS = 500;
const KEYBOARD_DIRECTIONS: Partial<Record<string, FloatingPoint>> = {
  ArrowLeft: { left: -1, top: 0 },
  ArrowRight: { left: 1, top: 0 },
  ArrowUp: { left: 0, top: -1 },
  ArrowDown: { left: 0, top: 1 },
};

interface DragState {
  pointerId: number;
  offsetLeft: number;
  offsetTop: number;
  startX: number;
  startY: number;
  // False until the press wanders past TAP_SLOP; until then it may be a tap.
  moved: boolean;
  bounds: FloatingBounds;
}

interface FloatingBounds {
  element: FloatingSize;
  viewport: FloatingSize;
  insets: FloatingInsets;
}

interface FloatingCompanionDrag {
  rootRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties | undefined;
  isDragging: boolean;
  handleProps: {
    onPointerDown: PointerEventHandler<HTMLButtonElement>;
    onPointerMove: PointerEventHandler<HTMLButtonElement>;
    onPointerUp: PointerEventHandler<HTMLButtonElement>;
    onPointerCancel: PointerEventHandler<HTMLButtonElement>;
    onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
    onClick: MouseEventHandler<HTMLButtonElement>;
  };
}

interface FloatingCompanionOptions {
  /** A press that didn't move, or Enter/Space on the focused handle. */
  onTap?: () => void;
  /** The moment a press turns into a drag. */
  onDragStart?: () => void;
}

function readFloatingBounds(
  root: HTMLElement,
  rootRect = root.getBoundingClientRect(),
): FloatingBounds {
  const headerBottom =
    document.querySelector<HTMLElement>('.header')?.getBoundingClientRect().bottom ?? 0;

  return {
    element: { width: rootRect.width, height: rootRect.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    insets: {
      top: Math.max(VIEWPORT_GUTTER, headerBottom + HEADER_GAP),
      right: VIEWPORT_GUTTER,
      bottom: VIEWPORT_GUTTER,
      left: VIEWPORT_GUTTER,
    },
  };
}

function keepInsideBounds(point: FloatingPoint, bounds: FloatingBounds): FloatingPoint {
  return clampFloatingPosition(point, bounds.element, bounds.viewport, bounds.insets);
}

/**
 * Provides pointer and keyboard movement while keeping the companion onscreen,
 * and tells a tap from a drag.
 */
export function useFloatingCompanion({
  onTap,
  onDragStart,
}: FloatingCompanionOptions = {}): FloatingCompanionDrag {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // When the last press ended. A press decides for itself whether it was a tap
  // (on pointerup), because whether a click follows it differs by browser and
  // device; a click right after a press is that press's, and is ignored.
  const pressEndedAtRef = useRef(-Infinity);
  const [position, setPosition] = useState<FloatingPoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const keepInsideViewport = useCallback((next: FloatingPoint): FloatingPoint => {
    const root = rootRef.current;
    if (!root) return next;
    return keepInsideBounds(next, readFloatingBounds(root));
  }, []);

  useEffect(() => {
    const keepCurrentPositionVisible = () => {
      const root = rootRef.current;
      if (!root) return;
      const bounds = readFloatingBounds(root);
      if (dragRef.current) dragRef.current = { ...dragRef.current, bounds };
      setPosition((current) => {
        if (!current) return null;
        const next = keepInsideBounds(current, bounds);
        return next.left === current.left && next.top === current.top ? current : next;
      });
    };
    window.addEventListener('resize', keepCurrentPositionVisible);

    const observer = new ResizeObserver(keepCurrentPositionVisible);
    if (rootRef.current) observer.observe(rootRef.current);
    const header = document.querySelector<HTMLElement>('.header');
    if (header) observer.observe(header);

    return () => {
      window.removeEventListener('resize', keepCurrentPositionVisible);
      observer.disconnect();
    };
  }, []);

  const onPointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    const root = rootRef.current;
    if (!root) return;

    event.preventDefault();
    event.currentTarget.focus();
    const rect = root.getBoundingClientRect();
    const bounds = readFloatingBounds(root, rect);
    dragRef.current = {
      pointerId: event.pointerId,
      offsetLeft: event.clientX - rect.left,
      offsetTop: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      bounds,
    };
    setPosition(keepInsideBounds({ left: rect.left, top: rect.top }, bounds));
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already have ended; the next pointer event will recover.
    }
  };

  const onPointerMove: PointerEventHandler<HTMLButtonElement> = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      if (!movedBeyondTap(event.clientX - drag.startX, event.clientY - drag.startY)) return;
      drag.moved = true;
      setIsDragging(true);
      onDragStart?.();
    }
    setPosition(
      keepInsideBounds(
        {
          left: event.clientX - drag.offsetLeft,
          top: event.clientY - drag.offsetTop,
        },
        drag.bounds,
      ),
    );
  };

  const finishDrag: PointerEventHandler<HTMLButtonElement> = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    pressEndedAtRef.current = event.timeStamp;
    setIsDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }
    if (event.type === 'pointerup' && !drag.moved) onTap?.();
  };

  const onKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
    const direction = KEYBOARD_DIRECTIONS[event.key];
    if (!direction) return;

    const root = rootRef.current;
    if (!root) return;
    event.preventDefault();
    const rect = root.getBoundingClientRect();
    const step = event.shiftKey ? KEYBOARD_STEP * 3 : KEYBOARD_STEP;
    setPosition(
      keepInsideViewport({
        left: (position?.left ?? rect.left) + direction.left * step,
        top: (position?.top ?? rect.top) + direction.top * step,
      }),
    );
  };

  // A click with no press behind it: Enter or Space, or assistive technology.
  const onClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (event.timeStamp - pressEndedAtRef.current < CLICK_AFTER_PRESS_MS) return;
    onTap?.();
  };

  const style: CSSProperties | undefined = position
    ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' }
    : undefined;

  return {
    rootRef,
    style,
    isDragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onKeyDown,
      onClick,
    },
  };
}
