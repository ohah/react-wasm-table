import { useRef, useCallback } from "react";
import type { ColumnRegistry } from "../../adapter/column-registry";

export interface UseGridScrollParams {
  data: Record<string, unknown>[];
  rowHeight: number;
  height: number;
  headerHeight: number;
  width: number;
  columnRegistry: ColumnRegistry;
  invalidate: () => void;
}

export function useGridScroll({
  data,
  rowHeight,
  height,
  headerHeight,
  width,
  columnRegistry,
  invalidate,
}: UseGridScrollParams) {
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDeltaRef = useRef({ dy: 0, dx: 0 });

  const applyScrollDelta = useCallback(
    (dy: number, dx: number) => {
      const maxScrollY = Math.max(0, data.length * rowHeight - (height - headerHeight));
      scrollTopRef.current = Math.max(0, Math.min(maxScrollY, scrollTopRef.current + dy));
      const cols = columnRegistry.getAll();
      // CssDimension: non-number width (string/"auto") falls back to 100 for scroll math
      const totalColWidth = cols.reduce(
        (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
        0,
      );
      const maxScrollX = Math.max(0, totalColWidth - width);
      scrollLeftRef.current = Math.max(0, Math.min(maxScrollX, scrollLeftRef.current + dx));
      invalidate();
    },
    [data.length, rowHeight, height, headerHeight, width, columnRegistry, invalidate],
  );

  const handleWheel = useCallback(
    (deltaY: number, deltaX: number) => {
      applyScrollDelta(deltaY, deltaX);
    },
    [applyScrollDelta],
  );

  const handleDragEdge = useCallback(
    (dy: number, dx: number) => {
      autoScrollDeltaRef.current = { dy, dx };
      if (dy === 0 && dx === 0) {
        if (autoScrollRef.current) {
          clearInterval(autoScrollRef.current);
          autoScrollRef.current = null;
        }
        return;
      }
      if (!autoScrollRef.current) {
        autoScrollRef.current = setInterval(() => {
          const { dy: ady, dx: adx } = autoScrollDeltaRef.current;
          if (ady === 0 && adx === 0) return;
          applyScrollDelta(ady, adx);
        }, 16);
      }
    },
    [applyScrollDelta],
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    autoScrollDeltaRef.current = { dy: 0, dx: 0 };
  }, []);

  const handleVScrollChange = useCallback(
    (pos: number) => {
      if (Math.abs(scrollTopRef.current - pos) < 0.5) return;
      scrollTopRef.current = pos;
      invalidate();
    },
    [invalidate],
  );

  const handleHScrollChange = useCallback(
    (pos: number) => {
      if (Math.abs(scrollLeftRef.current - pos) < 0.5) return;
      scrollLeftRef.current = pos;
      invalidate();
    },
    [invalidate],
  );

  return {
    scrollTopRef,
    scrollLeftRef,
    handleWheel,
    handleDragEdge,
    stopAutoScroll,
    handleVScrollChange,
    handleHScrollChange,
  };
}
