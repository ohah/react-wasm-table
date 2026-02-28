import { useEffect, useRef } from "react";
import type { GridInstance } from "../../grid-instance";
import type {
  CellCoord,
  GridCellEvent,
  GridHeaderEvent,
  GridKeyboardEvent,
  GridScrollEvent,
  GridCanvasEvent,
  GridContextMenuEvent,
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
  createGridContextMenuEvent,
  createGridTouchEvent,
} from "../../event-helpers";
import {
  composeMiddleware,
  type EventMiddleware,
  type EventChannel,
  type GridEvent,
} from "../../event-middleware";

export interface UseEventAttachmentParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  eventManagerRef: React.RefObject<EventManager>;
  editorManagerRef: React.RefObject<EditorManager>;
  /** When provided, attached to context menu event as event.table. */
  table?: GridInstance;
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
    handleHeaderMouseDown?: (colIndex: number) => void;
    handleColumnDnDMove?: (viewportX: number, contentX: number) => void;
    handleColumnDnDEnd?: () => void;
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
  onContextMenu?: (event: GridContextMenuEvent) => void;
  onTouchStart?: (event: GridTouchEvent) => void;
  onTouchMove?: (event: GridTouchEvent) => void;
  onTouchEnd?: (event: GridTouchEvent) => void;
  eventMiddleware?: EventMiddleware[];
  rowHeight: number;
  headerHeight: number;
  height: number;
}

