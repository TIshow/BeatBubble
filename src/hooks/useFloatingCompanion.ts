'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEventHandler, PointerEventHandler, RefObject } from 'react';
import {
  clampFloatingPosition,
  type FloatingInsets,
  type FloatingPoint,
  type FloatingSize,
} from '@/ui/floatingPosition';

const VIEWPORT_GUTTER = 12;
const HEADER_GAP = 8;
const KEYBOARD_STEP = 12;
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
  };
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

/** Provides pointer and keyboard movement while keeping the companion onscreen. */
export function useFloatingCompanion(): FloatingCompanionDrag {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
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
      bounds,
    };
    setPosition(keepInsideBounds({ left: rect.left, top: rect.top }, bounds));
    setIsDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already have ended; the next pointer event will recover.
    }
  };

  const onPointerMove: PointerEventHandler<HTMLButtonElement> = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
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
    setIsDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }
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
    },
  };
}
