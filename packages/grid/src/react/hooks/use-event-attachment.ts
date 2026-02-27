import { useEffect, useRef } from "react";
import type {
  CellCoord,
  GridCellEvent,
  GridHeaderEvent,
  GridKeyboardEvent,
  GridScrollEvent,
  GridCanvasEvent,
  GridTouchEvent,
} from "../../types";
import type { EventManager, EventCoords } from "../../adapter/event-manager";
import type { EditorManager } from "../../adapter/editor-manager";
import {
  createGridCellEvent,
  createGridHeaderEvent,
  createGridKeyboardEvent,
  createGridScrollEvent,
  createGridCanvasEvent,
  createGridTouchEvent,
} from "../../event-helpers";

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
  onCellClick?: (event: GridCellEvent) => void;
  onCellDoubleClick?: (event: GridCellEvent) => void;
  onHeaderClick?: (event: GridHeaderEvent) => void;
  onKeyDown?: (event: GridKeyboardEvent) => void;
  onCellMouseDown?: (event: GridCellEvent) => void;
  onCellMouseMove?: (event: GridCellEvent) => void;
  onCellMouseUp?: () => void;
  onScroll?: (event: GridScrollEvent) => void;
  onCanvasEvent?: (event: GridCanvasEvent) => void;
  onTouchStart?: (event: GridTouchEvent) => void;
  onTouchMove?: (event: GridTouchEvent) => void;
  onTouchEnd?: (event: GridTouchEvent) => void;
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
  onCellMouseDown,
  onCellMouseMove,
  onCellMouseUp,
  onScroll,
  onCanvasEvent,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  rowHeight,
  headerHeight,
  height,
}: UseEventAttachmentParams) {
  // Ref pattern: stable identity across renders, no re-attach on callback change
  const onCellClickRef = useRef(onCellClick);
  const onCellDoubleClickRef = useRef(onCellDoubleClick);
  const onHeaderClickRef = useRef(onHeaderClick);
  const onKeyDownRef = useRef(onKeyDown);
  const onCellMouseDownRef = useRef(onCellMouseDown);
  const onCellMouseMoveRef = useRef(onCellMouseMove);
  const onCellMouseUpRef = useRef(onCellMouseUp);
  const onScrollRef = useRef(onScroll);
  const onCanvasEventRef = useRef(onCanvasEvent);
  const onTouchStartRef = useRef(onTouchStart);
  const onTouchMoveRef = useRef(onTouchMove);
  const onTouchEndRef = useRef(onTouchEnd);
  onCellClickRef.current = onCellClick;
  onCellDoubleClickRef.current = onCellDoubleClick;
  onHeaderClickRef.current = onHeaderClick;
  onKeyDownRef.current = onKeyDown;
  onCellMouseDownRef.current = onCellMouseDown;
  onCellMouseMoveRef.current = onCellMouseMove;
  onCellMouseUpRef.current = onCellMouseUp;
  onScrollRef.current = onScroll;
  onCanvasEventRef.current = onCanvasEvent;
  onTouchStartRef.current = onTouchStart;
  onTouchMoveRef.current = onTouchMove;
  onTouchEndRef.current = onTouchEnd;

  useEffect(() => {
    const canvas = canvasRef.current;
    const em = eventManagerRef.current;
    if (!canvas || !em) return;

    em.attach(
      canvas,
      {
        onHeaderClick: (colIndex, native, coords) => {
          const event = createGridHeaderEvent(native, colIndex, coords);
          onHeaderClickRef.current?.(event);
          if (event.defaultPrevented) return;
          handlers.handleHeaderClick(colIndex);
        },
        onCellClick: (coord, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          onCellClickRef.current?.(event);
          if (event.defaultPrevented) return;
          if (editorManagerRef.current.isEditing) {
            editorManagerRef.current.cancel();
          }
        },
        onCellDoubleClick: (coord, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          onCellDoubleClickRef.current?.(event);
          if (event.defaultPrevented) return;
          handlers.handleCellDoubleClick(coord);
        },
        onCellMouseDown: (coord, shiftKey, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          onCellMouseDownRef.current?.(event);
          if (event.defaultPrevented) return;
          if (editorManagerRef.current.isEditing) editorManagerRef.current.cancel();
          handlers.handleCellMouseDown(coord, shiftKey);
        },
        onCellMouseMove: (coord, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          onCellMouseMoveRef.current?.(event);
          if (event.defaultPrevented) return;
          handlers.handleCellMouseMove(coord);
        },
        onDragEdge: handlers.handleDragEdge,
        onCellMouseUp: () => {
          onCellMouseUpRef.current?.();
          handlers.handleCellMouseUp();
          handlers.stopAutoScroll();
        },
        onKeyDown: (e) => {
          const event = createGridKeyboardEvent(e);
          onKeyDownRef.current?.(event);
          if (event.defaultPrevented) return;
          handlers.handleKeyDown(e);
        },
        onScroll: (deltaY, deltaX, native) => {
          const event = createGridScrollEvent(deltaY, deltaX, native);
          onScrollRef.current?.(event);
          if (event.defaultPrevented) return;
          handlers.handleWheel(deltaY, deltaX);
        },
        onResizeStart: handlers.handleResizeStart,
        onResizeMove: handlers.handleResizeMove,
        onResizeEnd: handlers.handleResizeEnd,
        onResizeHover: handlers.handleResizeHover,
        onCanvasEvent: (type, native, hitTest, coords) => {
          if (!onCanvasEventRef.current) return;
          const event = createGridCanvasEvent(type, native, hitTest, coords);
          onCanvasEventRef.current(event);
          if (event.defaultPrevented) return false;
        },
        onTouchStart: (native, coords, hitTest) => {
          if (!onTouchStartRef.current) return;
          const touchPoint = { contentX: coords.contentX, contentY: coords.contentY, viewportX: coords.viewportX, viewportY: coords.viewportY };
          const event = createGridTouchEvent("touchstart", native, touchPoint, hitTest, native.touches.length);
          onTouchStartRef.current(event);
          if (event.defaultPrevented) return false;
        },
        onTouchMove: (native, coords, hitTest) => {
          if (!onTouchMoveRef.current) return;
          const touchPoint = { contentX: coords.contentX, contentY: coords.contentY, viewportX: coords.viewportX, viewportY: coords.viewportY };
          const event = createGridTouchEvent("touchmove", native, touchPoint, hitTest, native.touches.length);
          onTouchMoveRef.current(event);
          if (event.defaultPrevented) return false;
        },
        onTouchEnd: (native, coords, hitTest) => {
          if (!onTouchEndRef.current) return;
          const touchPoint = { contentX: coords.contentX, contentY: coords.contentY, viewportX: coords.viewportX, viewportY: coords.viewportY };
          const event = createGridTouchEvent("touchend", native, touchPoint, hitTest, native.touches.length);
          onTouchEndRef.current(event);
          if (event.defaultPrevented) return false;
        },
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
