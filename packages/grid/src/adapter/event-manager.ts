import type { CellCoord } from "../types";

/** Callback signatures for grid events. */
export interface GridEventHandlers {
  onCellClick?: (coord: CellCoord) => void;
  onCellDoubleClick?: (coord: CellCoord) => void;
  onHeaderClick?: (colIndex: number) => void;
  onScroll?: (scrollTop: number) => void;
}

/**
 * Translates canvas DOM events (mouse, keyboard, scroll) into
 * semantic grid events using hit-testing against cell layouts.
 */
export class EventManager {
  /** Attach event listeners to a canvas element. */
  attach(_canvas: HTMLCanvasElement, _handlers: GridEventHandlers): void {
    throw new Error("TODO: EventManager.attach");
  }

  /** Detach all event listeners. */
  detach(): void {
    throw new Error("TODO: EventManager.detach");
  }
}
