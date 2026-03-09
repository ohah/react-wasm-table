import { useRef, useCallback } from "react";
import type { ColumnRegistry } from "../../adapter/column-registry";
import { MAX_SCROLL_SIZE } from "../ScrollBar";

export interface UseGridScrollParams {
  data: Record<string, unknown>[];
  viewRowCountRef: React.RefObject<number>;
  rowHeight: number;
  height: number;
  headerHeight: number;
  width: number;
  columnRegistry: ColumnRegistry;
  invalidate: () => void;
  scrollOverlayRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Sync scrollTopRef/scrollLeftRef → overlay element (reverse direction).
 * Uses threshold to prevent feedback loops with the overlay scroll event.
 */
function syncOverlayFromRefs(
  overlay: HTMLDivElement | null,
  scrollTop: number,
  scrollLeft: number,
  contentHeight: number,
  contentWidth: number,
  viewportHeight: number,
  viewportWidth: number,
): void {
  if (!overlay) return;

  // Handle MAX_SCROLL_SIZE ratio conversion
  let targetTop = scrollTop;
  if (contentHeight > MAX_SCROLL_SIZE) {
    const cappedRange = MAX_SCROLL_SIZE - viewportHeight;
    const actualRange = contentHeight - viewportHeight;
    if (actualRange > 0 && cappedRange > 0) {
      targetTop = scrollTop * (cappedRange / actualRange);
    }
  }
  let targetLeft = scrollLeft;
  if (contentWidth > MAX_SCROLL_SIZE) {
    const cappedRange = MAX_SCROLL_SIZE - viewportWidth;
    const actualRange = contentWidth - viewportWidth;
    if (actualRange > 0 && cappedRange > 0) {
      targetLeft = scrollLeft * (cappedRange / actualRange);
    }
  }

  if (Math.abs(overlay.scrollTop - targetTop) > 0.5) {
    overlay.scrollTop = targetTop;
  }
  if (Math.abs(overlay.scrollLeft - targetLeft) > 0.5) {
    overlay.scrollLeft = targetLeft;
  }
}

export function useGridScroll({
  data: _data,
  viewRowCountRef,
  rowHeight,
  height,
  headerHeight,
  width,
  columnRegistry,
  invalidate,
  scrollOverlayRef,
}: UseGridScrollParams) {
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDeltaRef = useRef({ dy: 0, dx: 0 });

  const applyScrollDelta = useCallback(
    (dy: number, dx: number) => {
      const rowCount = viewRowCountRef.current;
      const maxScrollY = Math.max(0, rowCount * rowHeight - (height - headerHeight));
      scrollTopRef.current = Math.max(0, Math.min(maxScrollY, scrollTopRef.current + dy));
      const cols = columnRegistry.getAll();
      const totalColWidth = cols.reduce(
        (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
        0,
      );
      const maxScrollX = Math.max(0, totalColWidth - width);
      scrollLeftRef.current = Math.max(0, Math.min(maxScrollX, scrollLeftRef.current + dx));

      // Sync overlay element from updated refs (for programmatic scroll like auto-scroll, touch)
      const contentH = rowCount * rowHeight + headerHeight;
      syncOverlayFromRefs(
        scrollOverlayRef?.current ?? null,
        scrollTopRef.current,
        scrollLeftRef.current,
        contentH,
        totalColWidth,
        height,
        width,
      );
      invalidate();
    },
    [
      viewRowCountRef,
      rowHeight,
      height,
      headerHeight,
      width,
      columnRegistry,
      invalidate,
      scrollOverlayRef,
    ],
  );

  /** Called from touch scroll in EventManager (touch still uses manual delta). */
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
      // Sync overlay
      const overlay = scrollOverlayRef?.current ?? null;
      if (overlay) {
        const rowCount = viewRowCountRef.current;
        const contentH = rowCount * rowHeight + headerHeight;
        const cols = columnRegistry.getAll();
        const totalColWidth = cols.reduce(
          (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
          0,
        );
        syncOverlayFromRefs(
          overlay,
          pos,
          scrollLeftRef.current,
          contentH,
          totalColWidth,
          height,
          width,
        );
      }
      invalidate();
    },
    [
      invalidate,
      scrollOverlayRef,
      viewRowCountRef,
      rowHeight,
      headerHeight,
      columnRegistry,
      height,
      width,
    ],
  );

  const handleHScrollChange = useCallback(
    (pos: number) => {
      if (Math.abs(scrollLeftRef.current - pos) < 0.5) return;
      scrollLeftRef.current = pos;
      // Sync overlay
      const overlay = scrollOverlayRef?.current ?? null;
      if (overlay) {
        const rowCount = viewRowCountRef.current;
        const contentH = rowCount * rowHeight + headerHeight;
        const cols = columnRegistry.getAll();
        const totalColWidth = cols.reduce(
          (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
          0,
        );
        syncOverlayFromRefs(
          overlay,
          scrollTopRef.current,
          pos,
          contentH,
          totalColWidth,
          height,
          width,
        );
      }
      invalidate();
    },
    [
      invalidate,
      scrollOverlayRef,
      viewRowCountRef,
      rowHeight,
      headerHeight,
      columnRegistry,
      height,
      width,
    ],
  );

  /** Scroll so that the given data row (0-based) is visible in the viewport. */
  const scrollToRow = useCallback(
    (dataRowIndex: number) => {
      const cellTop = dataRowIndex * rowHeight;
      const cellBottom = cellTop + rowHeight;
      const viewportHeight = height - headerHeight;
      const maxScrollY = Math.max(0, viewRowCountRef.current * rowHeight - viewportHeight);
      const scrollTop = scrollTopRef.current;

      if (cellTop < scrollTop) {
        scrollTopRef.current = Math.max(0, Math.min(maxScrollY, cellTop));
      } else if (cellBottom > scrollTop + viewportHeight) {
        scrollTopRef.current = Math.max(0, Math.min(maxScrollY, cellBottom - viewportHeight));
      } else {
        return; // already visible
      }
      // Sync overlay
      const rowCount = viewRowCountRef.current;
      const contentH = rowCount * rowHeight + headerHeight;
      const cols = columnRegistry.getAll();
      const totalColWidth = cols.reduce(
        (sum, c) => sum + (typeof c.width === "number" ? c.width : 100),
        0,
      );
      syncOverlayFromRefs(
        scrollOverlayRef?.current ?? null,
        scrollTopRef.current,
        scrollLeftRef.current,
        contentH,
        totalColWidth,
        height,
        width,
      );
      invalidate();
    },
    [
      rowHeight,
      height,
      headerHeight,
      viewRowCountRef,
      invalidate,
      scrollOverlayRef,
      columnRegistry,
      width,
    ],
  );

  return {
    scrollTopRef,
    scrollLeftRef,
    handleWheel,
    handleDragEdge,
    stopAutoScroll,
    handleVScrollChange,
    handleHScrollChange,
    scrollToRow,
  };
}
