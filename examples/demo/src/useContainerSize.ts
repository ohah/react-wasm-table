import { useRef, useState, useEffect } from "react";

export function useContainerSize(defaultHeight = 600) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: defaultHeight });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]!.contentRect;
      setSize({
        width: Math.floor(width),
        height: Math.floor(height) || defaultHeight,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [defaultHeight]);

  return { ref, size };
}
