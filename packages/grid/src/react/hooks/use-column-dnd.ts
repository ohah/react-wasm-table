import { useCallback, useRef, useState } from "react";
import type { EventManager } from "../../adapter/event-manager";
import type { ColumnOrderUpdater } from "../../tanstack-types";

/** State exposed for drawing ghost and drop indicator during column DnD. */
export interface ColumnDnDState {
  isDragging: boolean;
  dragColIndex: number;
  ghostViewportX: number;
  dropIndicatorColIndex: number;
}

export interface UseColumnDnDParams {
  enableColumnDnD: boolean;
  /** Current column order (IDs). When undefined, use columns order. */
  columnOrder: string[] | undefined;
  /** Resolved columns (with id). */
  columns: { id: string }[];
  onColumnOrderChange?: (updater: ColumnOrderUpdater) => void;
  eventManagerRef: React.RefObject<EventManager | null>;
  /** Call to request next frame redraw (for ghost position during drag). */
  invalidate?: () => void;
}

/**
 * Reorder array: remove element at fromIndex, insert at toIndex.
 * toIndex is the index in the array *before* removal (so 0 = leftmost).
 */
function reorderColumnOrder(order: string[], fromIndex: number, toIndex: number): string[] {
  const ids = order.slice();
  const [draggedId] = ids.splice(fromIndex, 1);
  let insertAt = toIndex;
  if (insertAt > fromIndex) insertAt -= 1;
  ids.splice(insertAt, 0, draggedId);
  return ids;
}

export function useColumnDnD({
  enableColumnDnD,
  columnOrder,
  columns,
  onColumnOrderChange,
  eventManagerRef,
  invalidate,
}: UseColumnDnDParams) {
  const [dndState, setDndState] = useState<ColumnDnDState | null>(null);
  const dndStateRef = useRef<ColumnDnDState | null>(null);

  const syncRef = useCallback((state: ColumnDnDState | null) => {
    dndStateRef.current = state;
  }, []);

  const handleHeaderMouseDown = useCallback(
    (colIndex: number) => {
      if (!enableColumnDnD || !onColumnOrderChange) return;
      const state: ColumnDnDState = {
        isDragging: true,
        dragColIndex: colIndex,
        ghostViewportX: 0,
        dropIndicatorColIndex: colIndex,
      };
      setDndState(state);
      syncRef(state);
    },
    [enableColumnDnD, onColumnOrderChange, syncRef],
  );

  const handleColumnDnDMove = useCallback(
    (viewportX: number, contentX: number) => {
      if (!dndStateRef.current?.isDragging || !eventManagerRef.current) return;
      const headers = eventManagerRef.current.getHeaderLayouts();
      if (headers.length === 0) return;

      // Sort by col index and find "drop before" column: first column whose left edge is > contentX
      const sorted = headers.slice().sort((a, b) => a.col - b.col);
      let dropIndicatorColIndex = sorted.findIndex((h) => contentX < h.x);
      if (dropIndicatorColIndex === -1) dropIndicatorColIndex = sorted.length;

      const next: ColumnDnDState = {
        ...dndStateRef.current,
        ghostViewportX: viewportX,
        dropIndicatorColIndex,
      };
      setDndState(next);
      syncRef(next);
      invalidate?.();
    },
    [eventManagerRef, syncRef, invalidate],
  );

  const handleColumnDnDEnd = useCallback(() => {
    const state = dndStateRef.current;
    if (!state?.isDragging || !onColumnOrderChange) {
      setDndState(null);
      syncRef(null);
      return;
    }

    // Only reorder if column was actually moved to a different position
    const from = state.dragColIndex;
    const to = state.dropIndicatorColIndex;
    if (from !== to && from + 1 !== to) {
      const order = columnOrder ?? columns.map((c) => c.id);
      const newOrder = reorderColumnOrder(order, from, to);
      onColumnOrderChange(newOrder);
    }

    setDndState(null);
    syncRef(null);
  }, [columnOrder, columns, onColumnOrderChange, syncRef]);

  return {
    dndState,
    dndStateRef,
    handleHeaderMouseDown,
    handleColumnDnDMove,
    handleColumnDnDEnd,
  };
}
