import { useRef, useCallback, useEffect } from "react";

const DEFAULT_FETCH_AHEAD = 100;
const DEBOUNCE_MS = 16;

export interface UseStreamingParams {
  data: Record<string, unknown>[];
  totalCount?: number;
  onFetchMore?: (startIndex: number, count: number) => void;
  fetchAhead?: number;
}

export interface UseStreamingReturn {
  effectiveTotalRows: number;
  isStreaming: boolean;
  /** Called from render loop — triggers fetch when scrolling near unloaded data. */
  checkAndFetch: (scrollTop: number, rowHeight: number, viewportHeight: number) => void;
}

export function useStreaming({
  data,
  totalCount,
  onFetchMore,
  fetchAhead = DEFAULT_FETCH_AHEAD,
}: UseStreamingParams): UseStreamingReturn {
  const isStreaming = totalCount != null;
  const effectiveTotalRows = isStreaming ? totalCount : data.length;

  // Track in-flight fetch range to prevent duplicate requests
  const inFlightRef = useRef<{ start: number; end: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs for callback values
  const onFetchMoreRef = useRef(onFetchMore);
  onFetchMoreRef.current = onFetchMore;
  const dataLenRef = useRef(data.length);
  dataLenRef.current = data.length;
  const totalCountRef = useRef(totalCount);
  totalCountRef.current = totalCount;
  const fetchAheadRef = useRef(fetchAhead);
  fetchAheadRef.current = fetchAhead;

  // Reset in-flight state when data grows (fetch completed)
  useEffect(() => {
    const inf = inFlightRef.current;
    if (inf && data.length >= inf.end) {
      inFlightRef.current = null;
    }
  }, [data.length]);

  const checkAndFetch = useCallback(
    (scrollTop: number, rowHeight: number, viewportHeight: number) => {
      if (!totalCountRef.current || !onFetchMoreRef.current) return;
      if (rowHeight <= 0) return;

      const currentLen = dataLenRef.current;
      const total = totalCountRef.current;
      if (currentLen >= total) return;

      const visEnd = Math.floor(scrollTop / rowHeight) + Math.ceil(viewportHeight / rowHeight);
      const ahead = fetchAheadRef.current;

      if (visEnd + ahead >= currentLen) {
        // Skip if already fetching an overlapping range
        if (inFlightRef.current && inFlightRef.current.end > currentLen) return;

        // Debounce
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          const len = dataLenRef.current;
          const tot = totalCountRef.current ?? 0;
          if (len >= tot) return;
          const batchSize = Math.min(ahead, tot - len);
          inFlightRef.current = { start: len, end: len + batchSize };
          onFetchMoreRef.current?.(len, batchSize);
        }, DEBOUNCE_MS);
      }
    },
    [],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { effectiveTotalRows, isStreaming, checkAndFetch };
}
