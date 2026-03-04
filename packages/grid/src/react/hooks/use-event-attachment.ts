import { useEffect, useRef } from "react";
import type { GridInstance } from "../../grid-instance";
import type {
  CellCoord,
  RenderInstruction,
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
import type { CellRendererRegistryLike } from "../../renderer/components/types";
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
    handleCellClick?: (coord: CellCoord) => void;
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
    isCellEditable?: (coord: CellCoord) => boolean;
    handleTypingKeyDown?: (e: KeyboardEvent) => void;
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
  /** Ref to resolve cell instruction (from useRenderLoop). */
  getInstructionForCellRef?: React.RefObject<
    ((row: number, col: number) => RenderInstruction | undefined) | null
  >;
  /** Ref to cell renderer registry (for cursor + renderer default actions). */
  cellRendererRegistryRef?: React.RefObject<CellRendererRegistryLike | null>;
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
  getInstructionForCellRef,
  cellRendererRegistryRef,
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
  const isCellEditableRef = useRef(handlers.isCellEditable);
  const handleTypingKeyDownRef = useRef(handlers.handleTypingKeyDown);
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
  isCellEditableRef.current = handlers.isCellEditable;
  handleTypingKeyDownRef.current = handlers.handleTypingKeyDown;

  // Track hovered cell for mouseEnter / mouseLeave on canvas components
  const prevHoverCellRef = useRef<CellCoord | null>(null);

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
          // 1. Component-level onClick (element-level handler)
          const instruction = getInstructionForCellRef?.current?.(coord.row, coord.col);
          if (instruction?._handlers?.onClick) {
            instruction._handlers.onClick(event);
          }
          // 2. Grid-level dispatch → user callback → renderer default → internal default
          dispatch("cellClick", event, () => {
            onCellClickRef.current?.(event);
            if (event.defaultPrevented) return;
            // Renderer default action (e.g., Link opens URL)
            if (instruction) {
              const renderer = cellRendererRegistryRef?.current?.get(instruction.type);
              renderer?.onCellClick?.(instruction);
            }
            if (handlers.handleCellClick) {
              handlers.handleCellClick(coord);
            } else if (editorManagerRef.current.isEditing) {
              editorManagerRef.current.cancel();
            }
          });
        },
        onCellDoubleClick: (coord, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          const instruction = getInstructionForCellRef?.current?.(coord.row, coord.col);
          if (instruction?._handlers?.onDoubleClick) {
            instruction._handlers.onDoubleClick(event);
          }
          dispatch("cellDoubleClick", event, () => {
            onCellDoubleClickRef.current?.(event);
            if (event.defaultPrevented) return;
            handlers.handleCellDoubleClick(coord);
          });
        },
        onCellMouseDown: (coord, shiftKey, native, coords) => {
          const event = createGridCellEvent(native, coord, coords);
          const instruction = getInstructionForCellRef?.current?.(coord.row, coord.col);
          if (instruction?._handlers?.onMouseDown) {
            instruction._handlers.onMouseDown(event);
          }
          dispatch("cellMouseDown", event, () => {
            onCellMouseDownRef.current?.(event);
            if (event.defaultPrevented) return;
            // Note: editor commit is handled in onCanvasEvent "mousedown"
            // which fires before this handler (covers all mousedown paths).
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
            handleTypingKeyDownRef.current?.(e);
          });
        },
        onScroll: (deltaY, deltaX, native) => {
          // Cancel editor on scroll (Step 3 #2)
          if (editorManagerRef.current.isEditing) {
            editorManagerRef.current.cancel();
          }
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
        onCellHover: (coord) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          if (coord) {
            // Check renderer cursor first (e.g., Link → "pointer")
            const instr = getInstructionForCellRef?.current?.(coord.row, coord.col);
            const renderer = instr ? cellRendererRegistryRef?.current?.get(instr.type) : undefined;
            if (renderer?.cursor) {
              canvas.style.cursor = renderer.cursor;
            } else if (isCellEditableRef.current?.(coord)) {
              canvas.style.cursor = "text";
            } else {
              canvas.style.cursor = "";
            }
          } else {
            canvas.style.cursor = "";
          }
        },
        onHeaderMouseDown: handlers.handleHeaderMouseDown
          ? (colIndex) => handlers.handleHeaderMouseDown!(colIndex)
          : undefined,
        onColumnDnDMove: handlers.handleColumnDnDMove,
        onColumnDnDEnd: handlers.handleColumnDnDEnd,
        onCanvasEvent: (type, native, hitTest, coords) => {
          // Cancel active editor on any mousedown on the canvas
          // (covers empty area, header DnD zone, resize handle — all paths
          // that don't route through onCellMouseDown).
          if (type === "mousedown" && editorManagerRef.current.isEditing) {
            editorManagerRef.current.cancel();
          }

          // Component-level mouseEnter / mouseLeave tracking
          if (type === "mousemove") {
            const newCell = hitTest.type === "cell" && hitTest.cell ? hitTest.cell : null;
            const prev = prevHoverCellRef.current;
            const changed =
              !prev !== !newCell ||
              (prev && newCell && (prev.row !== newCell.row || prev.col !== newCell.col));

            if (changed) {
              if (prev) {
                const prevInstr = getInstructionForCellRef?.current?.(prev.row, prev.col);
                if (prevInstr?._handlers?.onMouseLeave) {
                  prevInstr._handlers.onMouseLeave(createGridCellEvent(native, prev, coords));
                }
              }
              if (newCell) {
                const instr = getInstructionForCellRef?.current?.(newCell.row, newCell.col);
                if (instr?._handlers?.onMouseEnter) {
                  instr._handlers.onMouseEnter(createGridCellEvent(native, newCell, coords));
                }
              }
              prevHoverCellRef.current = newCell;
            }
          }

          // Component-level onMouseUp
          if (type === "mouseup" && hitTest.type === "cell" && hitTest.cell) {
            const instr = getInstructionForCellRef?.current?.(hitTest.cell.row, hitTest.cell.col);
            if (instr?._handlers?.onMouseUp) {
              instr._handlers.onMouseUp(createGridCellEvent(native, hitTest.cell, coords));
            }
          }

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
          // Component-level onTouchStart
          if (hitTest.type === "cell" && hitTest.cell) {
            const instruction = getInstructionForCellRef?.current?.(
              hitTest.cell.row,
              hitTest.cell.col,
            );
            if (instruction?._handlers?.onTouchStart) {
              const cellEvent = createGridCellEvent(
                new MouseEvent("touchstart"),
                hitTest.cell,
                coords,
              );
              instruction._handlers.onTouchStart(cellEvent);
            }
          }
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
          // Component-level onTouchEnd
          if (hitTest.type === "cell" && hitTest.cell) {
            const instruction = getInstructionForCellRef?.current?.(
              hitTest.cell.row,
              hitTest.cell.col,
            );
            if (instruction?._handlers?.onTouchEnd) {
              const cellEvent = createGridCellEvent(
                new MouseEvent("touchend"),
                hitTest.cell,
                coords,
              );
              instruction._handlers.onTouchEnd(cellEvent);
            }
          }
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
    handlers.handleCellClick,
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
