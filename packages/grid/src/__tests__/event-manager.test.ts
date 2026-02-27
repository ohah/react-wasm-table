import { describe, expect, it, mock } from "bun:test";
import { EventManager } from "../adapter/event-manager";
import type { CellLayout } from "../types";

function makeHeader(col: number, x: number, width: number): CellLayout {
  return { row: 0, col, x, y: 0, width, height: 40, contentAlign: "left" };
}

describe("EventManager — findResizeHandle", () => {
  it("returns col index when x is within 5px of header right edge", () => {
    const em = new EventManager();
    const headers = [
      makeHeader(0, 0, 100),
      makeHeader(1, 100, 150),
    ];
    em.setLayouts(headers, []);

    // Right edge of col 0 is at x=100
    expect(em.findResizeHandle(98, 20)).toBe(0);
    expect(em.findResizeHandle(100, 20)).toBe(0);
    expect(em.findResizeHandle(103, 20)).toBe(0);
    expect(em.findResizeHandle(105, 20)).toBe(0);
  });

  it("returns -1 when x is outside resize handle zone", () => {
    const em = new EventManager();
    const headers = [makeHeader(0, 0, 100)];
    em.setLayouts(headers, []);

    // Far from right edge (x=100)
    expect(em.findResizeHandle(50, 20)).toBe(-1);
    expect(em.findResizeHandle(90, 20)).toBe(-1);
  });

  it("returns -1 when y is outside header area", () => {
    const em = new EventManager();
    const headers = [makeHeader(0, 0, 100)];
    em.setLayouts(headers, []);

    // Right at the edge x-wise but below header (height=40)
    expect(em.findResizeHandle(100, 50)).toBe(-1);
  });

  it("detects resize handle on second column", () => {
    const em = new EventManager();
    const headers = [
      makeHeader(0, 0, 100),
      makeHeader(1, 100, 200),
    ];
    em.setLayouts(headers, []);

    // Right edge of col 1 is at x=300
    expect(em.findResizeHandle(298, 20)).toBe(1);
    expect(em.findResizeHandle(302, 20)).toBe(1);
  });
});

describe("EventManager — resize drag sequence", () => {
  function createCanvas(): HTMLCanvasElement {
    // Minimal mock canvas for attach()
    const listeners: Record<string, ((e: any) => void)[]> = {};
    return {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      addEventListener: (type: string, handler: (e: any) => void, opts?: any) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type]!.push(handler);
      },
      removeEventListener: () => {},
      style: {} as CSSStyleDeclaration,
      _fire: (type: string, event: any) => {
        for (const h of listeners[type] || []) h(event);
      },
    } as any;
  }

  it("fires onResizeStart, onResizeMove, onResizeEnd on drag sequence", () => {
    const em = new EventManager();
    const headers = [makeHeader(0, 0, 100), makeHeader(1, 100, 150)];
    em.setLayouts(headers, []);

    const onResizeStart = mock(() => {});
    const onResizeMove = mock(() => {});
    const onResizeEnd = mock(() => {});

    const canvas = createCanvas();
    // We need to capture window listeners too
    const windowListeners: Record<string, ((e: any) => void)[]> = {};
    const origAddWin = window.addEventListener.bind(window);
    const origRemWin = window.removeEventListener.bind(window);
    const addedFns: Array<{ type: string; fn: (e: any) => void }> = [];
    window.addEventListener = ((type: string, fn: any, opts?: any) => {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type]!.push(fn);
      addedFns.push({ type, fn });
    }) as any;

    em.attach(canvas, {
      onResizeStart,
      onResizeMove,
      onResizeEnd,
    });

    // mousedown at right edge of col 0 (x=100)
    canvas._fire("mousedown", {
      clientX: 100,
      clientY: 20,
      shiftKey: false,
      preventDefault: () => {},
    });
    expect(onResizeStart).toHaveBeenCalledWith(0, 100, 100);

    // mousemove with deltaX = 30
    for (const fn of windowListeners["mousemove"] || []) {
      fn({ clientX: 130, clientY: 20, buttons: 1 });
    }
    expect(onResizeMove).toHaveBeenCalledWith(30);

    // mouseup
    for (const fn of windowListeners["mouseup"] || []) {
      fn({});
    }
    expect(onResizeEnd).toHaveBeenCalled();

    // Cleanup
    em.detach();
    window.addEventListener = origAddWin;
    window.removeEventListener = origRemWin;
  });
});
