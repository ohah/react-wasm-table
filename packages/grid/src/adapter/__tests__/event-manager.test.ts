import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { EventManager } from "../event-manager";
import type { EventCoords } from "../event-manager";
import type { CellCoord, CellLayout, HitTestResult } from "../../types";

function makeLayout(
  row: number,
  col: number,
  x: number,
  y: number,
  w: number,
  h: number,
): CellLayout {
  return { row, col, x, y, width: w, height: h, contentAlign: "left" };
}

/** Create a minimal canvas-like element with getBoundingClientRect and event dispatching. */
function createMockCanvas() {
  const el = document.createElement("canvas");
  el.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 400,
    bottom: 300,
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  return el;
}

/** Create a TouchEvent mock using Event + custom touches property. */
function createTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: touches.map((t) => ({ clientX: t.clientX, clientY: t.clientY })),
  });
  Object.defineProperty(event, "changedTouches", {
    value: touches.map((t) => ({ clientX: t.clientX, clientY: t.clientY })),
  });
  return event;
}

describe("EventManager", () => {
  let em: EventManager;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    em = new EventManager();
    canvas = createMockCanvas();
  });

  afterEach(() => {
    em.detach();
  });

  describe("scrollLeft hit-test correction", () => {
    it("adjusts x by scrollLeft for click hit-test", () => {
      const onClick = mock(() => {});
      // Cell at content-space x=500, which is off-screen at scrollLeft=0
      // but at viewport x=100 when scrollLeft=400
      const rowLayouts = [makeLayout(0, 0, 500, 50, 100, 36)];
      em.setLayouts([], rowLayouts);
      em.setScrollOffset(400);
      em.attach(canvas, { onCellClick: onClick });

      // Click at viewport x=100, which is content x=500 with scrollLeft=400
      canvas.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 50, bubbles: true }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect((onClick.mock.calls[0] as unknown as [CellCoord])[0]).toEqual({ row: 0, col: 0 });
    });

    it("misses cell without scrollLeft correction", () => {
      const onClick = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 500, 50, 100, 36)];
      em.setLayouts([], rowLayouts);
      em.setScrollOffset(0); // no scroll
      em.attach(canvas, { onCellClick: onClick });

      // Click at viewport x=100 — cell is at content x=500, no hit
      canvas.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 50, bubbles: true }));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("mousedown handler", () => {
    it("fires onCellMouseDown with coord and shiftKey", () => {
      const onMouseDown = mock(() => {});
      const rowLayouts = [makeLayout(2, 1, 100, 50, 100, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseDown: onMouseDown });

      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 150, clientY: 60, shiftKey: true, bubbles: true }),
      );
      expect(onMouseDown).toHaveBeenCalledTimes(1);
      expect((onMouseDown.mock.calls[0] as unknown as [CellCoord, boolean])[0]).toEqual({
        row: 2,
        col: 1,
      });
      expect((onMouseDown.mock.calls[0] as unknown as [CellCoord, boolean])[1]).toBe(true);
    });

    it("does not fire when click misses all cells", () => {
      const onMouseDown = mock(() => {});
      em.setLayouts([], []);
      em.attach(canvas, { onCellMouseDown: onMouseDown });

      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }),
      );
      expect(onMouseDown).not.toHaveBeenCalled();
    });
  });

  describe("mousemove handler", () => {
    it("fires onCellMouseMove when left button held", () => {
      const onMouseMove = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      // mousedown first to register drag origin
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 56, clientY: 10, buttons: 1, bubbles: true }),
      );
      expect(onMouseMove).toHaveBeenCalledTimes(1);
    });

    it("does not fire when no button held", () => {
      const onMouseMove = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 10, buttons: 0, bubbles: true }),
      );
      expect(onMouseMove).not.toHaveBeenCalled();
    });

    it("does not fire when drag started on another canvas", () => {
      const onMouseMove = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      // No mousedown on this canvas — simulate drag from elsewhere
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 10, buttons: 1, bubbles: true }),
      );
      expect(onMouseMove).not.toHaveBeenCalled();
    });

    it("fires onCellMouseMove with nearest cell when mouse outside data area", () => {
      const onMouseMove = mock(() => {});
      // Cell at y=40..76, mouse at y=200 (below cells)
      const rowLayouts = [makeLayout(3, 1, 0, 40, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      // mousedown first to register drag origin
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 200, buttons: 1, bubbles: true }),
      );
      expect(onMouseMove).toHaveBeenCalledTimes(1);
      expect((onMouseMove.mock.calls[0] as unknown as [CellCoord])[0]).toEqual({ row: 3, col: 1 });
    });
  });

  describe("mouse drag threshold", () => {
    it("does not fire onCellMouseMove until mouse moves beyond threshold", () => {
      const onMouseMove = mock(() => {});
      // Two cells side by side
      const rowLayouts = [makeLayout(0, 0, 0, 0, 100, 36), makeLayout(0, 1, 100, 0, 100, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      // mousedown on first cell
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );

      // tiny move (2px) — below MOUSE_DRAG_THRESHOLD (5px)
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 52, clientY: 10, buttons: 1, bubbles: true }),
      );
      expect(onMouseMove).not.toHaveBeenCalled();
    });

    it("fires onCellMouseMove once mouse moves beyond threshold", () => {
      const onMouseMove = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 100, 36), makeLayout(0, 1, 100, 0, 100, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      // mousedown at (50, 10)
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );

      // move 6px — beyond threshold
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 56, clientY: 10, buttons: 1, bubbles: true }),
      );
      expect(onMouseMove).toHaveBeenCalledTimes(1);
    });

    it("clears lastViewportPos on mousedown to prevent stale hit-test", () => {
      const rowLayouts = [makeLayout(0, 0, 0, 0, 100, 36), makeLayout(0, 1, 100, 0, 100, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {});

      // First click: mousemove stores lastViewportPos
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 60, clientY: 10, buttons: 1, bubbles: true }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      expect(em.hitTestAtLastPos()).not.toBeNull();

      // Second mousedown: should clear lastViewportPos
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 150, clientY: 10, bubbles: true }),
      );
      expect(em.hitTestAtLastPos()).toBeNull();
    });

    it("resets drag state on mouseup", () => {
      const onMouseMove = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      // First click-release cycle
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

      // Second click — small move should be blocked again
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 52, clientY: 10, buttons: 1, bubbles: true }),
      );
      expect(onMouseMove).not.toHaveBeenCalled();
    });
  });

  describe("mouseup handler", () => {
    it("fires onCellMouseUp on window mouseup after mousedown", () => {
      const onMouseUp = mock(() => {});
      em.attach(canvas, { onCellMouseUp: onMouseUp });

      // mousedown first to register this canvas as drag origin
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      expect(onMouseUp).toHaveBeenCalledTimes(1);
    });

    it("does not fire onCellMouseUp when drag started elsewhere", () => {
      const onMouseUp = mock(() => {});
      em.attach(canvas, { onCellMouseUp: onMouseUp });

      // No mousedown on this canvas
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      expect(onMouseUp).not.toHaveBeenCalled();
    });
  });

  describe("keydown handler", () => {
    it("fires onKeyDown on window keydown", () => {
      const onKeyDown = mock(() => {});
      em.attach(canvas, { onKeyDown: onKeyDown });

      const event = new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true });
      window.dispatchEvent(event);
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect((onKeyDown.mock.calls[0] as unknown as [KeyboardEvent])[0].key).toBe("c");
      expect((onKeyDown.mock.calls[0] as unknown as [KeyboardEvent])[0].ctrlKey).toBe(true);
    });
  });

  describe("contextmenu handler", () => {
    it("calls onContextMenu with native event, hitTest, and coords when right-click on cell", () => {
      const onContextMenu = mock(() => {});
      const rowLayouts = [makeLayout(1, 2, 100, 50, 80, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onContextMenu });

      const ev = new MouseEvent("contextmenu", {
        clientX: 120,
        clientY: 60,
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(ev);

      expect(onContextMenu).toHaveBeenCalledTimes(1);
      const [native, hitTest, coords] = (onContextMenu.mock.calls[0] as unknown) as [
        MouseEvent,
        HitTestResult,
        EventCoords,
      ];
      expect(native).toBe(ev);
      expect(hitTest).toEqual({ type: "cell", cell: { row: 1, col: 2 } });
      expect(coords).toMatchObject({ contentX: 120, contentY: 60, viewportX: 120, viewportY: 60 });
      expect(ev.defaultPrevented).toBe(true);
    });

    it("calls onContextMenu with header hitTest when right-click on header", () => {
      const onContextMenu = mock(() => {});
      const headerLayouts = [makeLayout(0, 1, 150, 0, 100, 40)];
      em.setLayouts(headerLayouts, []);
      em.attach(canvas, { onContextMenu });

      canvas.dispatchEvent(
        new MouseEvent("contextmenu", {
          clientX: 180,
          clientY: 20,
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(onContextMenu).toHaveBeenCalledTimes(1);
      const hitTest = (onContextMenu.mock.calls[0] as unknown as [MouseEvent, HitTestResult])[1];
      expect(hitTest).toEqual({ type: "header", colIndex: 1 });
    });

    it("calls onContextMenu with empty hitTest when right-click outside cells", () => {
      const onContextMenu = mock(() => {});
      em.setLayouts([], [makeLayout(0, 0, 50, 50, 100, 36)]);
      em.attach(canvas, { onContextMenu });

      canvas.dispatchEvent(
        new MouseEvent("contextmenu", {
          clientX: 10,
          clientY: 10,
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(onContextMenu).toHaveBeenCalledTimes(1);
      const hitTest = (onContextMenu.mock.calls[0] as unknown as [MouseEvent, HitTestResult])[1];
      expect(hitTest).toEqual({ type: "empty" });
    });

    it("does not preventDefault when onContextMenu is not provided", () => {
      em.setLayouts([], [makeLayout(0, 0, 0, 0, 100, 36)]);
      em.attach(canvas, {});

      const ev = new MouseEvent("contextmenu", {
        clientX: 50,
        clientY: 18,
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
    });
  });

  describe("hitTestAtLastPos", () => {
    it("returns null when no mouse position stored", () => {
      expect(em.hitTestAtLastPos()).toBeNull();
    });

    it("re-hit-tests at last mousemove position after layout update", () => {
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {});

      // mousedown + mousemove to store viewport position
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 56, clientY: 10, buttons: 1, bubbles: true }),
      );

      // Now update layouts (simulating auto-scroll re-layout) and re-hit-test
      const newLayouts = [makeLayout(5, 1, 0, 0, 200, 36)];
      em.setLayouts([], newLayouts);
      const hit = em.hitTestAtLastPos();
      expect(hit).toEqual({ row: 5, col: 1 });
    });

    it("applies scrollLeft offset for horizontal hit-test", () => {
      const rowLayouts = [makeLayout(0, 0, 500, 0, 100, 36)];
      em.setLayouts([], rowLayouts);
      em.setScrollOffset(0);
      em.attach(canvas, {});

      // mousedown + mousemove to store viewport position
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 56, clientY: 10, buttons: 1, bubbles: true }),
      );
      // Without scrollLeft, viewport x=56 clamps to the single cell via nearest
      expect(em.hitTestAtLastPos()).toEqual({ row: 0, col: 0 });

      // With scrollLeft=480, content x=56+480=536 which is exact hit
      em.setScrollOffset(480);
      const hit = em.hitTestAtLastPos();
      expect(hit).toEqual({ row: 0, col: 0 });
    });

    it("falls back to nearest cell when mouse is outside data area", () => {
      // Cell at y=40..76
      const rowLayouts = [makeLayout(2, 0, 0, 40, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {});

      // mousedown + mousemove (y=200 is below cell area)
      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 50, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 200, buttons: 1, bubbles: true }),
      );
      const hit = em.hitTestAtLastPos();
      expect(hit).toEqual({ row: 2, col: 0 });
    });
  });

  describe("detach", () => {
    it("removes all listeners after detach", () => {
      const onClick = mock(() => {});
      const onMouseUp = mock(() => {});
      const onKeyDown = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellClick: onClick, onCellMouseUp: onMouseUp, onKeyDown: onKeyDown });

      em.detach();

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 10, bubbles: true }));
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
      expect(onClick).not.toHaveBeenCalled();
      expect(onMouseUp).not.toHaveBeenCalled();
      expect(onKeyDown).not.toHaveBeenCalled();
    });
  });

  describe("touch events", () => {
    it("tap fires onCellClick and onHeaderClick", () => {
      const onCellClick = mock(() => {});
      const onHeaderClick = mock(() => {});
      const headerLayouts = [makeLayout(0, 0, 0, 0, 200, 40)];
      const rowLayouts = [makeLayout(1, 0, 0, 40, 200, 36)];
      em.setLayouts(headerLayouts, rowLayouts);
      em.attach(canvas, { onCellClick, onHeaderClick });

      // Tap on header
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", []));
      expect(onHeaderClick).toHaveBeenCalledTimes(1);
      expect((onHeaderClick.mock.calls[0] as unknown as [number])[0]).toBe(0);

      // Tap on data cell
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 50 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", []));
      expect(onCellClick).toHaveBeenCalledTimes(1);
      expect((onCellClick.mock.calls[0] as unknown as [CellCoord])[0]).toEqual({ row: 1, col: 0 });
    });

    it("tap fires onCellMouseDown and onCellMouseUp for selection", () => {
      const onCellMouseDown = mock(() => {});
      const onCellMouseUp = mock(() => {});
      const rowLayouts = [makeLayout(1, 0, 0, 40, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseDown, onCellMouseUp });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 50 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", []));

      expect(onCellMouseDown).toHaveBeenCalledTimes(1);
      expect((onCellMouseDown.mock.calls[0] as unknown as [CellCoord, boolean])[0]).toEqual({
        row: 1,
        col: 0,
      });
      expect((onCellMouseDown.mock.calls[0] as unknown as [CellCoord, boolean])[1]).toBe(false);
      expect(onCellMouseUp).toHaveBeenCalledTimes(1);
    });

    it("double-tap fires onCellDoubleClick", () => {
      const onCellDoubleClick = mock(() => {});
      const rowLayouts = [makeLayout(1, 0, 0, 40, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellDoubleClick });

      // First tap
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 50 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", []));

      // Second tap quickly
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 50 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", []));

      expect(onCellDoubleClick).toHaveBeenCalledTimes(1);
      expect((onCellDoubleClick.mock.calls[0] as unknown as [CellCoord])[0]).toEqual({
        row: 1,
        col: 0,
      });
    });

    it("drag fires onScroll with correct delta", () => {
      const onScroll = mock(() => {});
      em.setLayouts([], []);
      em.attach(canvas, { onScroll });

      // Start touch
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
      // Move enough to exceed TAP_THRESHOLD (10px)
      canvas.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 80 }]));
      // Continue scrolling
      canvas.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 60 }]));

      expect(onScroll).toHaveBeenCalled();
      // Finger moved up (y decreased) → onScroll receives positive deltaY (content scrolls down)
      const lastCall = onScroll.mock.calls[onScroll.mock.calls.length - 1] as unknown as [
        number,
        number,
      ];
      expect(lastCall[0]).toBeGreaterThan(0); // positive deltaY = scroll down
    });

    it("drag does not fire onCellClick (tap suppression)", () => {
      const onCellClick = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 400, 300)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellClick });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
      // Move far enough to be scroll, not tap
      canvas.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 50 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", []));

      expect(onCellClick).not.toHaveBeenCalled();
    });

    it("touchstart calls preventDefault", () => {
      em.attach(canvas, {});
      const event = createTouchEvent("touchstart", [{ clientX: 50, clientY: 50 }]);
      const preventSpy = mock(() => {});
      event.preventDefault = preventSpy;

      canvas.dispatchEvent(event);
      expect(preventSpy).toHaveBeenCalledTimes(1);
    });

    it("long-press enters selection drag mode", async () => {
      const onCellMouseDown = mock(() => {});
      const onCellMouseMove = mock(() => {});
      const onCellMouseUp = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36), makeLayout(1, 0, 0, 36, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseDown, onCellMouseMove, onCellMouseUp });

      // Start touch
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));

      // Wait for long-press timer (500ms + buffer)
      await new Promise((r) => setTimeout(r, 550));

      expect(onCellMouseDown).toHaveBeenCalledTimes(1);

      // Drag to another cell
      canvas.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 50, clientY: 50 }]));
      expect(onCellMouseMove).toHaveBeenCalled();

      // Release
      canvas.dispatchEvent(createTouchEvent("touchend", []));
      expect(onCellMouseUp).toHaveBeenCalledTimes(1);
    });

    it("detach removes touch listeners", () => {
      const onCellClick = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellClick });

      em.detach();

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", []));
      expect(onCellClick).not.toHaveBeenCalled();
    });

    it("multi-touch is ignored", () => {
      const onScroll = mock(() => {});
      const onCellClick = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 400, 300)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onScroll, onCellClick });

      // Two-finger touch
      canvas.dispatchEvent(
        createTouchEvent("touchstart", [
          { clientX: 50, clientY: 50 },
          { clientX: 100, clientY: 100 },
        ]),
      );
      canvas.dispatchEvent(createTouchEvent("touchend", []));

      expect(onScroll).not.toHaveBeenCalled();
      expect(onCellClick).not.toHaveBeenCalled();
    });
  });

  describe("native event passthrough", () => {
    it("passes native MouseEvent and EventCoords to onCellClick", () => {
      const onClick = mock((_coord: CellCoord, _native: MouseEvent, _coords: EventCoords) => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellClick: onClick });

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 10, bubbles: true }));
      expect(onClick).toHaveBeenCalledTimes(1);
      const [coord, native, coords] = onClick.mock.calls[0] as unknown as [
        CellCoord,
        MouseEvent,
        EventCoords,
      ];
      expect(coord).toEqual({ row: 0, col: 0 });
      expect(native).toBeInstanceOf(MouseEvent);
      expect(coords.viewportX).toBe(50);
      expect(coords.viewportY).toBe(10);
      expect(coords.contentX).toBe(50); // scrollLeft=0
      expect(coords.contentY).toBe(10);
    });

    it("passes native MouseEvent and EventCoords to onHeaderClick", () => {
      const onHeaderClick = mock((_col: number, _native: MouseEvent, _coords: EventCoords) => {});
      const headerLayouts = [makeLayout(0, 2, 0, 0, 200, 40)];
      em.setLayouts(headerLayouts, []);
      em.attach(canvas, { onHeaderClick });

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 10, bubbles: true }));
      expect(onHeaderClick).toHaveBeenCalledTimes(1);
      const [colIndex, native, coords] = onHeaderClick.mock.calls[0] as unknown as [
        number,
        MouseEvent,
        EventCoords,
      ];
      expect(colIndex).toBe(2);
      expect(native).toBeInstanceOf(MouseEvent);
      expect(coords.viewportX).toBe(50);
    });

    it("passes native MouseEvent and EventCoords to onCellMouseDown", () => {
      const onMouseDown = mock(
        (_coord: CellCoord, _shift: boolean, _native: MouseEvent, _coords: EventCoords) => {},
      );
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseDown: onMouseDown });

      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 100, clientY: 20, shiftKey: true, bubbles: true }),
      );
      expect(onMouseDown).toHaveBeenCalledTimes(1);
      const [coord, shift, native, coords] = onMouseDown.mock.calls[0] as unknown as [
        CellCoord,
        boolean,
        MouseEvent,
        EventCoords,
      ];
      expect(coord).toEqual({ row: 0, col: 0 });
      expect(shift).toBe(true);
      expect(native).toBeInstanceOf(MouseEvent);
      expect(coords.contentX).toBe(100);
    });

    it("passes native MouseEvent and EventCoords to onCellMouseMove", () => {
      const onMouseMove = mock(
        (_coord: CellCoord, _native: MouseEvent, _coords: EventCoords) => {},
      );
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 56, clientY: 10, buttons: 1, bubbles: true }),
      );
      expect(onMouseMove).toHaveBeenCalledTimes(1);
      const [coord, native, coords] = onMouseMove.mock.calls[0] as unknown as [
        CellCoord,
        MouseEvent,
        EventCoords,
      ];
      expect(coord).toEqual({ row: 0, col: 0 });
      expect(native).toBeInstanceOf(MouseEvent);
      expect(coords.viewportX).toBe(56);
    });

    it("passes native WheelEvent to onScroll", () => {
      const onScroll = mock((_dy: number, _dx: number, _native: WheelEvent | null) => {});
      em.attach(canvas, { onScroll });

      canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, deltaX: 0, bubbles: true }));
      expect(onScroll).toHaveBeenCalledTimes(1);
      const [dy, _dx, native] = onScroll.mock.calls[0] as unknown as [
        number,
        number,
        WheelEvent | null,
      ];
      expect(dy).toBe(100);
      expect(native).toBeInstanceOf(WheelEvent);
    });

    it("passes EventCoords with scrollLeft correction", () => {
      const onClick = mock((_coord: CellCoord, _native: MouseEvent, _coords: EventCoords) => {});
      const rowLayouts = [makeLayout(0, 0, 300, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.setScrollOffset(250);
      em.attach(canvas, { onCellClick: onClick });

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 10, bubbles: true }));
      expect(onClick).toHaveBeenCalledTimes(1);
      const [, , coords] = onClick.mock.calls[0] as unknown as [CellCoord, MouseEvent, EventCoords];
      expect(coords.viewportX).toBe(100);
      expect(coords.contentX).toBe(350); // viewportX + scrollLeft
    });
  });

  describe("onCanvasEvent", () => {
    it("fires onCanvasEvent before onCellClick with correct hitTest", () => {
      const order: string[] = [];
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {
        onCanvasEvent: (type, _native, hitTest, _coords) => {
          order.push(`canvas:${type}`);
          expect(hitTest.type).toBe("cell");
          expect(hitTest.cell).toEqual({ row: 0, col: 0 });
        },
        onCellClick: () => {
          order.push("cellClick");
        },
      });

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 10, bubbles: true }));
      expect(order).toEqual(["canvas:click", "cellClick"]);
    });

    it("fires onCanvasEvent with header hitTest for header clicks", () => {
      const headerLayouts = [makeLayout(0, 1, 0, 0, 200, 40)];
      em.setLayouts(headerLayouts, []);
      const onCanvasEvent = mock(
        (_type: string, _native: MouseEvent, _hitTest: HitTestResult, _coords: EventCoords) => {},
      );
      em.attach(canvas, { onCanvasEvent });

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 10, bubbles: true }));
      expect(onCanvasEvent).toHaveBeenCalledTimes(1);
      const [type, , hitTest] = onCanvasEvent.mock.calls[0] as unknown as [
        string,
        MouseEvent,
        HitTestResult,
        EventCoords,
      ];
      expect(type).toBe("click");
      expect(hitTest.type).toBe("header");
      expect(hitTest.colIndex).toBe(1);
    });

    it("fires onCanvasEvent with empty hitTest when missing all", () => {
      em.setLayouts([], []);
      const onCanvasEvent = mock(
        (_type: string, _native: MouseEvent, _hitTest: HitTestResult, _coords: EventCoords) => {},
      );
      em.attach(canvas, { onCanvasEvent });

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 10, bubbles: true }));
      expect(onCanvasEvent).toHaveBeenCalledTimes(1);
      const [, , hitTest] = onCanvasEvent.mock.calls[0] as unknown as [
        string,
        MouseEvent,
        HitTestResult,
        EventCoords,
      ];
      expect(hitTest.type).toBe("empty");
    });

    it("blocks semantic handler when onCanvasEvent returns false", () => {
      const onCellClick = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {
        onCanvasEvent: () => false,
        onCellClick,
      });

      canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 10, bubbles: true }));
      expect(onCellClick).not.toHaveBeenCalled();
    });

    it("fires for mousedown events", () => {
      const onCanvasEvent = mock(
        (_type: string, _native: MouseEvent, _hitTest: HitTestResult, _coords: EventCoords) => {},
      );
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCanvasEvent });

      canvas.dispatchEvent(
        new MouseEvent("mousedown", { clientX: 50, clientY: 10, bubbles: true }),
      );
      expect(onCanvasEvent).toHaveBeenCalledTimes(1);
      const [type] = onCanvasEvent.mock.calls[0] as unknown as [string];
      expect(type).toBe("mousedown");
    });

    it("fires for dblclick events", () => {
      const onCanvasEvent = mock(
        (_type: string, _native: MouseEvent, _hitTest: HitTestResult, _coords: EventCoords) => {},
      );
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCanvasEvent });

      canvas.dispatchEvent(new MouseEvent("dblclick", { clientX: 50, clientY: 10, bubbles: true }));
      expect(onCanvasEvent).toHaveBeenCalledTimes(1);
      const [type] = onCanvasEvent.mock.calls[0] as unknown as [string];
      expect(type).toBe("dblclick");
    });
  });

  describe("touch event passthrough", () => {
    it("fires onTouchStart with native event, coords, and hitTest", () => {
      const onTouchStart = mock(
        (_native: TouchEvent, _coords: EventCoords, _hitTest: HitTestResult) => {},
      );
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onTouchStart });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      expect(onTouchStart).toHaveBeenCalledTimes(1);

      const [native, coords, hitTest] = onTouchStart.mock.calls[0] as unknown as [
        TouchEvent,
        EventCoords,
        HitTestResult,
      ];
      expect(native).toBeDefined();
      expect(coords.viewportX).toBe(50);
      expect(coords.viewportY).toBe(10);
      expect(coords.contentX).toBe(50);
      expect(hitTest.type).toBe("cell");
      expect(hitTest.cell).toEqual({ row: 0, col: 0 });
    });

    it("fires onTouchMove with coords and hitTest", () => {
      const onTouchMove = mock(
        (_native: TouchEvent, _coords: EventCoords, _hitTest: HitTestResult) => {},
      );
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onTouchMove });

      // Start touch first
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      canvas.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 60, clientY: 15 }]));

      expect(onTouchMove).toHaveBeenCalledTimes(1);
      const [, coords, hitTest] = onTouchMove.mock.calls[0] as unknown as [
        TouchEvent,
        EventCoords,
        HitTestResult,
      ];
      expect(coords.viewportX).toBe(60);
      expect(coords.viewportY).toBe(15);
      expect(hitTest.type).toBe("cell");
    });

    it("fires onTouchEnd with coords and hitTest", () => {
      const onTouchEnd = mock(
        (_native: TouchEvent, _coords: EventCoords, _hitTest: HitTestResult) => {},
      );
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onTouchEnd });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", [{ clientX: 50, clientY: 10 }]));

      expect(onTouchEnd).toHaveBeenCalledTimes(1);
      const [, coords, hitTest] = onTouchEnd.mock.calls[0] as unknown as [
        TouchEvent,
        EventCoords,
        HitTestResult,
      ];
      expect(coords.viewportX).toBe(50);
      expect(coords.viewportY).toBe(10);
      expect(hitTest.type).toBe("cell");
    });

    it("onTouchStart returning false cancels internal handling", () => {
      const onCellClick = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {
        onTouchStart: () => false,
        onCellClick,
      });

      // Tap (touchstart + immediate touchend) normally triggers onCellClick
      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", [{ clientX: 50, clientY: 10 }]));

      // Blocked by onTouchStart returning false — touchState never set, so no tap detection
      expect(onCellClick).not.toHaveBeenCalled();
    });

    it("onTouchEnd returning false cancels tap detection", () => {
      const onCellClick = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {
        onTouchEnd: () => false,
        onCellClick,
      });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      canvas.dispatchEvent(createTouchEvent("touchend", [{ clientX: 50, clientY: 10 }]));

      expect(onCellClick).not.toHaveBeenCalled();
    });

    it("onTouchMove returning false cancels internal scroll", () => {
      const onScroll = mock(() => {});
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {
        onTouchMove: () => false,
        onScroll,
      });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      // Move enough to trigger scrolling
      canvas.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 50, clientY: 60 }]));

      expect(onScroll).not.toHaveBeenCalled();
    });

    it("hitTest returns empty when touch is outside cells", () => {
      const onTouchStart = mock(
        (_native: TouchEvent, _coords: EventCoords, _hitTest: HitTestResult) => {},
      );
      em.setLayouts([], []);
      em.attach(canvas, { onTouchStart });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      expect(onTouchStart).toHaveBeenCalledTimes(1);
      const [, , hitTest] = onTouchStart.mock.calls[0] as unknown as [
        TouchEvent,
        EventCoords,
        HitTestResult,
      ];
      expect(hitTest.type).toBe("empty");
    });

    it("hitTest returns header when touch is on header", () => {
      const onTouchStart = mock(
        (_native: TouchEvent, _coords: EventCoords, _hitTest: HitTestResult) => {},
      );
      const headerLayouts = [makeLayout(0, 0, 0, 0, 200, 40)];
      em.setLayouts(headerLayouts, []);
      em.attach(canvas, { onTouchStart });

      canvas.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 50, clientY: 10 }]));
      const [, , hitTest] = onTouchStart.mock.calls[0] as unknown as [
        TouchEvent,
        EventCoords,
        HitTestResult,
      ];
      expect(hitTest.type).toBe("header");
      expect(hitTest.colIndex).toBe(0);
    });
  });
});
