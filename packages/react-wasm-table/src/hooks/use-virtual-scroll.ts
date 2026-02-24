import { useCallback, useRef } from "react";

interface UseVirtualScrollOptions {
  onScroll: (scrollTop: number) => void;
}

export function useVirtualScroll({ onScroll }: UseVirtualScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      onScroll(container.scrollTop);
      rafRef.current = null;
    });
  }, [onScroll]);

  return {
    containerRef,
    handleScroll,
  };
}
