"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// Keep the thumb a grabbable size even when the song is very long and the
// proportional width would otherwise shrink to a sliver.
const MIN_THUMB = 48;

interface Props {
  // The horizontal scroller (`.grid-container`) whose position this bar mirrors.
  containerRef: RefObject<HTMLDivElement | null>;
  // id of the scroller, for the scrollbar's aria-controls.
  controlsId: string;
  // Re-measure when the grid length changes (blocks ±). The container's own
  // size is unchanged then, so a ResizeObserver on it wouldn't fire.
  totalSteps: number;
}

interface Thumb {
  width: number;
  left: number;
  // False when the whole song already fits (nothing to drag).
  draggable: boolean;
  // Scroll position as a 0–100 percentage, for aria-valuenow.
  value: number;
}

// An always-visible, chunky, one-finger-draggable horizontal scrollbar for the
// grid. The native bar is thin, auto-hiding on tablets, and can't be thickened
// on iPad Safari, so we render our own and hide the native one (see grid.css).
// It only reads/writes `container.scrollLeft`, so it stays in sync with every
// other scroll source (two-finger drag, playhead-follow during playback).
export function GridScrollbar({ containerRef, controlsId, totalSteps }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState<Thumb>({ width: 0, left: 0, draggable: false, value: 0 });
  const dragRef = useRef<{ startX: number; startScroll: number; maxScroll: number; range: number } | null>(
    null
  );
  const rafRef = useRef(0);

  const measure = useCallback(() => {
    const c = containerRef.current;
    const track = trackRef.current;
    if (!c || !track) return;
    const { scrollWidth, clientWidth, scrollLeft } = c;
    const trackWidth = track.clientWidth;
    // Thumb length is proportional to how much of the song is on screen,
    // clamped so it never gets smaller than a fingertip nor wider than the track.
    const width = Math.min(
      trackWidth,
      Math.max(MIN_THUMB, Math.round((clientWidth / scrollWidth) * trackWidth))
    );
    const maxScroll = scrollWidth - clientWidth;
    const range = trackWidth - width;
    const draggable = maxScroll > 1 && range > 1;
    const left = draggable ? Math.round((scrollLeft / maxScroll) * range) : 0;
    const value = maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * 100) : 0;
    setThumb((prev) =>
      prev.width === width && prev.left === left && prev.draggable === draggable && prev.value === value
        ? prev
        : { width, left, draggable, value }
    );
  }, [containerRef]);

  // Reading layout in a scroll handler can thrash; batch to one read per frame.
  const scheduleMeasure = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    measure();
    c.addEventListener("scroll", scheduleMeasure, { passive: true });
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(c);
    return () => {
      c.removeEventListener("scroll", scheduleMeasure);
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, measure, scheduleMeasure]);

  // Grid grew/shrank (blocks changed): the container size is unchanged, so the
  // ResizeObserver above won't catch it — re-measure on the step count.
  useEffect(() => {
    measure();
  }, [totalSteps, measure]);

  // Scroll the container to x (clamped in range) and sync the thumb at once.
  const scrollContainerTo = (x: number) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollLeft = Math.max(0, Math.min(c.scrollWidth - c.clientWidth, x));
    measure();
  };

  const onThumbPointerDown = (e: React.PointerEvent) => {
    const c = containerRef.current;
    const track = trackRef.current;
    if (!c || !track || !thumb.draggable) return;
    e.preventDefault();
    e.stopPropagation(); // don't also trigger the track's page-jump
    // Capture so the drag keeps tracking when the finger leaves the thumb.
    // Can throw InvalidStateError if the pointer is already gone — ignore.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    dragRef.current = {
      startX: e.clientX,
      startScroll: c.scrollLeft,
      maxScroll: c.scrollWidth - c.clientWidth,
      range: track.clientWidth - thumb.width,
    };
  };

  const onThumbPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.range <= 0) return;
    // scrollContainerTo re-syncs the thumb right away — glued to the finger,
    // without waiting on the (rAF-throttled) scroll listener.
    scrollContainerTo(d.startScroll + ((e.clientX - d.startX) / d.range) * d.maxScroll);
  };

  const onThumbPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
  };

  // Tapping the empty part of the track jumps toward that spot (centres the
  // thumb under the tap), so kids can move a long way without dragging.
  const onTrackPointerDown = (e: React.PointerEvent) => {
    const c = containerRef.current;
    const track = trackRef.current;
    if (!c || !track || !thumb.draggable) return;
    const range = track.clientWidth - thumb.width;
    if (range <= 0) return;
    const target = e.clientX - track.getBoundingClientRect().left - thumb.width / 2;
    scrollContainerTo((target / range) * (c.scrollWidth - c.clientWidth));
  };

  return (
    <div
      className="grid-scrollbar"
      ref={trackRef}
      onPointerDown={onTrackPointerDown}
      role="scrollbar"
      aria-orientation="horizontal"
      aria-label="楽譜を横にスクロール"
      aria-controls={controlsId}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={thumb.value}
    >
      <div
        className={`grid-scrollbar-thumb ${thumb.draggable ? "" : "grid-scrollbar-thumb--full"}`}
        style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={onThumbPointerUp}
        onPointerCancel={onThumbPointerUp}
      />
    </div>
  );
}
