import type { CellCoord, CellLayout } from "../types";
import type { RegionLayout } from "../renderer/region";

// ── Constants ────────────────────────────────────────────────────────
const EDGE_ZONE = 30; // px from edge to trigger auto-scroll
const SCROLL_SPEED = 8; // px per frame
const TAP_THRESHOLD = 10; // max px movement to still count as tap
const TAP_DURATION = 200; // max ms for a tap
const DOUBLE_TAP_INTERVAL = 300; // ms between taps for double-tap
const DOUBLE_TAP_DISTANCE = 20; // max px between taps for double-tap
const LONG_PRESS_DURATION = 500; // ms hold → selection drag mode
const MOUSE_DRAG_THRESHOLD = 5; // px movement before mousemove triggers drag-extend
const RESIZE_HANDLE_ZONE = 5; // px from header right edge for resize handle

/** Content-space coordinates from a DOM event. */
export interface EventCoords {
  contentX: number;
  contentY: number;
  viewportX: number;
  viewportY: number;
}

/** Callback signatures for grid events. */
export interface GridEventHandlers {
  onCellClick?: (coord: CellCoord, native: MouseEvent, coords: EventCoords) => void;
  onCellDoubleClick?: (coord: CellCoord, native: MouseEvent, coords: EventCoords) => void;
  onHeaderClick?: (colIndex: number, native: MouseEvent, coords: EventCoords) => void;
  onScroll?: (deltaY: number, deltaX: number, native: WheelEvent | null) => void;
  onCellMouseDown?: (
    coord: CellCoord,
    shiftKey: boolean,
    native: MouseEvent,
    coords: EventCoords,
  ) => void;
  onCellMouseMove?: (coord: CellCoord, native: MouseEvent, coords: EventCoords) => void;
  /** Fires during drag when mouse is near viewport edges. deltaY/deltaX indicate scroll direction. */
  onDragEdge?: (deltaY: number, deltaX: number) => void;
  onCellMouseUp?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  // Resize handle events
  onResizeStart?: (colIndex: number, startX: number, startWidth: number) => void;
  onResizeMove?: (deltaX: number) => void;
  onResizeEnd?: () => void;
  onResizeHover?: (colIndex: number | null) => void;
  // Low-level canvas events (fires before semantic handlers)
  onCanvasEvent?: (
    type: "click" | "dblclick" | "mousedown" | "mousemove" | "mouseup",
    native: MouseEvent,
    hitTest: import("../types").HitTestResult,
    coords: EventCoords,
  ) => boolean | void;
  // Touch events (native TouchEvent passthrough)
  onTouchStart?: (
    native: TouchEvent,
    coords: EventCoords,
    hitTest: import("../types").HitTestResult,
  ) => boolean | void;
  onTouchMove?: (
    native: TouchEvent,
    coords: EventCoords,
    hitTest: import("../types").HitTestResult,
  ) => boolean | void;
  onTouchEnd?: (
    native: TouchEvent,
    coords: EventCoords,
    hitTest: import("../types").HitTestResult,
  ) => boolean | void;
}

/** Options for deltaMode normalization. */
export interface ScrollNormalization {
  /** Pixels per line for deltaMode=1 (DOM_DELTA_LINE). Typically rowHeight. */
  lineHeight: number;
  /** Pixels per page for deltaMode=2 (DOM_DELTA_PAGE). Typically viewport height. */
  pageHeight: number;
}

/** Find which cell a point (x, y) falls within. */
function findCell(x: number, y: number, layouts: CellLayout[]): CellCoord | null {
  for (const layout of layouts) {
    if (
      x >= layout.x &&
      x < layout.x + layout.width &&
      y >= layout.y &&
      y < layout.y + layout.height
    ) {
      return { row: layout.row, col: layout.col };
    }
  }
  return null;
}

/**
 * Clamp (x, y) into the bounding box of all layouts, then hit-test.
 * Returns the nearest cell when the mouse is outside the data area
 * (e.g. beyond the bottom edge during drag auto-scroll).
 */
