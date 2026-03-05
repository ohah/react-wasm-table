import { describe, expect, it, mock, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useStreaming } from "../hooks/use-streaming";

describe("useStreaming", () => {
  beforeEach(() => {
    mock.module("timers", () => ({}));
  });

  describe("effectiveTotalRows", () => {
    it("returns data.length when totalCount is not set", () => {
      const data = [{ a: 1 }, { a: 2 }, { a: 3 }] as Record<string, unknown>[];
      const { result } = renderHook(() => useStreaming({ data }));
      expect(result.current.effectiveTotalRows).toBe(3);
      expect(result.current.isStreaming).toBe(false);
    });

    it("returns totalCount when set", () => {
      const data = [{ a: 1 }] as Record<string, unknown>[];
      const { result } = renderHook(() => useStreaming({ data, totalCount: 10000 }));
      expect(result.current.effectiveTotalRows).toBe(10000);
      expect(result.current.isStreaming).toBe(true);
    });

    it("updates effectiveTotalRows when data grows", () => {
      let data = [{ a: 1 }] as Record<string, unknown>[];
      const { result, rerender } = renderHook(() => useStreaming({ data }));
      expect(result.current.effectiveTotalRows).toBe(1);

      data = [{ a: 1 }, { a: 2 }] as Record<string, unknown>[];
      rerender();
      expect(result.current.effectiveTotalRows).toBe(2);
    });
  });

  describe("checkAndFetch", () => {
    it("does not call onFetchMore when rowHeight <= 0", async () => {
      const onFetchMore = mock(() => {});
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      const { result } = renderHook(() =>
        useStreaming({ data, totalCount: 100, onFetchMore, fetchAhead: 5 }),
      );

      act(() => {
        result.current.checkAndFetch(0, 0, 500);
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(onFetchMore).not.toHaveBeenCalled();
    });

    it("does not call onFetchMore when not streaming", () => {
      const onFetchMore = mock(() => {});
      const data = [{ a: 1 }] as Record<string, unknown>[];
      const { result } = renderHook(() => useStreaming({ data, onFetchMore }));

      act(() => {
        result.current.checkAndFetch(0, 36, 500);
      });

      // No totalCount → not streaming → no fetch
      expect(onFetchMore).not.toHaveBeenCalled();
    });

    it("calls onFetchMore when visible end + fetchAhead >= data.length (debounced)", async () => {
      const onFetchMore = mock(() => {});
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      const { result } = renderHook(() =>
        useStreaming({
          data,
          totalCount: 10000,
          onFetchMore,
          fetchAhead: 50,
        }),
      );

      // Scroll to near end: visEnd = floor(3200/36) + ceil(500/36) = 88 + 14 = 102
      // 102 + 50 = 152 >= 100 → should trigger
      act(() => {
        result.current.checkAndFetch(3200, 36, 500);
      });

      // Wait for debounce (50ms)
      await new Promise((r) => setTimeout(r, 80));

      expect(onFetchMore).toHaveBeenCalledWith(100, 50);
    });

    it("does not call onFetchMore when data is already fully loaded", async () => {
      const onFetchMore = mock(() => {});
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      const { result } = renderHook(() =>
        useStreaming({
          data,
          totalCount: 100,
          onFetchMore,
          fetchAhead: 50,
        }),
      );

      act(() => {
        result.current.checkAndFetch(3200, 36, 500);
      });

      await new Promise((r) => setTimeout(r, 80));

      expect(onFetchMore).not.toHaveBeenCalled();
    });

    it("does not call onFetchMore when scroll position is far from end", async () => {
      const onFetchMore = mock(() => {});
      const data = Array.from({ length: 1000 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      const { result } = renderHook(() =>
        useStreaming({
          data,
          totalCount: 10000,
          onFetchMore,
          fetchAhead: 100,
        }),
      );

      // Scroll to top: visEnd = 0 + 14 = 14; 14 + 100 = 114 < 1000
      act(() => {
        result.current.checkAndFetch(0, 36, 500);
      });

      await new Promise((r) => setTimeout(r, 80));

      expect(onFetchMore).not.toHaveBeenCalled();
    });

    it("prevents duplicate fetches for overlapping ranges", async () => {
      const onFetchMore = mock(() => {});
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      const { result } = renderHook(() =>
        useStreaming({
          data,
          totalCount: 10000,
          onFetchMore,
          fetchAhead: 50,
        }),
      );

      // First call
      act(() => {
        result.current.checkAndFetch(3200, 36, 500);
      });
      await new Promise((r) => setTimeout(r, 80));

      // Second call before data arrives — should be skipped
      act(() => {
        result.current.checkAndFetch(3200, 36, 500);
      });
      await new Promise((r) => setTimeout(r, 80));

      expect(onFetchMore).toHaveBeenCalledTimes(1);
    });

    it("resets in-flight state when data grows", async () => {
      const onFetchMore = mock(() => {});
      let data = Array.from({ length: 100 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      const { result, rerender } = renderHook(
        ({ d }) =>
          useStreaming({
            data: d,
            totalCount: 10000,
            onFetchMore,
            fetchAhead: 50,
          }),
        { initialProps: { d: data } },
      );

      // Trigger first fetch
      act(() => {
        result.current.checkAndFetch(3200, 36, 500);
      });
      await new Promise((r) => setTimeout(r, 80));
      expect(onFetchMore).toHaveBeenCalledTimes(1);

      // Simulate data arrival
      data = Array.from({ length: 150 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      rerender({ d: data });

      // Trigger another fetch — should work now since in-flight was reset
      act(() => {
        result.current.checkAndFetch(5000, 36, 500);
      });
      await new Promise((r) => setTimeout(r, 80));
      expect(onFetchMore).toHaveBeenCalledTimes(2);
    });

    it("limits batch size to remaining rows", async () => {
      const onFetchMore = mock(() => {});
      const data = Array.from({ length: 9980 }, (_, i) => ({ id: i })) as Record<string, unknown>[];
      const { result } = renderHook(() =>
        useStreaming({
          data,
          totalCount: 10000,
          onFetchMore,
          fetchAhead: 100,
        }),
      );

      // Near the end: remaining = 10000 - 9980 = 20, but fetchAhead = 100
      // batchSize = min(100, 20) = 20
      // visEnd = floor(356000/36) + ceil(500/36) = 9888 + 14 = 9902; 9902 + 100 = 10002 >= 9980
      act(() => {
        result.current.checkAndFetch(356000, 36, 500);
      });
      await new Promise((r) => setTimeout(r, 80));

      expect(onFetchMore).toHaveBeenCalledWith(9980, 20);
    });
  });
});
