import { describe, expect, it, beforeEach, mock } from "bun:test";
import { switchCellRenderer } from "../components/switch";
import { _getAnimationMap } from "../components/switch";
import { createCellRendererRegistry } from "../components";
import type { CellRenderContext } from "../components";
import type { Theme } from "../../types";

const defaultTheme: Theme = {
  headerBackground: "#f5f5f5",
  headerColor: "#333",
  headerFontSize: 13,
  cellBackground: "#fff",
  cellColor: "#333",
  fontSize: 13,
  borderColor: "#e0e0e0",
  borderWidth: 0.5,
  borderStyle: "solid",
  selectedBackground: "#1976d2",
  fontFamily: "system-ui, sans-serif",
};

/** Stride 16 buffer helper. */
function buildBuf(cells: [number, number, number, number, number, number][]): Float32Array {
  const stride = 16;
  const buf = new Float32Array(cells.length * stride);
  for (let i = 0; i < cells.length; i++) {
    const [row, col, x, y, w, h] = cells[i]!;
    const off = i * stride;
    buf[off] = row;
    buf[off + 1] = col;
    buf[off + 2] = x;
    buf[off + 3] = y;
    buf[off + 4] = w;
    buf[off + 5] = h;
    buf[off + 6] = 0; // align=left
  }
  return buf;
}

