import { describe, expect, it } from "bun:test";
import {
  createGridCellEvent,
  createGridHeaderEvent,
  createGridKeyboardEvent,
  createGridScrollEvent,
  createGridCanvasEvent,
  createGridContextMenuEvent,
  createGridTouchEvent,
} from "../event-helpers";

describe("createGridContextMenuEvent", () => {
  const coords = { contentX: 10, contentY: 20, viewportX: 10, viewportY: 20 };
  const hitTest = { type: "cell" as const, row: 1, col: 0 };

  it("creates event with hitTest and mouse props", () => {
    const native = new MouseEvent("contextmenu", { clientX: 100, clientY: 200 });
    const event = createGridContextMenuEvent(native, hitTest as any, coords);
    expect(event.hitTest).toBe(hitTest);
    expect(event.contentX).toBe(10);
    expect(event.defaultPrevented).toBe(false);
  });

  it("includes table when provided", () => {
    const native = new MouseEvent("contextmenu");
    const mockTable = { getState: () => ({}) } as any;
    const event = createGridContextMenuEvent(native, hitTest as any, coords, mockTable);
    expect((event as any).table).toBe(mockTable);
  });

  it("excludes table when not provided", () => {
    const native = new MouseEvent("contextmenu");
    const event = createGridContextMenuEvent(native, hitTest as any, coords);
    expect((event as any).table).toBeUndefined();
  });

  it("supports preventDefault", () => {
    const native = new MouseEvent("contextmenu");
    const event = createGridContextMenuEvent(native, hitTest as any, coords);
    event.preventDefault();
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("createGridTouchEvent", () => {
  it("creates touch event with all properties", () => {
    const native = new TouchEvent("touchstart");
    const touch = { contentX: 5, contentY: 10, viewportX: 5, viewportY: 10 };
    const hitTest = { type: "cell" as const, row: 0, col: 0 };
    const event = createGridTouchEvent("touchstart", native, touch as any, hitTest as any, 2);
    expect(event.type).toBe("touchstart");
    expect(event.touch).toBe(touch);
    expect(event.hitTest).toBe(hitTest);
    expect(event.touchCount).toBe(2);
  });
});
