import { forwardRef, useRef, useCallback, useImperativeHandle } from "react";

/**
 * Browsers cap the max scrollable height of a DOM element at ~16,777,216px (2^24).
 * We cap at 10M to stay well within that limit.
 * When contentSize > MAX_SCROLL_SIZE, we scale scrollbar positions proportionally.
 */
export const MAX_SCROLL_SIZE = 10_000_000;

export interface ScrollBarProps {
  /** Scroll direction. */
  orientation: "vertical" | "horizontal";
  /** Total content size in pixels. */
  contentSize: number;
  /** Viewport size in pixels. */
  viewportSize: number;
  /** Scroll position change callback. */
  onScrollChange: (position: number) => void;
  /** Additional className. */
  className?: string;
  /** Additional style overrides. */
  style?: React.CSSProperties;
}

/**
 * Native browser scrollbar component.
 * Renders a real `overflow: scroll` div so the browser provides its native scrollbar.
 * Use `forwardRef` to allow parent to directly sync `scrollTop`/`scrollLeft`.
 */
export const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(function ScrollBar(
  { orientation, contentSize, viewportSize, onScrollChange, className, style },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const isExternalSync = useRef(false);
  const viewportSizeRef = useRef(viewportSize);
  viewportSizeRef.current = viewportSize;

  useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

  const handleScroll = useCallback(() => {
    if (isExternalSync.current || !innerRef.current) return;
    const scrollbarPos =
      orientation === "vertical" ? innerRef.current.scrollTop : innerRef.current.scrollLeft;

    const actualSize = Number(innerRef.current.dataset.actualSize) || 0;
    const cappedSize = Math.min(actualSize, MAX_SCROLL_SIZE);
    const vp = viewportSizeRef.current;

    if (actualSize > MAX_SCROLL_SIZE && cappedSize > vp) {
      const scrollbarRange = cappedSize - vp;
      const actualRange = actualSize - vp;
      const ratio = actualRange / scrollbarRange;
      onScrollChange(scrollbarPos * ratio);
    } else {
      onScrollChange(scrollbarPos);
    }
  }, [orientation, onScrollChange]);

  const isVertical = orientation === "vertical";
  const cappedContentSize = Math.min(contentSize, MAX_SCROLL_SIZE);

  return (
    <div
      ref={innerRef}
      className={className}
      onScroll={handleScroll}
      data-scrollbar={orientation}
      data-actual-size={contentSize}
      style={{
        position: "absolute",
        ...(isVertical
          ? {
              right: 0,
              top: 0,
              width: 17,
              height: "100%",
              overflowY: "scroll",
              overflowX: "hidden",
            }
          : {
              bottom: 0,
              left: 0,
              height: 17,
              width: "100%",
              overflowX: "scroll",
              overflowY: "hidden",
            }),
        background: "transparent",
        ...style,
      }}
    >
      <div
        style={
          isVertical
            ? { width: 1, height: cappedContentSize }
            : { height: 1, width: cappedContentSize }
        }
      />
    </div>
  );
});

/** Update a scrollbar's inner content size from outside React (e.g. after filtering). */
export function syncScrollBarContentSize(
  el: HTMLDivElement | null,
  contentSize: number,
  orientation: "vertical" | "horizontal",
): void {
  if (!el) return;
  const inner = el.firstElementChild as HTMLElement | null;
  if (!inner) return;

  const capped = Math.min(contentSize, MAX_SCROLL_SIZE);
  el.dataset.actualSize = String(contentSize);

  if (orientation === "vertical") {
    inner.style.height = `${capped}px`;
  } else {
    inner.style.width = `${capped}px`;
  }
}

/** Sync a scrollbar div's scroll position from external state (prevents feedback loops via threshold). */
export function syncScrollBarPosition(
  el: HTMLDivElement | null,
  position: number,
  orientation: "vertical" | "horizontal",
  viewportSize: number,
): void {
  if (!el) return;

  const actualSize = Number(el.dataset.actualSize) || 0;
  let scrollbarPos = position;

  if (actualSize > MAX_SCROLL_SIZE) {
    const cappedSize = MAX_SCROLL_SIZE;
    const vp = viewportSize;
    if (cappedSize > vp) {
      const scrollbarRange = cappedSize - vp;
      const actualRange = actualSize - vp;
      const ratio = actualRange / scrollbarRange;
      scrollbarPos = position / ratio;
    }
  }

  if (orientation === "vertical") {
    if (Math.abs(el.scrollTop - scrollbarPos) > 0.5) {
      el.scrollTop = scrollbarPos;
    }
  } else {
    if (Math.abs(el.scrollLeft - scrollbarPos) > 0.5) {
      el.scrollLeft = scrollbarPos;
    }
  }
}
