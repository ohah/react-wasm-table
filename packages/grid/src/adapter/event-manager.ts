import type { CellCoord, CellLayout } from "../types";

// ── Constants ────────────────────────────────────────────────────────
const EDGE_ZONE = 30; // px from edge to trigger auto-scroll
const SCROLL_SPEED = 8; // px per frame
const TAP_THRESHOLD = 10; // max px movement to still count as tap
const TAP_DURATION = 200; // max ms for a tap
const DOUBLE_TAP_INTERVAL = 300; // ms between taps for double-tap
const DOUBLE_TAP_DISTANCE = 20; // max px between taps for double-tap
const LONG_PRESS_DURATION = 500; // ms hold → selection drag mode

/** Callback signatures for grid events. */
export interface GridEventHandlers {
  onCellClick?: (coord: CellCoord) => void;
  onCellDoubleClick?: (coord: CellCoord) => void;
  onHeaderClick?: (colIndex: number) => void;
  onScroll?: (deltaY: number, deltaX: number) => void;
  onCellMouseDown?: (coord: CellCoord, shiftKey: boolean) => void;
  onCellMouseMove?: (coord: CellCoord) => void;
  /** Fires during drag when mouse is near viewport edges. deltaY/deltaX indicate scroll direction. */
  onDragEdge?: (deltaY: number, deltaX: number) => void;
  onCellMouseUp?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
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

  /** Update the layouts used for hit-testing. */
  setLayouts(headerLayouts: CellLayout[], rowLayouts: CellLayout[]): void {
    this.headerLayouts = headerLayouts;
    this.rowLayouts = rowLayouts;
  }

  /** Set horizontal scroll offset for hit-test correction. */
  setScrollOffset(scrollLeft: number): void {
    this.scrollLeft = scrollLeft;
  }

  /**
   * Re-run hit-test at the last known mouse position (for auto-scroll extend).
   * Falls back to nearest-cell when the mouse is outside the data area.
   */
  hitTestAtLastPos(): CellCoord | null {
    if (!this.lastViewportPos) return null;
    const x = this.lastViewportPos.x + this.scrollLeft;
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

    /** Convert client coords to content-space coords (works for mouse & touch). */
    const toContentCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left + this.scrollLeft;
      const y = clientY - rect.top;
      return { x, y };
    };

    canvas.addEventListener(
      "click",
      (e: MouseEvent) => {
        const { x, y } = toContentCoords(e.clientX, e.clientY);

        // Check header first
        const headerHit = findCell(x, y, this.headerLayouts);
        if (headerHit) {
          handlers.onHeaderClick?.(headerHit.col);
          return;
        }

        // Then check data rows
        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellClick?.(rowHit);
        }
      },
      { signal },
    );

    canvas.addEventListener(
      "dblclick",
      (e: MouseEvent) => {
        const { x, y } = toContentCoords(e.clientX, e.clientY);

        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellDoubleClick?.(rowHit);
        }
      },
      { signal },
    );

    canvas.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        const { x, y } = toContentCoords(e.clientX, e.clientY);

        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellMouseDown?.(rowHit, e.shiftKey);
        }
      },
      { signal },
    );

    // mousemove on window (not canvas) so drag tracking continues outside the canvas
    window.addEventListener(
      "mousemove",
      (e: MouseEvent) => {
        if (!(e.buttons & 1)) return; // left button not held

        const rect = canvas.getBoundingClientRect();
        const viewportX = e.clientX - rect.left;
        const viewportY = e.clientY - rect.top;
        this.lastViewportPos = { x: viewportX, y: viewportY };

        const x = viewportX + this.scrollLeft;
        const y = viewportY;

        // Exact hit-test for cell under cursor
        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellMouseMove?.(rowHit);
        } else {
          // Mouse is outside cells — use nearest cell for drag extend
          const nearest = findNearestCell(x, y, this.rowLayouts);
          if (nearest) {
            handlers.onCellMouseMove?.(nearest);
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
      () => {
        handlers.onCellMouseUp?.();
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
        handlers.onScroll?.(dy, dx);
      },
      { signal, passive: false },
    );

    // ── Touch event listeners ──────────────────────────────────────────

    canvas.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        if (e.touches.length !== 1) return; // single finger only
        e.preventDefault();
        const touch = e.touches[0]!;
        const now = performance.now();

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
              const { x, y } = toContentCoords(this.touchState.lastX, this.touchState.lastY);
              const hit = findCell(x, y, this.rowLayouts);
              if (hit) {
                handlers.onCellMouseDown?.(hit, false);
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

        if (ts.isSelectionDrag) {
          // Selection drag — same logic as mouse drag
          const rect = canvas.getBoundingClientRect();
          const viewportX = touch.clientX - rect.left;
          const viewportY = touch.clientY - rect.top;
          this.lastViewportPos = { x: viewportX, y: viewportY };

          const { x, y } = toContentCoords(touch.clientX, touch.clientY);
          const hit = findCell(x, y, this.rowLayouts) ?? findNearestCell(x, y, this.rowLayouts);
          if (hit) {
            handlers.onCellMouseMove?.(hit);
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
            handlers.onScroll?.(-dy, -dx);
          }
        }

        ts.lastX = touch.clientX;
        ts.lastY = touch.clientY;
      },
      { signal, passive: false },
    );

    canvas.addEventListener(
      "touchend",
      (_e: TouchEvent) => {
        if (!this.touchState) return;
        const ts = this.touchState;

        // Cancel long-press timer
        if (ts.longPressTimer) {
          clearTimeout(ts.longPressTimer);
          ts.longPressTimer = null;
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
          const { x, y } = toContentCoords(ts.startX, ts.startY);

          // Double-tap detection
          const timeSinceLastTap = now - this.lastTapTime;
          const tapDist = Math.sqrt(
            (ts.startX - this.lastTapX) ** 2 + (ts.startY - this.lastTapY) ** 2,
          );

          if (timeSinceLastTap < DOUBLE_TAP_INTERVAL && tapDist < DOUBLE_TAP_DISTANCE) {
            // Double-tap
            const hit = findCell(x, y, this.rowLayouts);
            if (hit) {
              handlers.onCellDoubleClick?.(hit);
            }
            // Reset so a third tap doesn't trigger another double-tap
            this.lastTapTime = 0;
          } else {
            // Single tap
            const headerHit = findCell(x, y, this.headerLayouts);
            if (headerHit) {
              handlers.onHeaderClick?.(headerHit.col);
            } else {
              const rowHit = findCell(x, y, this.rowLayouts);
              if (rowHit) {
                handlers.onCellClick?.(rowHit);
                handlers.onCellMouseDown?.(rowHit, false);
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
