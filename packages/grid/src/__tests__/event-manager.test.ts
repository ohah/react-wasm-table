import { describe, expect, it, mock } from "bun:test";
import { EventManager } from "../adapter/event-manager";
import type { CellLayout } from "../types";
import type { RegionLayout } from "../renderer/region";

function makeHeader(col: number, x: number, width: number): CellLayout {
  return { row: 0, col, x, y: 0, width, height: 40, contentAlign: "left" };
}

describe("EventManager — findResizeHandle", () => {
  it("returns col index when x is within 5px of header right edge", () => {
    const em = new EventManager();
    const headers = [makeHeader(0, 0, 100), makeHeader(1, 100, 150)];
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
    const headers = [makeHeader(0, 0, 100), makeHeader(1, 100, 200)];
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

describe("EventManager — region-aware coordinate conversion", () => {
  function createCanvas(width = 800): HTMLCanvasElement {
    const listeners: Record<string, ((e: any) => void)[]> = {};
    return {
      getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 600 }),
      addEventListener: (type: string, handler: (e: any) => void) => {
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

  // Build a RegionLayout with left=100, right=100, total=600, canvasW=500
  function makeRegionLayout(): RegionLayout {
    return {
      regions: [
        { name: "left", clipRect: [0, 0, 100, 400] as const, translateX: 0 },
        { name: "center", clipRect: [100, 0, 300, 400] as const, translateX: -50 },
        { name: "right", clipRect: [400, 0, 100, 400] as const, translateX: -100 },
      ],
      leftWidth: 100,
      rightWidth: 100,
      totalContentWidth: 600,
    };
  }

  it("left region: contentX = viewportX (no scroll offset)", () => {
    const em = new EventManager();
    // Row at content x=50 (in left pinned area)
    const rows: CellLayout[] = [
      { row: 0, col: 0, x: 50, y: 50, width: 40, height: 30, contentAlign: "left" },
    ];
    em.setLayouts([], rows);
    em.setScrollOffset(100); // scrollLeft=100 but should be ignored in left region
    em.setRegions(makeRegionLayout());

    const canvas = createCanvas(500);
    let clickedCoords: any = null;
    em.attach(canvas, {
      onCellClick: (_coord, _native, coords) => {
        clickedCoords = coords;
      },
    });

    // Click at viewport x=50 (in left region: < 100)
    canvas._fire("click", { clientX: 50, clientY: 50 });
    expect(clickedCoords).not.toBeNull();
    expect(clickedCoords.contentX).toBe(50); // NOT 50+100
    em.detach();
  });

  it("center region: contentX = viewportX + scrollLeft", () => {
    const em = new EventManager();
    // Row at content x=250 (in center area, with scroll offset)
    const rows: CellLayout[] = [
      { row: 0, col: 1, x: 250, y: 50, width: 40, height: 30, contentAlign: "left" },
    ];
    em.setLayouts([], rows);
    em.setScrollOffset(50);
    em.setRegions(makeRegionLayout());

    const canvas = createCanvas(500);
    let clickedCoords: any = null;
    em.attach(canvas, {
      onCellClick: (_coord, _native, coords) => {
        clickedCoords = coords;
      },
    });

    // Click at viewport x=200 (center region: 100 ≤ x < 400)
    canvas._fire("click", { clientX: 200, clientY: 50 });
    expect(clickedCoords).not.toBeNull();
    expect(clickedCoords.contentX).toBe(250); // 200 + 50
    em.detach();
  });

  it("right region: contentX = viewportX + totalContentWidth - canvasWidth", () => {
    const em = new EventManager();
    const rows: CellLayout[] = [
      { row: 0, col: 3, x: 550, y: 50, width: 40, height: 30, contentAlign: "left" },
    ];
    em.setLayouts([], rows);
    em.setScrollOffset(50);
    em.setRegions(makeRegionLayout());

    const canvas = createCanvas(500);
    let clickedCoords: any = null;
    em.attach(canvas, {
      onCellClick: (_coord, _native, coords) => {
        clickedCoords = coords;
      },
    });

    // Click at viewport x=450 (right region: >= 400)
    canvas._fire("click", { clientX: 450, clientY: 50 });
    expect(clickedCoords).not.toBeNull();
    // contentX = 450 + 600 - 500 = 550
    expect(clickedCoords.contentX).toBe(550);
    em.detach();
  });

  it("falls back to scrollLeft when no regions set", () => {
    const em = new EventManager();
    const rows: CellLayout[] = [
      { row: 0, col: 0, x: 150, y: 50, width: 40, height: 30, contentAlign: "left" },
    ];
    em.setLayouts([], rows);
    em.setScrollOffset(100);
    // NO setRegions call

    const canvas = createCanvas(500);
    let clickedCoords: any = null;
    em.attach(canvas, {
      onCellClick: (_coord, _native, coords) => {
        clickedCoords = coords;
      },
    });

    canvas._fire("click", { clientX: 50, clientY: 50 });
    expect(clickedCoords).not.toBeNull();
    expect(clickedCoords.contentX).toBe(150); // 50 + 100
    em.detach();
  });

  it("hitTestAtLastPos is region-aware", () => {
    const em = new EventManager();
    // Row in left pinned area
    const rows: CellLayout[] = [
      { row: 0, col: 0, x: 20, y: 50, width: 60, height: 30, contentAlign: "left" },
    ];
    em.setLayouts([], rows);
    em.setScrollOffset(200); // large scroll offset
    em.setRegions(makeRegionLayout());

    const canvas = createCanvas(500);
    const windowListeners: Record<string, ((e: any) => void)[]> = {};
    const origAddWin = window.addEventListener.bind(window);
    window.addEventListener = ((type: string, fn: any) => {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type]!.push(fn);
    }) as any;

    em.attach(canvas, {
      onCellMouseDown: () => {},
    });

    // mousedown to start tracking
    canvas._fire("mousedown", {
      clientX: 40,
      clientY: 60,
      shiftKey: false,
      preventDefault: () => {},
    });

    // mousemove in left region (viewportX=40)
    for (const fn of windowListeners["mousemove"] || []) {
      fn({ clientX: 40, clientY: 60, buttons: 1 });
    }

    // hitTestAtLastPos should find the cell at content x=40 (not x=240)
    const hit = em.hitTestAtLastPos(500);
    expect(hit).not.toBeNull();
    expect(hit!.col).toBe(0);

    em.detach();
    window.addEventListener = origAddWin;
  });
});
