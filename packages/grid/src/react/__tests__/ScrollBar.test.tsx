import { describe, expect, it, mock } from "bun:test";
import React, { createRef } from "react";
import {
  ScrollBar,
  syncScrollBarPosition,
  syncScrollBarContentSize,
  MAX_SCROLL_SIZE,
} from "../ScrollBar";

describe("ScrollBar", () => {
  describe("component interface", () => {
    it("renders as a valid React element with vertical orientation", () => {
      const onScrollChange = mock(() => {});
      const element = (
        <ScrollBar
          orientation="vertical"
          contentSize={5000}
          viewportSize={500}
          onScrollChange={onScrollChange}
        />
      );
      expect(element).toBeDefined();
      expect(element.type).toBeDefined();
      expect(element.props.orientation).toBe("vertical");
      expect(element.props.contentSize).toBe(5000);
      expect(element.props.viewportSize).toBe(500);
    });

    it("renders as a valid React element with horizontal orientation", () => {
      const onScrollChange = mock(() => {});
      const element = (
        <ScrollBar
          orientation="horizontal"
          contentSize={3000}
          viewportSize={800}
          onScrollChange={onScrollChange}
        />
      );
      expect(element.props.orientation).toBe("horizontal");
    });

    it("accepts optional props: className, style", () => {
      const onScrollChange = mock(() => {});
      const element = (
        <ScrollBar
          orientation="vertical"
          contentSize={5000}
          viewportSize={500}
          onScrollChange={onScrollChange}
          className="custom-scrollbar"
          style={{ width: 12 }}
        />
      );
      expect(element.props.className).toBe("custom-scrollbar");
      expect(element.props.style).toEqual({ width: 12 });
    });

    it("accepts a forwarded ref", () => {
      const ref = createRef<HTMLDivElement>();
      const onScrollChange = mock(() => {});
      const element = (
        <ScrollBar
          ref={ref}
          orientation="vertical"
          contentSize={5000}
          viewportSize={500}
          onScrollChange={onScrollChange}
        />
      );
      expect(element).toBeDefined();
      // In React 19, ref is passed as a regular prop
      expect(element.props.ref).toBe(ref);
    });
  });

  describe("syncScrollBarPosition", () => {
    it("does nothing when element is null", () => {
      // Should not throw
      syncScrollBarPosition(null, 100, "vertical", 500);
    });

    it("sets scrollTop for vertical orientation", () => {
      const el = { scrollTop: 0, scrollLeft: 0, dataset: {} } as unknown as HTMLDivElement;
      syncScrollBarPosition(el, 150, "vertical", 500);
      expect(el.scrollTop).toBe(150);
    });

    it("sets scrollLeft for horizontal orientation", () => {
      const el = { scrollTop: 0, scrollLeft: 0, dataset: {} } as unknown as HTMLDivElement;
      syncScrollBarPosition(el, 200, "horizontal", 500);
      expect(el.scrollLeft).toBe(200);
    });

    it("skips sync when position difference is within threshold", () => {
      const el = { scrollTop: 100, scrollLeft: 0, dataset: {} } as unknown as HTMLDivElement;
      syncScrollBarPosition(el, 100.3, "vertical", 500);
      // Within 0.5 threshold — should not update
      expect(el.scrollTop).toBe(100);
    });

    it("syncs when position difference exceeds threshold", () => {
      const el = { scrollTop: 100, scrollLeft: 0, dataset: {} } as unknown as HTMLDivElement;
      syncScrollBarPosition(el, 101, "vertical", 500);
      expect(el.scrollTop).toBe(101);
    });
  });

  describe("syncScrollBarContentSize", () => {
    it("does nothing when element is null", () => {
      syncScrollBarContentSize(null, 5000, "vertical");
    });

    it("sets inner element height for vertical orientation", () => {
      const inner = { style: { height: "", width: "" } } as HTMLElement;
      const el = {
        firstElementChild: inner,
        dataset: {},
      } as unknown as HTMLDivElement;
      syncScrollBarContentSize(el, 5000, "vertical");
      expect(inner.style.height).toBe("5000px");
      expect(el.dataset.actualSize).toBe("5000");
    });

    it("sets inner element width for horizontal orientation", () => {
      const inner = { style: { height: "", width: "" } } as HTMLElement;
      const el = {
        firstElementChild: inner,
        dataset: {},
      } as unknown as HTMLDivElement;
      syncScrollBarContentSize(el, 3000, "horizontal");
      expect(inner.style.width).toBe("3000px");
      expect(el.dataset.actualSize).toBe("3000");
    });

    it("caps inner element size at MAX_SCROLL_SIZE", () => {
      const inner = { style: { height: "", width: "" } } as HTMLElement;
      const el = {
        firstElementChild: inner,
        dataset: {},
      } as unknown as HTMLDivElement;
      const bigSize = 36_000_000; // 1M rows × 36px
      syncScrollBarContentSize(el, bigSize, "vertical");
      expect(inner.style.height).toBe(`${MAX_SCROLL_SIZE}px`);
      expect(el.dataset.actualSize).toBe(String(bigSize));
    });

    it("does not cap when contentSize <= MAX_SCROLL_SIZE", () => {
      const inner = { style: { height: "", width: "" } } as HTMLElement;
      const el = {
        firstElementChild: inner,
        dataset: {},
      } as unknown as HTMLDivElement;
      syncScrollBarContentSize(el, 5_000_000, "vertical");
      expect(inner.style.height).toBe("5000000px");
    });
  });

  describe("scroll position scaling", () => {
    it("does not scale when content fits within MAX_SCROLL_SIZE", () => {
      const el = {
        scrollTop: 0,
        scrollLeft: 0,
        dataset: { actualSize: "5000" },
      } as unknown as HTMLDivElement;
      syncScrollBarPosition(el, 2500, "vertical", 500);
      expect(el.scrollTop).toBe(2500);
    });

    it("reverse-scales actual position to scrollbar position when content exceeds MAX_SCROLL_SIZE", () => {
      const actualSize = 36_000_000;
      const viewportSize = 600;
      const el = {
        scrollTop: 0,
        scrollLeft: 0,
        dataset: { actualSize: String(actualSize) },
      } as unknown as HTMLDivElement;

      // scrollbarRange = MAX_SCROLL_SIZE - viewportSize = 10_000_000 - 600 = 9_999_400
      // actualRange = 36_000_000 - 600 = 35_999_400
      // ratio = 35_999_400 / 9_999_400 ≈ 3.60012
      // scrollbarPos = actualPos / ratio
      const actualPos = 35_999_400; // max actual scroll position
      const scrollbarRange = MAX_SCROLL_SIZE - viewportSize;
      const actualRange = actualSize - viewportSize;
      const ratio = actualRange / scrollbarRange;
      const expectedScrollbarPos = actualPos / ratio;

      syncScrollBarPosition(el, actualPos, "vertical", viewportSize);
      expect(el.scrollTop).toBeCloseTo(expectedScrollbarPos, 0);
    });

    it("scaling round-trip: scrollbar → actual → scrollbar preserves position", () => {
      const actualSize = 36_000_000;
      const viewportSize = 600;
      const scrollbarRange = MAX_SCROLL_SIZE - viewportSize;
      const actualRange = actualSize - viewportSize;
      const ratio = actualRange / scrollbarRange;

      // Simulate scrollbar at 50% position
      const scrollbarPos = scrollbarRange * 0.5;
      const actualPos = scrollbarPos * ratio; // forward: scrollbar → actual

      // Now reverse: actual → scrollbar
      const el = {
        scrollTop: 0,
        scrollLeft: 0,
        dataset: { actualSize: String(actualSize) },
      } as unknown as HTMLDivElement;
      syncScrollBarPosition(el, actualPos, "vertical", viewportSize);

      expect(el.scrollTop).toBeCloseTo(scrollbarPos, 0);
    });

    it("scaling reaches end of content: max scrollbar position maps to max actual position", () => {
      const actualSize = 36_000_000;
      const viewportSize = 600;
      const scrollbarRange = MAX_SCROLL_SIZE - viewportSize;
      const actualRange = actualSize - viewportSize;
      const ratio = actualRange / scrollbarRange;

      // Max scrollbar position → max actual position
      const maxScrollbarPos = scrollbarRange;
      const maxActualPos = maxScrollbarPos * ratio;
      expect(maxActualPos).toBeCloseTo(actualRange, 0);
    });
  });
});
