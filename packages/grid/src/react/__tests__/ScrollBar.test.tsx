import { describe, expect, it, mock } from "bun:test";
import React, { createRef } from "react";
import { ScrollBar, syncScrollBarPosition } from "../ScrollBar";

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
      syncScrollBarPosition(null, 100, "vertical");
    });

    it("sets scrollTop for vertical orientation", () => {
      const el = { scrollTop: 0, scrollLeft: 0 } as HTMLDivElement;
      syncScrollBarPosition(el, 150, "vertical");
      expect(el.scrollTop).toBe(150);
    });

    it("sets scrollLeft for horizontal orientation", () => {
      const el = { scrollTop: 0, scrollLeft: 0 } as HTMLDivElement;
      syncScrollBarPosition(el, 200, "horizontal");
      expect(el.scrollLeft).toBe(200);
    });

    it("skips sync when position difference is within threshold", () => {
      const el = { scrollTop: 100, scrollLeft: 0 } as HTMLDivElement;
      syncScrollBarPosition(el, 100.3, "vertical");
      // Within 0.5 threshold — should not update
      expect(el.scrollTop).toBe(100);
    });

    it("syncs when position difference exceeds threshold", () => {
      const el = { scrollTop: 100, scrollLeft: 0 } as HTMLDivElement;
      syncScrollBarPosition(el, 101, "vertical");
      expect(el.scrollTop).toBe(101);
    });
  });
});
