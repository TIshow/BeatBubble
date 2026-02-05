import { useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import type { DrumId, MelodyNote, NoteName } from "@/core/types";

const DRAG_THRESHOLD = 5;
const CELL_WIDTH = 32;

interface DragState {
  mode: "creating" | "extending";
  noteId: string;
  noteName: NoteName;
  startStep: number;
  startX: number;
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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const hasDraggedRef = useRef(false);
  const touchCountRef = useRef(0);
  const lastTouchXRef = useRef(0);

  const startMelodyDrag = useCallback(
    (clientX: number, noteName: NoteName, step: number) => {
      hasDraggedRef.current = false;
      const existingNote = findNoteAt(noteName, step);

      if (existingNote) {
        if (step === existingNote.startStep) {
          setDragState({
            mode: "extending",
            noteId: existingNote.id,
            noteName,
            startStep: existingNote.startStep,
            startX: clientX,
          });
        } else {
          onNoteRemove(existingNote.id);
        }
      } else {
        const noteId = onNoteCreate(noteName, step);
        if (noteId) {
          setDragState({
            mode: "creating",
            noteId,
            noteName,
            startStep: step,
            startX: clientX,
          });
        }
      }
    },
    [findNoteAt, onNoteCreate, onNoteRemove]
  );

  const updateDrag = useCallback(
    (clientX: number) => {
      if (!dragState || !gridRef.current) return;

      const deltaX = clientX - dragState.startX;
      if (Math.abs(deltaX) < DRAG_THRESHOLD && !hasDraggedRef.current) return;

      hasDraggedRef.current = true;

      const gridRect = gridRef.current.getBoundingClientRect();
      const relativeX = clientX - gridRect.left;
      const currentStep = Math.floor(relativeX / CELL_WIDTH);
      const newDuration = Math.max(1, currentStep - dragState.startStep + 1);

      onNoteDurationChange(dragState.noteId, newDuration);
    },
    [dragState, gridRef, onNoteDurationChange]
  );

  const endDrag = useCallback(() => {
    if (dragState && dragState.mode === "extending" && !hasDraggedRef.current) {
      onNoteRemove(dragState.noteId);
    }
    setDragState(null);
    hasDraggedRef.current = false;
  }, [dragState, onNoteRemove]);

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
        startMelodyDrag(e.clientX, noteName, step);
      },
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        touchCountRef.current = e.touches.length;
        if (e.touches.length === 1) {
          startMelodyDrag(e.touches[0].clientX, noteName, step);
        } else if (e.touches.length >= 2) {
          if (dragState) {
            endDrag();
          }
          initMultiTouchScroll(e.touches[0].clientX);
        }
      },
    }),
    [startMelodyDrag, dragState, endDrag, initMultiTouchScroll]
  );

  // Drum cell handlers
  const getDrumCellHandlers = useCallback(
    (drumId: DrumId, step: number) => ({
      onClick: () => {
        onDrumToggle(drumId, step);
      },
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        touchCountRef.current = e.touches.length;
        if (e.touches.length === 1) {
          onDrumToggle(drumId, step);
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
      updateDrag(e.clientX);
    },
    onMouseUp: () => {
      endDrag();
    },
    onMouseLeave: () => {
      endDrag();
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (e.touches.length === 1 && dragState) {
        updateDrag(e.touches[0].clientX);
      } else if (e.touches.length >= 2) {
        handleMultiTouchScroll(e.touches[0].clientX);
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchCountRef.current === 1) {
        endDrag();
      }
      touchCountRef.current = e.touches.length;
    },
    onTouchCancel: (e: React.TouchEvent) => {
      if (touchCountRef.current === 1) {
        endDrag();
      }
      touchCountRef.current = e.touches.length;
    },
  };

  return {
    isDragging: dragState !== null,
    getMelodyCellHandlers,
    getDrumCellHandlers,
    containerHandlers,
  };
}