function findNearestCell(x: number, y: number, layouts: CellLayout[]): CellCoord | null {
  if (layouts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const l of layouts) {
    if (l.x < minX) minX = l.x;
    if (l.y < minY) minY = l.y;
    const rx = l.x + l.width;
    const ry = l.y + l.height;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }
  const cx = Math.max(minX, Math.min(maxX - 1, x));
  const cy = Math.max(minY, Math.min(maxY - 1, y));
  return findCell(cx, cy, layouts);
}

/**
 * Translates canvas DOM events (mouse, keyboard, scroll) into
 * semantic grid events using hit-testing against cell layouts.
 */
export class EventManager {
  private controller: AbortController | null = null;
  private headerLayouts: CellLayout[] = [];
  private rowLayouts: CellLayout[] = [];
  private scrollLeft = 0;
  private lastViewportPos: { x: number; y: number } | null = null;
  private regionLayout: RegionLayout | null = null;

  // Touch state
  private touchState: {
    startX: number;
    startY: number;
    startTime: number;
    lastX: number;
    lastY: number;
    isScrolling: boolean;
    isSelectionDrag: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
  } | null = null;
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;

  // Mouse drag state
  private mouseDownPos: { x: number; y: number } | null = null;
  private mouseDragActive = false;

  // Resize state
  private resizeState: { colIndex: number; startX: number; startWidth: number } | null = null;

  /** Update the layouts used for hit-testing. */
  setLayouts(headerLayouts: CellLayout[], rowLayouts: CellLayout[]): void {
    this.headerLayouts = headerLayouts;
    this.rowLayouts = rowLayouts;
  }

  /** Set horizontal scroll offset for hit-test correction. */
  setScrollOffset(scrollLeft: number): void {
    this.scrollLeft = scrollLeft;
  }

  /** Set region layout for region-aware coordinate conversion. */
  setRegions(regionLayout: RegionLayout): void {
    this.regionLayout = regionLayout;
  }

  /** Region-aware viewport → content X conversion. */
  private toContentX(viewportX: number, canvasWidth: number): number {
    const rl = this.regionLayout;
    if (!rl || rl.regions.length <= 1) return viewportX + this.scrollLeft;
    const { leftWidth, rightWidth, totalContentWidth } = rl;
    if (viewportX < leftWidth) return viewportX;
    if (rightWidth > 0 && viewportX >= canvasWidth - rightWidth) {
      return viewportX + totalContentWidth - canvasWidth;
    }
    return viewportX + this.scrollLeft;
  }

  /**
   * Check if x is within resize handle zone of any header's right edge.
   * Returns col index or -1.
   */
  findResizeHandle(x: number, y: number): number {
    for (const h of this.headerLayouts) {
      const rightEdge = h.x + h.width;
      if (y >= h.y && y < h.y + h.height && Math.abs(x - rightEdge) <= RESIZE_HANDLE_ZONE) {
        return h.col;
      }
    }
    return -1;
  }

  /**
   * Re-run hit-test at the last known mouse position (for auto-scroll extend).
   * Falls back to nearest-cell when the mouse is outside the data area.
   */
  hitTestAtLastPos(canvasWidth?: number): CellCoord | null {
    if (!this.lastViewportPos) return null;
    const cw = canvasWidth ?? 0;
    const x =
      cw > 0
        ? this.toContentX(this.lastViewportPos.x, cw)
        : this.lastViewportPos.x + this.scrollLeft;
    const y = this.lastViewportPos.y;
    return findCell(x, y, this.rowLayouts) ?? findNearestCell(x, y, this.rowLayouts);
  }

