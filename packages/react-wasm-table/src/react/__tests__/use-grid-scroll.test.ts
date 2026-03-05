import { describe, expect, it, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useGridScroll } from "../hooks/use-grid-scroll";
import { ColumnRegistry } from "../../adapter/column-registry";

function makeRegistry(widths: number[]) {
  const reg = new ColumnRegistry();
  reg.setAll(widths.map((w, i) => ({ id: `col${i}`, width: w })) as any);
  return reg;
}

function defaultParams(overrides?: Partial<Parameters<typeof useGridScroll>[0]>) {
  const data =
    overrides?.data ??
    (Array.from({ length: 100 }, (_, i) => ({ id: i })) as Record<string, unknown>[]);
  return {
    data,
    viewRowCountRef: { current: data.length },
    rowHeight: 36,
    height: 600,
    headerHeight: 40,
    width: 500,
    columnRegistry: makeRegistry([200, 200, 200]),
    invalidate: mock(() => {}),
    ...overrides,
  };
}

describe("useGridScroll", () => {
  describe("handleWheel (vertical scroll)", () => {
    it("scrolls down by deltaY", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleWheel(100, 0));
      expect(result.current.scrollTopRef.current).toBe(100);
      expect(params.invalidate).toHaveBeenCalled();
    });

    it("clamps scrollTop to max", () => {
      const params = defaultParams();
      // max = 100*36 - (600-40) = 3040
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleWheel(9999, 0));
      expect(result.current.scrollTopRef.current).toBe(3040);
    });

    it("clamps scrollTop to 0", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleWheel(-100, 0));
      expect(result.current.scrollTopRef.current).toBe(0);
    });

    it("maxScrollY is 0 when content fits viewport", () => {
      const params = defaultParams({
        data: Array.from({ length: 5 }, (_, i) => ({ id: i })) as Record<string, unknown>[],
      });
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleWheel(100, 0));
      // 5*36 = 180 < 560 → max=0
      expect(result.current.scrollTopRef.current).toBe(0);
    });
  });

  describe("handleWheel (horizontal scroll)", () => {
    it("scrolls right by deltaX", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      // totalColWidth=600, maxScrollX=600-500=100
      act(() => result.current.handleWheel(0, 50));
      expect(result.current.scrollLeftRef.current).toBe(50);
    });

    it("clamps scrollLeft to max", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleWheel(0, 9999));
      expect(result.current.scrollLeftRef.current).toBe(100); // 600-500
    });

    it("handles both deltaY and deltaX simultaneously", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleWheel(200, 50));
      expect(result.current.scrollTopRef.current).toBe(200);
      expect(result.current.scrollLeftRef.current).toBe(50);
    });
  });

  describe("handleVScrollChange", () => {
    it("updates scrollTop directly", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleVScrollChange(500));
      expect(result.current.scrollTopRef.current).toBe(500);
      expect(params.invalidate).toHaveBeenCalled();
    });

    it("skips update when position is within 0.5 threshold", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleVScrollChange(0.3));
      // 0.3 is within 0.5 of initial 0 → skip
      expect(params.invalidate).not.toHaveBeenCalled();
    });
  });

  describe("handleHScrollChange", () => {
    it("updates scrollLeft directly", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleHScrollChange(80));
      expect(result.current.scrollLeftRef.current).toBe(80);
    });

    it("skips update when position is within 0.5 threshold", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleHScrollChange(0.3));
      expect(params.invalidate).not.toHaveBeenCalled();
    });
  });

  describe("scrollToRow", () => {
    it("scrolls down when row is below viewport", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      // Row 50 cellBottom = 50*36+36 = 1836, viewport = 560, scrollTop = 0
      // 1836 > 0 + 560, so should scroll
      act(() => result.current.scrollToRow(50));
      // scrollTop = cellBottom - viewportHeight = 1836 - 560 = 1276
      expect(result.current.scrollTopRef.current).toBe(1276);
      expect(params.invalidate).toHaveBeenCalled();
    });

    it("scrolls up when row is above viewport", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      // First scroll down
      act(() => result.current.handleWheel(2000, 0));
      expect(result.current.scrollTopRef.current).toBe(2000);

      // Row 5 cellTop = 5*36 = 180, which is < scrollTop 2000
      act(() => result.current.scrollToRow(5));
      expect(result.current.scrollTopRef.current).toBe(180);
    });

    it("does nothing when row is already visible", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      // Row 5 cellTop=180, cellBottom=216, viewport=[0, 560] — visible
      act(() => result.current.scrollToRow(5));
      expect(result.current.scrollTopRef.current).toBe(0);
      // invalidate not called from scrollToRow (only from initial render)
      expect(params.invalidate).not.toHaveBeenCalled();
    });

    it("clamps to maxScrollY", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      // Last row (99) cellBottom = 99*36+36 = 3600, but maxScrollY = 3040
      act(() => result.current.scrollToRow(99));
      expect(result.current.scrollTopRef.current).toBe(3040);
    });

    it("scrolls to 0 for first row", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      // First scroll down
      act(() => result.current.handleWheel(500, 0));
      expect(result.current.scrollTopRef.current).toBe(500);

      // Scroll back to row 0
      act(() => result.current.scrollToRow(0));
      expect(result.current.scrollTopRef.current).toBe(0);
    });
  });

  describe("handleDragEdge / stopAutoScroll", () => {
    it("starts auto-scroll interval on non-zero delta", async () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleDragEdge(8, 0));
      // Wait for interval to fire at least once (16ms)
      await new Promise((r) => setTimeout(r, 50));
      act(() => result.current.stopAutoScroll());
      // scrollTop should have increased from auto-scroll
      expect(result.current.scrollTopRef.current).toBeGreaterThan(0);
    });

    it("stopAutoScroll clears the interval", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleDragEdge(8, 0));
      act(() => result.current.stopAutoScroll());

      // After stop, scrollTop should not keep increasing
      const scrollAfterStop = result.current.scrollTopRef.current;
      // Wait a tick to verify no further updates
      expect(result.current.scrollTopRef.current).toBe(scrollAfterStop);
    });

    it("clears interval when delta becomes zero", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useGridScroll(params));

      act(() => result.current.handleDragEdge(8, 0));
      act(() => result.current.handleDragEdge(0, 0));
      // Should be safe, interval cleared
    });
  });
});
