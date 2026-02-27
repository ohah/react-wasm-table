import { describe, expect, it } from "bun:test";
import {
  createGridCellEvent,
  createGridHeaderEvent,
  createGridKeyboardEvent,
  createGridScrollEvent,
  createGridCanvasEvent,
  createGridTouchEvent,
} from "../../event-helpers";

describe("event-helpers", () => {
  const coords = { contentX: 150, contentY: 60, viewportX: 50, viewportY: 60 };

  describe("createGridCellEvent", () => {
    it("creates event with cell, coords, and modifier keys", () => {
      const native = new MouseEvent("click", { clientX: 50, clientY: 60, shiftKey: true });
      const event = createGridCellEvent(native, { row: 2, col: 1 }, coords);

      expect(event.cell).toEqual({ row: 2, col: 1 });
      expect(event.nativeEvent).toBe(native);
      expect(event.contentX).toBe(150);
      expect(event.contentY).toBe(60);
      expect(event.viewportX).toBe(50);
      expect(event.viewportY).toBe(60);
      expect(event.shiftKey).toBe(true);
      expect(event.ctrlKey).toBe(false);
      expect(event.metaKey).toBe(false);
      expect(event.altKey).toBe(false);
    });

    it("supports preventDefault", () => {
      const native = new MouseEvent("click");
      const event = createGridCellEvent(native, { row: 0, col: 0 }, coords);

      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("createGridHeaderEvent", () => {
    it("creates event with colIndex and coords", () => {
      const native = new MouseEvent("click", { clientX: 100, clientY: 20, ctrlKey: true });
      const event = createGridHeaderEvent(native, 3, coords);

      expect(event.colIndex).toBe(3);
      expect(event.nativeEvent).toBe(native);
      expect(event.contentX).toBe(150);
      expect(event.ctrlKey).toBe(true);
    });

    it("supports preventDefault", () => {
      const native = new MouseEvent("click");
      const event = createGridHeaderEvent(native, 0, coords);

      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("createGridKeyboardEvent", () => {
    it("creates event with key info and modifier keys", () => {
      const native = new KeyboardEvent("keydown", {
        key: "c",
        code: "KeyC",
        ctrlKey: true,
        shiftKey: false,
        metaKey: false,
        altKey: false,
      });
      const event = createGridKeyboardEvent(native);

      expect(event.nativeEvent).toBe(native);
      expect(event.key).toBe("c");
      expect(event.code).toBe("KeyC");
      expect(event.ctrlKey).toBe(true);
      expect(event.shiftKey).toBe(false);
    });

    it("supports preventDefault", () => {
      const native = new KeyboardEvent("keydown", { key: "Escape" });
      const event = createGridKeyboardEvent(native);

      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("createGridScrollEvent", () => {
    it("creates event with deltas and native WheelEvent", () => {
      const native = new WheelEvent("wheel", { deltaY: 100, deltaX: 0 });
      const event = createGridScrollEvent(100, 0, native);

      expect(event.deltaY).toBe(100);
      expect(event.deltaX).toBe(0);
      expect(event.nativeEvent).toBe(native);
    });

    it("accepts null nativeEvent for touch-scroll", () => {
      const event = createGridScrollEvent(50, -10, null);

      expect(event.deltaY).toBe(50);
      expect(event.deltaX).toBe(-10);
      expect(event.nativeEvent).toBeNull();
    });

    it("supports preventDefault", () => {
      const event = createGridScrollEvent(0, 0, null);

      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("createGridCanvasEvent", () => {
    it("creates event with type, hitTest, and coords", () => {
      const native = new MouseEvent("click", { clientX: 50, clientY: 60, metaKey: true });
      const hitTest = { type: "cell" as const, cell: { row: 1, col: 2 } };
      const event = createGridCanvasEvent("click", native, hitTest, coords);

      expect(event.type).toBe("click");
      expect(event.hitTest).toEqual(hitTest);
      expect(event.nativeEvent).toBe(native);
      expect(event.contentX).toBe(150);
      expect(event.viewportX).toBe(50);
      expect(event.metaKey).toBe(true);
    });

    it("creates event with empty hitTest", () => {
      const native = new MouseEvent("click");
      const hitTest = { type: "empty" as const };
      const event = createGridCanvasEvent("click", native, hitTest, coords);

      expect(event.hitTest.type).toBe("empty");
      expect(event.hitTest.cell).toBeUndefined();
      expect(event.hitTest.colIndex).toBeUndefined();
    });

    it("creates event with resize-handle hitTest", () => {
      const native = new MouseEvent("mousedown");
      const hitTest = { type: "resize-handle" as const, colIndex: 2 };
      const event = createGridCanvasEvent("mousedown", native, hitTest, coords);

      expect(event.hitTest.type).toBe("resize-handle");
      expect(event.hitTest.colIndex).toBe(2);
    });

    it("supports preventDefault", () => {
      const native = new MouseEvent("click");
      const event = createGridCanvasEvent("click", native, { type: "empty" }, coords);

      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("createGridTouchEvent", () => {
    // TouchEvent constructor is not available in happy-dom, use Event + defineProperty
    function makeTouchEvent(type: string, touchCount: number) {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, "touches", {
        value: Array.from({ length: touchCount }, () => ({ clientX: 0, clientY: 0 })),
      });
      return e as unknown as TouchEvent;
    }

    it("creates event with type, nativeEvent, touch point, and hitTest", () => {
      const native = makeTouchEvent("touchstart", 1);
      const touchPoint = { contentX: 200, contentY: 50, viewportX: 100, viewportY: 50 };
      const hitTest = { type: "cell" as const, cell: { row: 3, col: 1 } };
      const event = createGridTouchEvent("touchstart", native, touchPoint, hitTest, 1);

      expect(event.type).toBe("touchstart");
      expect(event.nativeEvent).toBe(native);
      expect(event.touch.contentX).toBe(200);
      expect(event.touch.contentY).toBe(50);
      expect(event.touch.viewportX).toBe(100);
      expect(event.touch.viewportY).toBe(50);
      expect(event.hitTest).toEqual(hitTest);
      expect(event.touchCount).toBe(1);
    });

    it("creates event with empty hitTest", () => {
      const native = makeTouchEvent("touchmove", 1);
      const touchPoint = { contentX: 0, contentY: 0, viewportX: 0, viewportY: 0 };
      const event = createGridTouchEvent("touchmove", native, touchPoint, { type: "empty" }, 1);

      expect(event.hitTest.type).toBe("empty");
    });

    it("creates touchend event with zero touchCount", () => {
      const native = makeTouchEvent("touchend", 0);
      const touchPoint = { contentX: 50, contentY: 50, viewportX: 50, viewportY: 50 };
      const event = createGridTouchEvent("touchend", native, touchPoint, { type: "cell", cell: { row: 0, col: 0 } }, 0);

      expect(event.type).toBe("touchend");
      expect(event.touchCount).toBe(0);
    });

    it("supports preventDefault", () => {
      const native = makeTouchEvent("touchstart", 1);
      const touchPoint = { contentX: 0, contentY: 0, viewportX: 0, viewportY: 0 };
      const event = createGridTouchEvent("touchstart", native, touchPoint, { type: "empty" }, 1);

      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
    });
  });
});
