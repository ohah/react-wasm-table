import { useCallback, useRef } from "react";
import type { ColumnRegistry } from "../../adapter/column-registry";
import type { ColumnSizingState, ColumnSizingUpdater } from "../../tanstack-types";

export interface UseColumnResizeParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  columnRegistry: ColumnRegistry;
  columnSizingProp?: ColumnSizingState;
  onColumnSizingChangeProp?: (updater: ColumnSizingUpdater) => void;
  invalidate: () => void;
}

const DEFAULT_MIN_WIDTH = 30;

export function useColumnResize({
  canvasRef,
  columnRegistry,
  columnSizingProp,
  onColumnSizingChangeProp,
  invalidate,
}: UseColumnResizeParams) {
  const resizingRef = useRef<{ colIndex: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback(
    (_colIndex: number, _startX: number, startWidth: number) => {
      resizingRef.current = { colIndex: _colIndex, startWidth };
    },
    [],
  );

  const handleResizeMove = useCallback(
    (deltaX: number) => {
      if (!resizingRef.current) return;
      const { colIndex, startWidth } = resizingRef.current;

      const cols = columnRegistry.getAll();
      const col = cols[colIndex];
      if (!col) return;

      const minWidth = typeof col.minWidth === "number" ? col.minWidth : DEFAULT_MIN_WIDTH;
      const maxWidth = typeof col.maxWidth === "number" ? col.maxWidth : Infinity;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));

      if (onColumnSizingChangeProp) {
        // Controlled mode: notify parent
        onColumnSizingChangeProp((prev: ColumnSizingState) => ({
          ...prev,
          [col.id]: newWidth,
        }));
      } else {
        // Uncontrolled: directly update registry
        columnRegistry.register(col.id, { ...col, width: newWidth });
        invalidate();
      }
    },
    [columnRegistry, onColumnSizingChangeProp, invalidate],
  );

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = null;
  }, []);

  const handleResizeHover = useCallback(
    (colIndex: number | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.cursor = colIndex !== null ? "col-resize" : "";
    },
    [canvasRef],
  );

  return {
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleResizeHover,
  };
}
