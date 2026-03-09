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
import type { EventManager } from "../../adapter/event-manager";
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
import {
  getDropdownPanelState,
  openDropdownPanel,
  closeDropdownPanel,
  hitTestDropdownPanel,
  setDropdownHoveredIndex,
  _getTriggerRectMap,
  resolveDropdownPanelStyle,
} from "../../renderer/components/dropdown";

export interface UseEventAttachmentParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Scroll overlay div — sits on top of canvas and handles native wheel scroll. */
  scrollOverlayRef?: React.RefObject<HTMLDivElement | null>;
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
    handleHeaderMouseDown?: (colIndex: number, viewportX: number) => void;
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
  /** Invalidate (request redraw). Used by dropdown panel hover/close. */
  invalidate?: () => void;
  /** Ref to current scroll offsets (for dropdown panel hit-testing). */
  scrollLeftRef?: React.RefObject<number>;
  scrollTopRef?: React.RefObject<number>;
}

export function useEventAttachment({
  canvasRef,
  scrollOverlayRef,
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
  invalidate,
  scrollLeftRef,
  scrollTopRef,
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
    const overlay = scrollOverlayRef?.current;
    const em = eventManagerRef.current;
    if (!canvas || !em) return;
    // Attach to overlay if available (native wheel scroll), otherwise fall back to canvas
    const eventTarget = overlay ?? canvas;

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
      eventTarget,
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

            // Dropdown toggle: open panel on cell click
            if (instruction?.type === "dropdown" && !instruction.disabled) {
              const dropdownInst = instruction as import("../../types").DropdownInstruction;
              const cellKey = `${coord.row}:${coord.col}`;
              const canvas = canvasRef.current;
              const current = getDropdownPanelState(canvas ?? undefined);
              if (current?.key === cellKey) {
                // Toggle off (close)
                closeDropdownPanel();
                invalidate?.();
              } else if (canvas) {
                // Open panel — read cached trigger rect
                const triggerRect = _getTriggerRectMap().get(cellKey);
                if (triggerRect && dropdownInst.options.length > 0) {
                  openDropdownPanel({
                    canvas,
                    key: cellKey,
                    options: dropdownInst.options,
                    value: dropdownInst.value,
                    hoveredIndex: -1,
                    onChange: dropdownInst.onChange,
                    triggerX: triggerRect.x,
                    triggerY: triggerRect.y,
                    triggerW: triggerRect.w,
                    triggerH: triggerRect.h,
                    style: resolveDropdownPanelStyle(dropdownInst.style),
                  });
                  invalidate?.();
                }
              }
              return; // skip default cell click handling for dropdown
            }

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
          // Close dropdown panel on scroll
          if (getDropdownPanelState()) {
            closeDropdownPanel();
            invalidate?.();
          }
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
          // Set cursor on the event target (overlay if available, else canvas)
          if (coord) {
            const instr = getInstructionForCellRef?.current?.(coord.row, coord.col);
            const renderer = instr ? cellRendererRegistryRef?.current?.get(instr.type) : undefined;
            if (renderer?.cursor) {
              eventTarget.style.cursor = renderer.cursor;
            } else if (isCellEditableRef.current?.(coord)) {
              eventTarget.style.cursor = "text";
            } else {
              eventTarget.style.cursor = "";
            }
          } else {
            eventTarget.style.cursor = "";
          }
        },
        onHeaderMouseDown: handlers.handleHeaderMouseDown
          ? (colIndex, _native, coords) =>
              handlers.handleHeaderMouseDown!(colIndex, coords.viewportX)
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

          // ── Dropdown panel event handling ──────────────────────────
          const panelState = getDropdownPanelState(canvasRef.current ?? undefined);
          if (panelState) {
            const sL = scrollLeftRef?.current ?? 0;
            const sT = scrollTopRef?.current ?? 0;

            if (type === "mousemove") {
              const hit = hitTestDropdownPanel(coords.viewportX, coords.viewportY, sL, sT, height);
              if (hit?.type === "item") {
                if (setDropdownHoveredIndex(hit.index)) {
                  invalidate?.();
                }
              } else if (setDropdownHoveredIndex(-1)) {
                invalidate?.();
              }
            }

            if (type === "click") {
              const hit = hitTestDropdownPanel(coords.viewportX, coords.viewportY, sL, sT, height);
              if (hit?.type === "item") {
                // Select the option
                const opt = panelState.options[hit.index];
                if (opt) {
                  panelState.onChange?.(opt.value);
                }
                closeDropdownPanel();
                invalidate?.();
                return false; // block cell click
              }
              // Click outside panel → close it
              closeDropdownPanel();
              invalidate?.();
              // If clicked on the same dropdown cell, let onCellClick toggle (it'll see panel is closed now)
              // If clicked elsewhere, still need to block to prevent unwanted side effects
              const clickedOnDropdownTrigger =
                hitTest.type === "cell" &&
                hitTest.cell &&
                `${hitTest.cell.row}:${hitTest.cell.col}` === panelState.key;
              if (!clickedOnDropdownTrigger) {
                return false;
              }
            }
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

    // ── Native scroll event on overlay ─────────────────────────────────
    // The overlay div has overflow: auto — wheel events scroll it natively.
    // We read its scrollTop/scrollLeft and sync to scrollTopRef/scrollLeftRef.
    const onNativeScroll = overlay
      ? () => {
          const actualH = Number(overlay.dataset.actualHeight) || 0;
          const actualW = Number(overlay.dataset.actualWidth) || 0;

          // Convert capped scroll position to actual content position (MAX_SCROLL_SIZE ratio)
          let effectiveTop = overlay.scrollTop;
          if (actualH > 10_000_000) {
            const cappedRange = Math.min(actualH, 10_000_000) - height;
            const actualRange = actualH - height;
            if (cappedRange > 0 && actualRange > 0) {
              effectiveTop = overlay.scrollTop * (actualRange / cappedRange);
            }
          }
          let effectiveLeft = overlay.scrollLeft;
          if (actualW > 10_000_000) {
            const cappedRange = Math.min(actualW, 10_000_000) - overlay.clientWidth;
            const actualRange = actualW - overlay.clientWidth;
            if (cappedRange > 0 && actualRange > 0) {
              effectiveLeft = overlay.scrollLeft * (actualRange / cappedRange);
            }
          }

          const deltaY = effectiveTop - (scrollTopRef?.current ?? 0);
          const deltaX = effectiveLeft - (scrollLeftRef?.current ?? 0);
          if (Math.abs(deltaY) < 0.5 && Math.abs(deltaX) < 0.5) return;

          // Side effects: close dropdown, cancel editor
          if (getDropdownPanelState()) {
            closeDropdownPanel();
            invalidate?.();
          }
          if (editorManagerRef.current.isEditing) {
            editorManagerRef.current.cancel();
          }

          // Fire onScroll callback through middleware
          const event = createGridScrollEvent(deltaY, deltaX, null);
          dispatch("scroll", event, () => {
            onScrollRef.current?.(event);
            if (event.defaultPrevented) return;
            // Update scroll refs
            if (scrollTopRef)
              (scrollTopRef as React.MutableRefObject<number>).current = effectiveTop;
            if (scrollLeftRef)
              (scrollLeftRef as React.MutableRefObject<number>).current = effectiveLeft;
            invalidate?.();
          });
        }
      : null;

    if (overlay && onNativeScroll) {
      overlay.addEventListener("scroll", onNativeScroll, { passive: true });
    }

    return () => {
      em.detach();
      if (overlay && onNativeScroll) {
        overlay.removeEventListener("scroll", onNativeScroll);
      }
    };
  }, [
    canvasRef,
    scrollOverlayRef,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs (scrollTopRef, scrollLeftRef, cellRendererRegistryRef, getInstructionForCellRef) have stable identity; invalidate is a stable useCallback; handlers object identity is managed by caller
  ]);
}