  /** Attach event listeners to a canvas element. */
  attach(
    canvas: HTMLCanvasElement,
    handlers: GridEventHandlers,
    scrollNorm?: ScrollNormalization,
  ): void {
    this.detach();
    this.controller = new AbortController();
    const { signal } = this.controller;

    /** Convert client coords to content-space + viewport coords. */
    const toContentCoords = (clientX: number, clientY: number): EventCoords => {
      const rect = canvas.getBoundingClientRect();
      const viewportX = clientX - rect.left;
      const viewportY = clientY - rect.top;
      return {
        contentX: this.toContentX(viewportX, rect.width),
        contentY: viewportY,
        viewportX,
        viewportY,
      };
    };

    /** Build a HitTestResult from content-space coords. */
    const buildHitTest = (x: number, y: number): import("../types").HitTestResult => {
      const headerHit = findCell(x, y, this.headerLayouts);
      if (headerHit) {
        const resizeCol = this.findResizeHandle(x, y);
        if (resizeCol !== -1) return { type: "resize-handle", colIndex: resizeCol };
        return { type: "header", colIndex: headerHit.col };
      }
      const rowHit = findCell(x, y, this.rowLayouts);
      if (rowHit) return { type: "cell", cell: rowHit };
      return { type: "empty" };
    };

    canvas.addEventListener(
      "click",
      (e: MouseEvent) => {
        const coords = toContentCoords(e.clientX, e.clientY);
        const { contentX: x, contentY: y } = coords;

        // Fire low-level canvas event first
        if (handlers.onCanvasEvent) {
          const hitTest = buildHitTest(x, y);
          if (handlers.onCanvasEvent("click", e, hitTest, coords) === false) return;
        }

        // Check header first
        const headerHit = findCell(x, y, this.headerLayouts);
        if (headerHit) {
          handlers.onHeaderClick?.(headerHit.col, e, coords);
          return;
        }

        // Then check data rows
        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellClick?.(rowHit, e, coords);
        }
      },
      { signal },
    );