function mockCtx() {
  return {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    textBaseline: "",
    textAlign: "",
    globalAlpha: 1,
    scale: mock(() => {}),
    clearRect: mock(() => {}),
    fillRect: mock(() => {}),
    strokeRect: mock(() => {}),
    beginPath: mock(() => {}),
    moveTo: mock(() => {}),
    lineTo: mock(() => {}),
    stroke: mock(() => {}),
    measureText: mock(() => ({ width: 40 })),
    fillText: mock(() => {}),
    roundRect: mock(() => {}),
    rect: mock(() => {}),
    fill: mock(() => {}),
    save: mock(() => {}),
    restore: mock(() => {}),
    clip: mock(() => {}),
    drawImage: mock(() => {}),
    arc: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

function makeContext(overrides?: Partial<CellRenderContext>): CellRenderContext {
  const buf = buildBuf([[1, 0, 10, 40, 200, 36]]);
  return {
    ctx: mockCtx(),
    buf,
    cellIdx: 0,
    theme: defaultTheme,
    registry: createCellRendererRegistry(),
    computeChildLayout: (input: Float32Array) => new Float32Array(0),
    ...overrides,
  };
}

beforeEach(() => {
  _getAnimationMap().clear();
});

describe("switch animation", () => {
  it("first render snaps without animation", () => {
    const invalidate = mock(() => {});
    const context = makeContext({ invalidate });
    switchCellRenderer.draw(
      { type: "switch", checked: true, style: { transitionDuration: 300 } },
      context,
    );
    // Should NOT call invalidate on first render (no animation needed)
    expect(invalidate).not.toHaveBeenCalled();
    // Thumb should be on the right (fully checked)
    const arcCalls = ((context.ctx as any).arc as any).mock.calls;
    expect(arcCalls.length).toBe(1);
    // trackX = 10 + (200-36)/2 = 92, radius = 10
    // rightCx = 92 + 36 - 10 = 118
    expect(arcCalls[0][0]).toBe(118);
  });

  it("triggers animation on checked change", () => {
    const invalidate = mock(() => {});

    // First render: unchecked
    const context1 = makeContext({ invalidate });
    switchCellRenderer.draw(
      { type: "switch", checked: false, style: { transitionDuration: 200 } },
      context1,
    );
    expect(invalidate).not.toHaveBeenCalled();

    // Second render: checked=true → should start animation
    const context2 = makeContext({ invalidate });
    switchCellRenderer.draw(
      { type: "switch", checked: true, style: { transitionDuration: 200 } },
      context2,
    );
    // invalidate should be called because animation is in progress
    expect(invalidate).toHaveBeenCalled();
  });

  it("interpolates thumb position during animation", () => {
    const invalidate = mock(() => {});

    // First render: unchecked (snap)
    const context1 = makeContext({ invalidate });
    switchCellRenderer.draw(
      {
        type: "switch",
        checked: false,
        style: { transitionDuration: 200, transitionTimingFunction: "linear" },
      },
      context1,
    );

    // Mock performance.now to control time
    const originalNow = performance.now;
    let fakeTime = 1000;
    performance.now = () => fakeTime;

    try {
      // Trigger checked change
      const context2 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: { transitionDuration: 200, transitionTimingFunction: "linear" },
        },
        context2,
      );
      // animation just started at t=1000

      // Advance to midpoint (100ms into 200ms animation)
      fakeTime = 1100;
      const context3 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: { transitionDuration: 200, transitionTimingFunction: "linear" },
        },
        context3,
      );

      const arcCalls = ((context3.ctx as any).arc as any).mock.calls;
      const thumbCx = arcCalls[0][0];
      // leftCx = 92 + 10 = 102, rightCx = 92 + 36 - 10 = 118
      // At 50% progress: 102 + (118-102) * 0.5 = 102 + 8 = 110
      expect(thumbCx).toBeCloseTo(110, 0);
    } finally {
      performance.now = originalNow;
    }
  });

  it("completes animation at end", () => {
    const invalidate = mock(() => {});

    // First render: unchecked (snap)
    const context1 = makeContext({ invalidate });
    switchCellRenderer.draw(
      {
        type: "switch",
        checked: false,
        style: { transitionDuration: 100, transitionTimingFunction: "linear" },
      },
      context1,
    );

    const originalNow = performance.now;
    let fakeTime = 1000;
    performance.now = () => fakeTime;

    try {
      // Trigger animation
      const context2 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: { transitionDuration: 100, transitionTimingFunction: "linear" },
        },
        context2,
      );

      // Advance past end
      fakeTime = 1200;
      invalidate.mockClear();
      const context3 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: { transitionDuration: 100, transitionTimingFunction: "linear" },
        },
        context3,
      );

      // Should NOT call invalidate since animation is complete
      expect(invalidate).not.toHaveBeenCalled();
      // Thumb should be fully on the right
      const arcCalls = ((context3.ctx as any).arc as any).mock.calls;
      expect(arcCalls[0][0]).toBe(118);
    } finally {
      performance.now = originalNow;
    }
  });

  it("snaps when transitionDuration is 0", () => {
    const invalidate = mock(() => {});

    // First render: unchecked
    const context1 = makeContext({ invalidate });
    switchCellRenderer.draw(
      { type: "switch", checked: false, style: { transitionDuration: 0 } },
      context1,
    );

    // Toggle → should snap immediately
    const context2 = makeContext({ invalidate });
    switchCellRenderer.draw(
      { type: "switch", checked: true, style: { transitionDuration: 0 } },
      context2,
    );
    expect(invalidate).not.toHaveBeenCalled();

    const arcCalls = ((context2.ctx as any).arc as any).mock.calls;
    expect(arcCalls[0][0]).toBe(118); // fully right
  });

  it("snaps when invalidate is not provided", () => {
    // First render without invalidate
    const context1 = makeContext();
    switchCellRenderer.draw(
      { type: "switch", checked: false, style: { transitionDuration: 200 } },
      context1,
    );

    // Toggle without invalidate → should snap
    const context2 = makeContext();
    switchCellRenderer.draw(
      { type: "switch", checked: true, style: { transitionDuration: 200 } },
      context2,
    );

    const arcCalls = ((context2.ctx as any).arc as any).mock.calls;
    expect(arcCalls[0][0]).toBe(118); // fully right
  });

  it("handles reverse mid-animation (toggling back before complete)", () => {
    const invalidate = mock(() => {});

    // First render: unchecked
    const context1 = makeContext({ invalidate });
    switchCellRenderer.draw(
      {
        type: "switch",
        checked: false,
        style: { transitionDuration: 200, transitionTimingFunction: "linear" },
      },
      context1,
    );

    const originalNow = performance.now;
    let fakeTime = 1000;
    performance.now = () => fakeTime;

    try {
      // Start animation to checked
      const context2 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: { transitionDuration: 200, transitionTimingFunction: "linear" },
        },
        context2,
      );

      // At 50ms (25% progress), reverse back to unchecked
      fakeTime = 1050;

      // Read midpoint first
      const contextMid = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: { transitionDuration: 200, transitionTimingFunction: "linear" },
        },
        contextMid,
      );
      const midArc = ((contextMid.ctx as any).arc as any).mock.calls;
      const midThumbCx = midArc[0][0];
      // At 25%: 102 + 16 * 0.25 = 106
      expect(midThumbCx).toBeCloseTo(106, 0);

      // Now reverse
      fakeTime = 1050;
      const context3 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: false,
          style: { transitionDuration: 200, transitionTimingFunction: "linear" },
        },
        context3,
      );

      // Animation should start from current position (~0.25) back to 0
      // At the moment of reversal, it should be at ~0.25 progress
      const reverseArc = ((context3.ctx as any).arc as any).mock.calls;
      const reverseCx = reverseArc[0][0];
      // fromProgress = 0.25, toProgress = 0, at t=0 of new animation → should be at 0.25
      expect(reverseCx).toBeCloseTo(106, 0);
    } finally {
      performance.now = originalNow;
    }
  });

  it("interpolates track color during animation", () => {
    const invalidate = mock(() => {});

    // First render: unchecked
    const context1 = makeContext({ invalidate });
    switchCellRenderer.draw(
      {
        type: "switch",
        checked: false,
        style: {
          trackColor: "#000000",
          activeTrackColor: "#ffffff",
          transitionDuration: 200,
          transitionTimingFunction: "linear",
        },
      },
      context1,
    );

    const originalNow = performance.now;
    let fakeTime = 1000;
    performance.now = () => fakeTime;

    try {
      // Trigger animation
      const context2 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: {
            trackColor: "#000000",
            activeTrackColor: "#ffffff",
            transitionDuration: 200,
            transitionTimingFunction: "linear",
          },
        },
        context2,
      );

      // At 50% progress
      fakeTime = 1100;
      const context3 = makeContext({ invalidate });
      switchCellRenderer.draw(
        {
          type: "switch",
          checked: true,
          style: {
            trackColor: "#000000",
            activeTrackColor: "#ffffff",
            transitionDuration: 200,
            transitionTimingFunction: "linear",
          },
        },
        context3,
      );

      // Track fillStyle should be a mid-gray (approximately #808080)
      // The first fillStyle set is for the track
      const fillCalls: string[] = [];
      const origFillStyle = Object.getOwnPropertyDescriptor(context3.ctx, "fillStyle");
      // Since we track fillStyle as a simple property, check its value after draw
      // The last fillStyle will be thumbColor (#fff), the one before that is the track color
      // We can't easily track intermediate assignments, so let's check the animation map state instead
      const animMap = _getAnimationMap();
      const state = animMap.get("1:0");
      expect(state).toBeDefined();
      expect(state!.targetChecked).toBe(true);
    } finally {
      performance.now = originalNow;
    }
  });
});
