import { useSyncExternalStore, useCallback, useRef } from "react";
import type { DomOverlayDescriptor } from "../../types";

/**
 * Renders DOM <input> overlays for Input instructions collected by the render loop.
 * Uses a polling approach since the render loop updates a ref each rAF frame.
 *
 * Note: The layout buffer y-coordinates are already viewport-relative (WASM virtual scroll).
 * Only x-coordinates need scrollLeft adjustment (content-space → viewport-space).
 */
export function useDomOverlays(
  domOverlaysRef: React.RefObject<DomOverlayDescriptor[]>,
  scrollLeftRef: React.RefObject<number>,
) {
  const lastSnapshotRef = useRef<DomOverlayDescriptor[]>([]);

  const subscribe = useCallback(
    (listener: () => void) => {
      let rafId: number;
      const poll = () => {
        const current = domOverlaysRef.current;
        if (current !== lastSnapshotRef.current) {
          lastSnapshotRef.current = current;
          listener();
        }
        rafId = requestAnimationFrame(poll);
      };
      rafId = requestAnimationFrame(poll);
      return () => {
        cancelAnimationFrame(rafId);
      };
    },
    [domOverlaysRef],
  );

  const getSnapshot = useCallback(() => {
    return domOverlaysRef.current;
  }, [domOverlaysRef]);

  const overlays = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const scrollLeft = scrollLeftRef.current;

  return { overlays, scrollLeft };
}