    canvas.addEventListener(
      "dblclick",
      (e: MouseEvent) => {
        const coords = toContentCoords(e.clientX, e.clientY);
        const { contentX: x, contentY: y } = coords;

        // Fire low-level canvas event first
        if (handlers.onCanvasEvent) {
          const hitTest = buildHitTest(x, y);
          if (handlers.onCanvasEvent("dblclick", e, hitTest, coords) === false) return;
        }

        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellDoubleClick?.(rowHit, e, coords);
        }
      },
      { signal },
    );

    canvas.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        const coords = toContentCoords(e.clientX, e.clientY);
        const { contentX: x, contentY: y } = coords;

        // Fire low-level canvas event first
        if (handlers.onCanvasEvent) {
          const hitTest = buildHitTest(x, y);
          if (handlers.onCanvasEvent("mousedown", e, hitTest, coords) === false) return;
        }

        // Check resize handle first (header right edge)
        const resizeCol = this.findResizeHandle(x, y);
        if (resizeCol !== -1) {
          const header = this.headerLayouts.find((h) => h.col === resizeCol);
          if (header) {
            this.resizeState = { colIndex: resizeCol, startX: e.clientX, startWidth: header.width };
            handlers.onResizeStart?.(resizeCol, e.clientX, header.width);
            e.preventDefault();
            return;
          }
        }

        this.mouseDownPos = { x: e.clientX, y: e.clientY };
        this.mouseDragActive = false;
        this.lastViewportPos = null;

        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellMouseDown?.(rowHit, e.shiftKey, e, coords);
        }
      },
      { signal },
    );

    // mousemove on window (not canvas) so drag tracking continues outside the canvas
    window.addEventListener(
      "mousemove",
      (e: MouseEvent) => {
        if (!(e.buttons & 1)) return; // left button not held

        // Resize drag in progress
        if (this.resizeState) {
          const deltaX = e.clientX - this.resizeState.startX;
          handlers.onResizeMove?.(deltaX);
          return;
        }

        if (!this.mouseDownPos) return; // drag didn't start on this canvas

        const rect = canvas.getBoundingClientRect();
        const viewportX = e.clientX - rect.left;
        const viewportY = e.clientY - rect.top;
        this.lastViewportPos = { x: viewportX, y: viewportY };

        // Require minimum mouse movement before activating drag-extend
        if (!this.mouseDragActive && this.mouseDownPos) {
          const dx = e.clientX - this.mouseDownPos.x;
          const dy = e.clientY - this.mouseDownPos.y;
          if (Math.sqrt(dx * dx + dy * dy) < MOUSE_DRAG_THRESHOLD) return;
          this.mouseDragActive = true;
        }

        const x = this.toContentX(viewportX, rect.width);
        const y = viewportY;
        const coords: EventCoords = { contentX: x, contentY: y, viewportX, viewportY };

        // Fire low-level canvas event
        if (handlers.onCanvasEvent) {
          const hitTest = buildHitTest(x, y);
          if (handlers.onCanvasEvent("mousemove", e, hitTest, coords) === false) return;
        }

        // Exact hit-test for cell under cursor
        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellMouseMove?.(rowHit, e, coords);
        } else {
          // Mouse is outside cells — use nearest cell for drag extend
          const nearest = findNearestCell(x, y, this.rowLayouts);
          if (nearest) {
            handlers.onCellMouseMove?.(nearest, e, coords);
          }
        }

        // Auto-scroll when dragging near or beyond viewport edges
        if (handlers.onDragEdge) {
          let dy = 0;
          let dx = 0;
          if (viewportY < EDGE_ZONE) dy = -SCROLL_SPEED;
          else if (viewportY > rect.height - EDGE_ZONE) dy = SCROLL_SPEED;
          if (viewportX < EDGE_ZONE) dx = -SCROLL_SPEED;
          else if (viewportX > rect.width - EDGE_ZONE) dx = SCROLL_SPEED;
          handlers.onDragEdge(dy, dx);
        }
      },
      { signal },
    );

    // mouseup on window to catch release outside canvas
    window.addEventListener(
      "mouseup",
      (e: MouseEvent) => {
        // Resize end
        if (this.resizeState) {
          handlers.onResizeEnd?.();
          this.resizeState = null;
          return;
        }

        if (!this.mouseDownPos && !this.mouseDragActive) return; // not our drag

        // Fire low-level canvas event
        if (handlers.onCanvasEvent) {
          const coords = toContentCoords(e.clientX, e.clientY);
          const hitTest = buildHitTest(coords.contentX, coords.contentY);
          if (handlers.onCanvasEvent("mouseup", e, hitTest, coords) === false) {
            this.mouseDownPos = null;
            this.mouseDragActive = false;
            return;
          }
        }

        this.mouseDownPos = null;
        this.mouseDragActive = false;
        handlers.onCellMouseUp?.();
      },
      { signal },
    );

    // mousemove on canvas for resize handle hover cursor
    canvas.addEventListener(
      "mousemove",
      (e: MouseEvent) => {
        if (e.buttons & 1) return; // skip during drag — handled by window mousemove
        const { x, y } = toContentCoords(e.clientX, e.clientY);
        const resizeCol = this.findResizeHandle(x, y);
        handlers.onResizeHover?.(resizeCol !== -1 ? resizeCol : null);
      },
      { signal },
    );

    // keydown on window for Ctrl+C, Escape etc.
    window.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        handlers.onKeyDown?.(e);
      },
      { signal },
    );

    const lineH = scrollNorm?.lineHeight ?? 36;
    const pageH = scrollNorm?.pageHeight ?? 400;

    canvas.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        let dy = e.deltaY;
        let dx = e.deltaX;
        // Normalize deltaMode to pixels
        if (e.deltaMode === 1) {
          // DOM_DELTA_LINE (Firefox mouse wheel)
          dy *= lineH;
          dx *= lineH;
        } else if (e.deltaMode === 2) {
          // DOM_DELTA_PAGE
          dy *= pageH;
          dx *= pageH;
        }
        handlers.onScroll?.(dy, dx, e);
      },
      { signal, passive: false },
    );

    // ── Touch event listeners ──────────────────────────────────────────

    /** Build EventCoords from touch clientX/clientY. */
    const touchToCoords = (clientX: number, clientY: number): EventCoords =>
      toContentCoords(clientX, clientY);

    /**
     * Create a synthetic MouseEvent from touch coordinates.
     * Used internally when touch-originated events flow through mouse-style handlers
     * (e.g., onCellClick triggered by tap). Users who need the real TouchEvent
     * should use onTouchStart/onTouchMove/onTouchEnd instead.
     */
    const syntheticMouse = (clientX: number, clientY: number, type = "click"): MouseEvent =>
      new MouseEvent(type, { clientX, clientY, bubbles: true });

    canvas.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        if (e.touches.length !== 1) return; // single finger only
        e.preventDefault();
        const touch = e.touches[0]!;
        const coords = touchToCoords(touch.clientX, touch.clientY);
        const hitTest = buildHitTest(coords.contentX, coords.contentY);
        const now = performance.now();

        // Fire user touch callback — preventDefault cancels all internal handling
        if (handlers.onTouchStart?.(e, coords, hitTest) === false) return;

        this.touchState = {
          startX: touch.clientX,
          startY: touch.clientY,
          startTime: now,
          lastX: touch.clientX,
          lastY: touch.clientY,
          isScrolling: false,
          isSelectionDrag: false,
          longPressTimer: setTimeout(() => {
            if (!this.touchState) return;
            // Finger hasn't moved much → enter selection drag mode
            const dx = this.touchState.lastX - this.touchState.startX;
            const dy = this.touchState.lastY - this.touchState.startY;
            if (Math.sqrt(dx * dx + dy * dy) < TAP_THRESHOLD) {
              this.touchState.isSelectionDrag = true;
              const lpc = touchToCoords(this.touchState.lastX, this.touchState.lastY);
              const hit = findCell(lpc.contentX, lpc.contentY, this.rowLayouts);
              if (hit) {
                const native = syntheticMouse(
                  this.touchState.lastX,
                  this.touchState.lastY,
                  "mousedown",
                );
                handlers.onCellMouseDown?.(hit, false, native, lpc);
              }
            }
          }, LONG_PRESS_DURATION),
        };
      },
      { signal, passive: false },
    );

    canvas.addEventListener(
      "touchmove",
      (e: TouchEvent) => {
        if (!this.touchState || e.touches.length !== 1) return;
        e.preventDefault();
        const touch = e.touches[0]!;
        const ts = this.touchState;
        const coords = touchToCoords(touch.clientX, touch.clientY);
        const hitTest = buildHitTest(coords.contentX, coords.contentY);

        // Fire user touch callback
        if (handlers.onTouchMove?.(e, coords, hitTest) === false) {
          ts.lastX = touch.clientX;
          ts.lastY = touch.clientY;
          return;
        }

        if (ts.isSelectionDrag) {
          // Selection drag — same logic as mouse drag
          const rect = canvas.getBoundingClientRect();
          const viewportX = touch.clientX - rect.left;
          const viewportY = touch.clientY - rect.top;
          this.lastViewportPos = { x: viewportX, y: viewportY };

          const hit =
            findCell(coords.contentX, coords.contentY, this.rowLayouts) ??
            findNearestCell(coords.contentX, coords.contentY, this.rowLayouts);
          if (hit) {
            const native = syntheticMouse(touch.clientX, touch.clientY, "mousemove");
            handlers.onCellMouseMove?.(hit, native, coords);
          }

          // Edge auto-scroll
          if (handlers.onDragEdge) {
            let dy = 0;
            let dx = 0;
            if (viewportY < EDGE_ZONE) dy = -SCROLL_SPEED;
            else if (viewportY > rect.height - EDGE_ZONE) dy = SCROLL_SPEED;
            if (viewportX < EDGE_ZONE) dx = -SCROLL_SPEED;
            else if (viewportX > rect.width - EDGE_ZONE) dx = SCROLL_SPEED;
            handlers.onDragEdge(dy, dx);
          }
        } else {
          // Scroll mode
          const dx = touch.clientX - ts.lastX;
          const dy = touch.clientY - ts.lastY;
          const totalDist = Math.sqrt(
            (touch.clientX - ts.startX) ** 2 + (touch.clientY - ts.startY) ** 2,
          );

          if (!ts.isScrolling && totalDist > TAP_THRESHOLD) {
            ts.isScrolling = true;
            // Cancel long-press timer once scrolling starts
            if (ts.longPressTimer) {
              clearTimeout(ts.longPressTimer);
              ts.longPressTimer = null;
            }
          }

          if (ts.isScrolling) {
            // Invert: finger moves down → content scrolls up (negative deltaY)
            handlers.onScroll?.(-dy, -dx, null);
          }
        }

        ts.lastX = touch.clientX;
        ts.lastY = touch.clientY;
      },
      { signal, passive: false },
    );

    canvas.addEventListener(
      "touchend",
      (e: TouchEvent) => {
        if (!this.touchState) return;
        const ts = this.touchState;
        const coords = touchToCoords(ts.lastX, ts.lastY);
        const hitTest = buildHitTest(coords.contentX, coords.contentY);

        // Cancel long-press timer
        if (ts.longPressTimer) {
          clearTimeout(ts.longPressTimer);
          ts.longPressTimer = null;
        }

        // Fire user touch callback
        if (handlers.onTouchEnd?.(e, coords, hitTest) === false) {
          this.touchState = null;
          return;
        }

        // Selection drag end
        if (ts.isSelectionDrag) {
          handlers.onCellMouseUp?.();
          this.touchState = null;
          return;
        }

        // Tap detection
        const now = performance.now();
        const elapsed = now - ts.startTime;
        const dist = Math.sqrt((ts.lastX - ts.startX) ** 2 + (ts.lastY - ts.startY) ** 2);

        if (dist < TAP_THRESHOLD && elapsed < TAP_DURATION) {
          const tapCoords = touchToCoords(ts.startX, ts.startY);
          const { contentX: x, contentY: y } = tapCoords;

          // Double-tap detection
          const timeSinceLastTap = now - this.lastTapTime;
          const tapDist = Math.sqrt(
            (ts.startX - this.lastTapX) ** 2 + (ts.startY - this.lastTapY) ** 2,
          );

          if (timeSinceLastTap < DOUBLE_TAP_INTERVAL && tapDist < DOUBLE_TAP_DISTANCE) {
            // Double-tap
            const hit = findCell(x, y, this.rowLayouts);
            if (hit) {
              const native = syntheticMouse(ts.startX, ts.startY, "dblclick");
              handlers.onCellDoubleClick?.(hit, native, tapCoords);
            }
            // Reset so a third tap doesn't trigger another double-tap
            this.lastTapTime = 0;
          } else {
            // Single tap
            const headerHit = findCell(x, y, this.headerLayouts);
            if (headerHit) {
              const native = syntheticMouse(ts.startX, ts.startY);
              handlers.onHeaderClick?.(headerHit.col, native, tapCoords);
            } else {
              const rowHit = findCell(x, y, this.rowLayouts);
              if (rowHit) {
                const native = syntheticMouse(ts.startX, ts.startY);
                handlers.onCellClick?.(rowHit, native, tapCoords);
                const nativeDown = syntheticMouse(ts.startX, ts.startY, "mousedown");
                handlers.onCellMouseDown?.(rowHit, false, nativeDown, tapCoords);
                handlers.onCellMouseUp?.();
              }
            }
            this.lastTapTime = now;
            this.lastTapX = ts.startX;
            this.lastTapY = ts.startY;
          }
        }

        this.touchState = null;
      },
      { signal, passive: false },
    );
  }

  /** Detach all event listeners in one call. */
  detach(): void {
    if (this.touchState?.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
    }
    this.touchState = null;
    this.controller?.abort();
    this.controller = null;
  }
}
