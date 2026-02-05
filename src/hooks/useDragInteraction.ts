import { useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import type { DrumId, MelodyNote, NoteName } from "@/core/types";

const DRAG_THRESHOLD = 5;
const CELL_WIDTH = 40;

// Pending interaction recorded on touch/mouse start (before we know if it's tap or drag)
interface PendingInteraction {
  clientX: number;
  noteName: NoteName;
  step: number;
  existingNote: MelodyNote | null;
}

// Active drag state (only set after threshold is crossed)
interface DragState {
  noteId: string;
  startStep: number;
}

interface UseDragInteractionOptions {
  gridRef: RefObject<HTMLDivElement | null>;
  gridContainerRef: RefObject<HTMLDivElement | null>;
  onNoteCreate: (noteName: NoteName, step: number) => string | null;
  onNoteRemove: (noteId: string) => void;
  onNoteDurationChange: (noteId: string, duration: number) => void;
  onDrumToggle: (drumId: DrumId, step: number) => void;
  findNoteAt: (noteName: NoteName, step: number) => MelodyNote | null;
}

export function useDragInteraction({
  gridRef,
  gridContainerRef,
  onNoteCreate,
  onNoteRemove,
  onNoteDurationChange,
  onDrumToggle,
  findNoteAt,
}: UseDragInteractionOptions) {
  // State for CSS (triggers re-render)
  const [isDragging, setIsDragging] = useState(false);

  // Refs for synchronous access (no stale closure issues)
  const pendingRef = useRef<PendingInteraction | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const touchCountRef = useRef(0);
  const lastTouchXRef = useRef(0);
  // Timestamp to prevent synthetic mouse events after touch
  const lastInteractionEndRef = useRef(0);

  // Start potential interaction (tap or drag - we don't know yet)
  const startInteraction = useCallback(
    (clientX: number, noteName: NoteName, step: number, isTouch: boolean) => {
      // Ignore synthetic mouse events that fire shortly after touch events
      if (!isTouch && Date.now() - lastInteractionEndRef.current < 300) {
        return;
      }

      const existingNote = findNoteAt(noteName, step);
      pendingRef.current = { clientX, noteName, step, existingNote };
      dragRef.current = null;
    },
    [findNoteAt]
  );

  // Handle movement - may transition to drag mode
  const handleMove = useCallback(
    (clientX: number) => {
      const pending = pendingRef.current;
      if (!pending || !gridRef.current) return;

      const deltaX = clientX - pending.clientX;

      // Already in drag mode - update duration
      if (dragRef.current) {
        const gridRect = gridRef.current.getBoundingClientRect();
        const relativeX = clientX - gridRect.left;
        const currentStep = Math.floor(relativeX / CELL_WIDTH);
        const newDuration = Math.max(1, currentStep - dragRef.current.startStep + 1);
        onNoteDurationChange(dragRef.current.noteId, newDuration);
        return;
      }

      // Check if we should enter drag mode
      if (Math.abs(deltaX) >= DRAG_THRESHOLD) {
        // Transition to drag mode
        if (pending.existingNote && pending.step === pending.existingNote.startStep) {
          // Extending existing note from its start
          dragRef.current = {
            noteId: pending.existingNote.id,
            startStep: pending.existingNote.startStep,
          };
          setIsDragging(true);
        } else if (!pending.existingNote) {
          // Creating new note and dragging
          const noteId = onNoteCreate(pending.noteName, pending.step);
          if (noteId) {
            dragRef.current = {
              noteId,
              startStep: pending.step,
            };
            setIsDragging(true);
          }
        }
        // If clicking on middle/end of existing note, don't enter drag mode
      }
    },
    [gridRef, onNoteCreate, onNoteDurationChange]
  );

  // End interaction - finalize as tap or drag
  const endInteraction = useCallback(() => {
    const pending = pendingRef.current;
    const drag = dragRef.current;

    if (pending && !drag) {
      // No drag occurred - this is a tap
      if (pending.existingNote) {
        // Tap on existing note - delete it
        onNoteRemove(pending.existingNote.id);
      } else {
        // Tap on empty cell - create short note
        onNoteCreate(pending.noteName, pending.step);
      }
    }
    // If drag occurred, note is already created/extended - nothing more to do

    // Reset state
    pendingRef.current = null;
    dragRef.current = null;
    setIsDragging(false);
    lastInteractionEndRef.current = Date.now();
  }, [onNoteCreate, onNoteRemove]);

  // Cancel interaction without finalizing
  const cancelInteraction = useCallback(() => {
    pendingRef.current = null;
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  // Multi-touch scroll helpers
  const initMultiTouchScroll = useCallback((clientX: number) => {
    lastTouchXRef.current = clientX;
  }, []);

  const handleMultiTouchScroll = useCallback(
    (clientX: number) => {
      if (!gridContainerRef.current) return;
      const deltaX = lastTouchXRef.current - clientX;
      gridContainerRef.current.scrollLeft += deltaX;
      lastTouchXRef.current = clientX;
    },
    [gridContainerRef]
  );

  // Melody cell handlers
  const getMelodyCellHandlers = useCallback(
    (noteName: NoteName, step: number) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        startInteraction(e.clientX, noteName, step, false);
      },
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        touchCountRef.current = e.touches.length;
        if (e.touches.length === 1) {
          startInteraction(e.touches[0].clientX, noteName, step, true);
        } else if (e.touches.length >= 2) {
          cancelInteraction();
          initMultiTouchScroll(e.touches[0].clientX);
        }
      },
    }),
    [startInteraction, cancelInteraction, initMultiTouchScroll]
  );

  // Drum cell handlers
  const getDrumCellHandlers = useCallback(
    (drumId: DrumId, step: number) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        // Ignore synthetic mouse events after touch
        if (Date.now() - lastInteractionEndRef.current < 300) {
          return;
        }
        onDrumToggle(drumId, step);
      },
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        touchCountRef.current = e.touches.length;
        if (e.touches.length === 1) {
          onDrumToggle(drumId, step);
          lastInteractionEndRef.current = Date.now();
        } else if (e.touches.length >= 2) {
          initMultiTouchScroll(e.touches[0].clientX);
        }
      },
    }),
    [onDrumToggle, initMultiTouchScroll]
  );

  // Container handlers
  const containerHandlers = {
    onMouseMove: (e: React.MouseEvent) => {
      handleMove(e.clientX);
    },
    onMouseUp: () => {
      endInteraction();
    },
    onMouseLeave: () => {
      cancelInteraction();
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (e.touches.length === 1 && pendingRef.current) {
        handleMove(e.touches[0].clientX);
      } else if (e.touches.length >= 2) {
        handleMultiTouchScroll(e.touches[0].clientX);
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchCountRef.current === 1) {
        endInteraction();
      }
      touchCountRef.current = e.touches.length;
    },
    onTouchCancel: (e: React.TouchEvent) => {
      if (touchCountRef.current === 1) {
        cancelInteraction();
      }
      touchCountRef.current = e.touches.length;
    },
  };

  return {
    isDragging,
    getMelodyCellHandlers,
    getDrumCellHandlers,
    containerHandlers,
  };
}
