import type { CellCoord, CellLayout } from "../types";

/** Callback signatures for grid events. */
export interface GridEventHandlers {
  onCellClick?: (coord: CellCoord) => void;
  onCellDoubleClick?: (coord: CellCoord) => void;
  onHeaderClick?: (colIndex: number) => void;
  onScroll?: (deltaY: number, deltaX: number) => void;
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
 * Translates canvas DOM events (mouse, keyboard, scroll) into
 * semantic grid events using hit-testing against cell layouts.
 */
export class EventManager {
  private controller: AbortController | null = null;
  private headerLayouts: CellLayout[] = [];
  private rowLayouts: CellLayout[] = [];
  /** Update the layouts used for hit-testing. */
  setLayouts(headerLayouts: CellLayout[], rowLayouts: CellLayout[]): void {
    this.headerLayouts = headerLayouts;
    this.rowLayouts = rowLayouts;
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

    canvas.addEventListener(
      "click",
      (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rowHit = findCell(x, y, this.rowLayouts);
        if (rowHit) {
          handlers.onCellDoubleClick?.(rowHit);
        }
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
  }

  /** Detach all event listeners in one call. */
  detach(): void {
    this.controller?.abort();
    this.controller = null;
  }
}
