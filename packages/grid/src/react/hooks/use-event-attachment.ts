import { useEffect, useRef } from "react";
import type { CellCoord } from "../../types";
import type { EventManager } from "../../adapter/event-manager";
import type { EditorManager } from "../../adapter/editor-manager";

export interface UseEventAttachmentParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  eventManagerRef: React.RefObject<EventManager>;
  editorManagerRef: React.RefObject<EditorManager>;
  handlers: {
    handleHeaderClick: (colIndex: number) => void;
    handleCellDoubleClick: (coord: CellCoord) => void;
    handleCellMouseDown: (coord: CellCoord, shiftKey: boolean) => void;
    handleCellMouseMove: (coord: CellCoord) => void;
    handleCellMouseUp: () => void;
    handleDragEdge: (dy: number, dx: number) => void;
    handleWheel: (deltaY: number, deltaX: number) => void;
    handleKeyDown: (e: KeyboardEvent) => void;
    stopAutoScroll: () => void;
    handleResizeStart?: (colIndex: number, startX: number, startWidth: number) => void;
    handleResizeMove?: (deltaX: number) => void;
    handleResizeEnd?: () => void;
    handleResizeHover?: (colIndex: number | null) => void;
  };
  onCellClick?: (coord: CellCoord) => void | false;
  onCellDoubleClick?: (coord: CellCoord) => void | false;
  onHeaderClick?: (colIndex: number) => void | false;
  onKeyDown?: (event: KeyboardEvent) => void | false;
  rowHeight: number;
  headerHeight: number;
  height: number;
}

export function useEventAttachment({
  canvasRef,
  eventManagerRef,
  editorManagerRef,
  handlers,
  onCellClick,
  onCellDoubleClick,
  onHeaderClick,
  onKeyDown,
  rowHeight,
  headerHeight,
  height,
}: UseEventAttachmentParams) {
  // Ref pattern: stable identity across renders, no re-attach on callback change
  const onCellClickRef = useRef(onCellClick);
  const onCellDoubleClickRef = useRef(onCellDoubleClick);
  const onHeaderClickRef = useRef(onHeaderClick);
  const onKeyDownRef = useRef(onKeyDown);
  onCellClickRef.current = onCellClick;
  onCellDoubleClickRef.current = onCellDoubleClick;
  onHeaderClickRef.current = onHeaderClick;
  onKeyDownRef.current = onKeyDown;

  useEffect(() => {
    const canvas = canvasRef.current;
    const em = eventManagerRef.current;
    if (!canvas || !em) return;

    em.attach(
      canvas,
      {
        onHeaderClick: (colIndex) => {
          if (onHeaderClickRef.current?.(colIndex) === false) return;
          handlers.handleHeaderClick(colIndex);
        },
        onCellClick: (coord) => {
          if (onCellClickRef.current?.(coord) === false) return;
          if (editorManagerRef.current.isEditing) {
            editorManagerRef.current.cancel();
          }
        },
        onCellDoubleClick: (coord) => {
          if (onCellDoubleClickRef.current?.(coord) === false) return;
          handlers.handleCellDoubleClick(coord);
        },
        onCellMouseDown: (coord, shiftKey) => {
          if (editorManagerRef.current.isEditing) editorManagerRef.current.cancel();
          handlers.handleCellMouseDown(coord, shiftKey);
        },
        onCellMouseMove: handlers.handleCellMouseMove,
        onDragEdge: handlers.handleDragEdge,
        onCellMouseUp: () => {
          handlers.handleCellMouseUp();
          handlers.stopAutoScroll();
        },
        onKeyDown: (e) => {
          if (onKeyDownRef.current?.(e) === false) return;
          handlers.handleKeyDown(e);
        },
        onScroll: handlers.handleWheel,
        onResizeStart: handlers.handleResizeStart,
        onResizeMove: handlers.handleResizeMove,
        onResizeEnd: handlers.handleResizeEnd,
        onResizeHover: handlers.handleResizeHover,
      },
      { lineHeight: rowHeight, pageHeight: height - headerHeight },
    );

    return () => {
      em.detach();
    };
  }, [
    canvasRef,
    eventManagerRef,
    editorManagerRef,
    handlers.handleHeaderClick,
    handlers.handleCellDoubleClick,
    handlers.handleCellMouseDown,
    handlers.handleCellMouseMove,
    handlers.handleCellMouseUp,
    handlers.handleDragEdge,
    handlers.handleWheel,
    handlers.handleKeyDown,
    handlers.stopAutoScroll,
    handlers.handleResizeStart,
    handlers.handleResizeMove,
    handlers.handleResizeEnd,
    handlers.handleResizeHover,
    rowHeight,
    headerHeight,
    height,
  ]);
}
