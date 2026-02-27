import { forwardRef, useRef, useCallback, useImperativeHandle } from "react";

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
  { orientation, contentSize, onScrollChange, className, style },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const isExternalSync = useRef(false);

  useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

  const handleScroll = useCallback(() => {
    if (isExternalSync.current || !innerRef.current) return;
    const pos =
      orientation === "vertical" ? innerRef.current.scrollTop : innerRef.current.scrollLeft;
    onScrollChange(pos);
  }, [orientation, onScrollChange]);

  const isVertical = orientation === "vertical";

  return (
    <div
      ref={innerRef}
      className={className}
      onScroll={handleScroll}
      data-scrollbar={orientation}
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
        style={isVertical ? { width: 1, height: contentSize } : { height: 1, width: contentSize }}
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
  if (orientation === "vertical") {
    inner.style.height = `${contentSize}px`;
  } else {
    inner.style.width = `${contentSize}px`;
  }
}

/** Sync a scrollbar div's scroll position from external state (prevents feedback loops via threshold). */
export function syncScrollBarPosition(
  el: HTMLDivElement | null,
  position: number,
  orientation: "vertical" | "horizontal",
): void {
  if (!el) return;
  if (orientation === "vertical") {
    if (Math.abs(el.scrollTop - position) > 0.5) {
      el.scrollTop = position;
    }
  } else {
    if (Math.abs(el.scrollLeft - position) > 0.5) {
      el.scrollLeft = position;
    }
  }
}