export function useEventAttachment({
  canvasRef,
  eventManagerRef,
  editorManagerRef,
  table,
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
  onContextMenu,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  eventMiddleware,
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
  const onContextMenuRef = useRef(onContextMenu);
  const onTouchStartRef = useRef(onTouchStart);
  const onTouchMoveRef = useRef(onTouchMove);
  const onTouchEndRef = useRef(onTouchEnd);
  const middlewareRef = useRef(eventMiddleware);
  onCellClickRef.current = onCellClick;
  onCellDoubleClickRef.current = onCellDoubleClick;
  onHeaderClickRef.current = onHeaderClick;
  onKeyDownRef.current = onKeyDown;
  onCellMouseDownRef.current = onCellMouseDown;
  onCellMouseMoveRef.current = onCellMouseMove;
  onCellMouseUpRef.current = onCellMouseUp;
  onScrollRef.current = onScroll;
  onCanvasEventRef.current = onCanvasEvent;
  onContextMenuRef.current = onContextMenu;
  onTouchStartRef.current = onTouchStart;
  onTouchMoveRef.current = onTouchMove;
  onTouchEndRef.current = onTouchEnd;
  middlewareRef.current = eventMiddleware;

  useEffect(() => {
    const canvas = canvasRef.current;
    const em = eventManagerRef.current;
    if (!canvas || !em) return;

    /** Dispatch an event through the middleware chain, then run the final handler. */
    function dispatch(channel: EventChannel, event: GridEvent, final_: () => void) {
      const mws = middlewareRef.current;
      if (!mws || mws.length === 0) {
        final_();
        return;
      }
      const run = composeMiddleware(mws, () => final_());
      run(channel, event);
    }

    em.attach(
      canvas,
      {
        onHeaderClick: (colIndex, native, coords) => {
          const event = createGridHeaderEvent(native, colIndex, coords);
          dispatch("headerClick", event, () => {
            onHeaderClickRef.current?.(event);
            if (event.defaultPrevented) return;
            handlers.handleHeaderClick(colIndex);
          });
        },
        onCellClick: (coord, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          dispatch("cellClick", event, () => {
            onCellClickRef.current?.(event);
            if (event.defaultPrevented) return;
            if (editorManagerRef.current.isEditing) {
              editorManagerRef.current.cancel();
            }
          });
        },
        onCellDoubleClick: (coord, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          dispatch("cellDoubleClick", event, () => {
            onCellDoubleClickRef.current?.(event);
            if (event.defaultPrevented) return;
            handlers.handleCellDoubleClick(coord);
          });
        },
        onCellMouseDown: (coord, shiftKey, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          dispatch("cellMouseDown", event, () => {
            onCellMouseDownRef.current?.(event);
            if (event.defaultPrevented) return;
            if (editorManagerRef.current.isEditing) editorManagerRef.current.cancel();
            handlers.handleCellMouseDown(coord, shiftKey);
          });
        },
        onCellMouseMove: (coord, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          dispatch("cellMouseMove", event, () => {
            onCellMouseMoveRef.current?.(event);
            if (event.defaultPrevented) return;
            handlers.handleCellMouseMove(coord);
          });
        },
        onDragEdge: handlers.handleDragEdge,
        onCellMouseUp: () => {
          onCellMouseUpRef.current?.();
          handlers.handleCellMouseUp();
          handlers.stopAutoScroll();
        },
        onKeyDown: (e) => {
          const event = createGridKeyboardEvent(e);
          dispatch("keyDown", event, () => {
            onKeyDownRef.current?.(event);
            if (event.defaultPrevented) return;
            handlers.handleKeyDown(e);
          });
        },
        onScroll: (deltaY, deltaX, native) => {
          const event = createGridScrollEvent(deltaY, deltaX, native);
          dispatch("scroll", event, () => {
            onScrollRef.current?.(event);
            if (event.defaultPrevented) return;
            handlers.handleWheel(deltaY, deltaX);
          });
        },
        onResizeStart: handlers.handleResizeStart,
        onResizeMove: handlers.handleResizeMove,
        onResizeEnd: handlers.handleResizeEnd,
        onResizeHover: handlers.handleResizeHover,
        onHeaderMouseDown: handlers.handleHeaderMouseDown
          ? (colIndex) => handlers.handleHeaderMouseDown!(colIndex)
          : undefined,
        onColumnDnDMove: handlers.handleColumnDnDMove,
        onColumnDnDEnd: handlers.handleColumnDnDEnd,
        onCanvasEvent: (type, native, hitTest, coords) => {
          const event = createGridCanvasEvent(type, native, hitTest, coords);
          dispatch("canvasEvent", event, () => {
            onCanvasEventRef.current?.(event);
            if (event.defaultPrevented) return false;
          });
        },
        onContextMenu: onContextMenu
          ? (native, hitTest, coords) => {
              const event = createGridContextMenuEvent(native, hitTest, coords, table);
              dispatch("contextMenu", event, () => {
                onContextMenuRef.current?.(event);
              });
            }
          : undefined,
        onTouchStart: (native, coords, hitTest) => {
          const touchPoint = {
            contentX: coords.contentX,
            contentY: coords.contentY,
            viewportX: coords.viewportX,
            viewportY: coords.viewportY,
          };
          const event = createGridTouchEvent(
            "touchstart",
            native,
            touchPoint,
            hitTest,
            native.touches.length,
          );
          dispatch("touchStart", event, () => {
            onTouchStartRef.current?.(event);
            if (event.defaultPrevented) return false;
          });
        },
        onTouchMove: (native, coords, hitTest) => {
          const touchPoint = {
            contentX: coords.contentX,
            contentY: coords.contentY,
            viewportX: coords.viewportX,
            viewportY: coords.viewportY,
          };
          const event = createGridTouchEvent(
            "touchmove",
            native,
            touchPoint,
            hitTest,
            native.touches.length,
          );
          dispatch("touchMove", event, () => {
            onTouchMoveRef.current?.(event);
            if (event.defaultPrevented) return false;
          });
        },
        onTouchEnd: (native, coords, hitTest) => {
          const touchPoint = {
            contentX: coords.contentX,
            contentY: coords.contentY,
            viewportX: coords.viewportX,
            viewportY: coords.viewportY,
          };
          const event = createGridTouchEvent(
            "touchend",
            native,
            touchPoint,
            hitTest,
            native.touches.length,
          );
          dispatch("touchEnd", event, () => {
            onTouchEndRef.current?.(event);
            if (event.defaultPrevented) return false;
          });
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
    handlers.handleHeaderMouseDown,
    handlers.handleColumnDnDMove,
    handlers.handleColumnDnDEnd,
    onContextMenu,
    table,
    rowHeight,
    headerHeight,
    height,
  ]);
}
