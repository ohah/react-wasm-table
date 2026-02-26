import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { EventManager } from "../event-manager";
import type { CellCoord, CellLayout } from "../../types";

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

      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 10, buttons: 1, bubbles: true }),
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

    it("fires onCellMouseMove with nearest cell when mouse outside data area", () => {
      const onMouseMove = mock(() => {});
      // Cell at y=40..76, mouse at y=200 (below cells)
      const rowLayouts = [makeLayout(3, 1, 0, 40, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, { onCellMouseMove: onMouseMove });

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
    it("fires onCellMouseUp on window mouseup", () => {
      const onMouseUp = mock(() => {});
      em.attach(canvas, { onCellMouseUp: onMouseUp });

      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      expect(onMouseUp).toHaveBeenCalledTimes(1);
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

  describe("hitTestAtLastPos", () => {
    it("returns null when no mouse position stored", () => {
      expect(em.hitTestAtLastPos()).toBeNull();
    });

    it("re-hit-tests at last mousemove position after layout update", () => {
      const rowLayouts = [makeLayout(0, 0, 0, 0, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {});

      // Trigger mousemove on window to store viewport position
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 10, buttons: 1, bubbles: true }),
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

      // Mouse at viewport x=50, cell at content x=500. nearest-cell clamps so it hits.
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 50, clientY: 10, buttons: 1, bubbles: true }),
      );
      // Without scrollLeft, viewport x=50 clamps to the single cell
      expect(em.hitTestAtLastPos()).toEqual({ row: 0, col: 0 });

      // With scrollLeft=480, content x=50+480=530 which is exact hit
      em.setScrollOffset(480);
      const hit = em.hitTestAtLastPos();
      expect(hit).toEqual({ row: 0, col: 0 });
    });

    it("falls back to nearest cell when mouse is outside data area", () => {
      // Cell at y=40..76
      const rowLayouts = [makeLayout(2, 0, 0, 40, 200, 36)];
      em.setLayouts([], rowLayouts);
      em.attach(canvas, {});

      // Mouse at y=200 (below cell area)
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
});
