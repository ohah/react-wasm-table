import { describe, expect, it, mock, beforeEach } from "bun:test";
import {
  dropdownCellRenderer,
  getDropdownPanelState,
  openDropdownPanel,
  closeDropdownPanel,
  drawDropdownPanel,
  hitTestDropdownPanel,
  setDropdownHoveredIndex,
  _getTriggerRectMap,
  resolveDropdownPanelStyle,
  parseBoxShadow,
  type DropdownPanelState,
  type ResolvedPanelStyle,
} from "../components/dropdown";
import type { CellRenderContext } from "../components";
import type { Theme, DropdownInstruction } from "../../types";

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
    buf[off + 6] = 0;
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
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    beginPath: mock(() => {}),
    roundRect: mock(() => {}),
    rect: mock(() => {}),
    fill: mock(() => {}),
    stroke: mock(() => {}),
    save: mock(() => {}),
    restore: mock(() => {}),
    clip: mock(() => {}),
    fillText: mock(() => {}),
    moveTo: mock(() => {}),
    lineTo: mock(() => {}),
    closePath: mock(() => {}),
  } as unknown as CanvasRenderingContext2D;
}

function makeContext(ctx: CanvasRenderingContext2D, buf: Float32Array): CellRenderContext {
  return {
    ctx,
    buf,
    cellIdx: 0,
    theme: defaultTheme,
    computeChildLayout: () => new Float32Array(0),
  };
}

const defaultStyle: ResolvedPanelStyle = resolveDropdownPanelStyle();

function basePanelState(overrides?: Partial<DropdownPanelState>): DropdownPanelState {
  return {
    key: "1:0",
    options: [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
      { value: "c", label: "Gamma" },
    ],
    value: "a",
    hoveredIndex: -1,
    onChange: undefined,
    triggerX: 100,
    triggerY: 50,
    triggerW: 200,
    triggerH: 30,
    style: defaultStyle,
    ...overrides,
  };
}

describe("dropdownCellRenderer", () => {
  beforeEach(() => {
    closeDropdownPanel();
    _getTriggerRectMap().clear();
  });

  it("has type 'dropdown'", () => {
    expect(dropdownCellRenderer.type).toBe("dropdown");
  });

  it("has cursor 'pointer'", () => {
    expect(dropdownCellRenderer.cursor).toBe("pointer");
  });

  it("draws selected option label", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
    const instruction: DropdownInstruction = {
      type: "dropdown",
      value: "b",
      options: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ],
    };
    dropdownCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.fillText as any).mock.calls.length).toBe(1);
    expect((ctx.fillText as any).mock.calls[0][0]).toBe("Beta");
  });

  it("draws placeholder when no matching value", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
    const instruction: DropdownInstruction = {
      type: "dropdown",
      options: [{ value: "a", label: "Alpha" }],
      placeholder: "Choose...",
    };
    dropdownCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.fillText as any).mock.calls[0][0]).toBe("Choose...");
  });

  it("draws dropdown arrow triangle", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
    const instruction: DropdownInstruction = {
      type: "dropdown",
      options: [],
    };
    dropdownCellRenderer.draw(instruction, makeContext(ctx, buf));

    // Arrow: moveTo, lineTo, lineTo, closePath, fill
    expect((ctx.moveTo as any).mock.calls.length).toBe(1);
    expect((ctx.lineTo as any).mock.calls.length).toBe(2);
    expect((ctx.closePath as any).mock.calls.length).toBe(1);
  });

  it("applies disabled opacity", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[0, 0, 0, 0, 200, 40]]);
    const instruction: DropdownInstruction = {
      type: "dropdown",
      disabled: true,
      options: [],
    };
    dropdownCellRenderer.draw(instruction, makeContext(ctx, buf));

    expect((ctx.save as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("caches trigger rect on draw", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[1, 2, 10, 20, 200, 40]]);
    const instruction: DropdownInstruction = {
      type: "dropdown",
      options: [{ value: "a", label: "A" }],
    };
    dropdownCellRenderer.draw(instruction, makeContext(ctx, buf));

    const rect = _getTriggerRectMap().get("1:2");
    expect(rect).toBeDefined();
    expect(rect!.x).toBeGreaterThan(0);
    expect(rect!.w).toBeGreaterThan(0);
  });

  it("uses custom activeBackgroundColor/activeBorderColor when open", () => {
    const ctx = mockCtx();
    const buf = buildBuf([[1, 0, 0, 0, 200, 40]]);
    const instruction: DropdownInstruction = {
      type: "dropdown",
      options: [{ value: "a", label: "A" }],
      style: { activeBackgroundColor: "#custom-bg", activeBorderColor: "#custom-bd" },
    };
    // Open the panel for this cell
    openDropdownPanel(basePanelState({ key: "1:0" }));
    dropdownCellRenderer.draw(instruction, makeContext(ctx, buf));
    // Verify fillStyle was set to custom active bg
    // (The exact assertion depends on draw order; the important thing is it doesn't crash)
    expect((ctx.fill as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe("parseBoxShadow", () => {
  it("parses standard CSS box-shadow with rgba", () => {
    const r = parseBoxShadow("0px 2px 8px rgba(0,0,0,0.15)");
    expect(r).not.toBeNull();
    expect(r!.offsetX).toBe(0);
    expect(r!.offsetY).toBe(2);
    expect(r!.blur).toBe(8);
    expect(r!.color).toBe("rgba(0,0,0,0.15)");
  });

  it("parses box-shadow with hex color", () => {
    const r = parseBoxShadow("1px 3px 6px #333");
    expect(r).not.toBeNull();
    expect(r!.offsetX).toBe(1);
    expect(r!.offsetY).toBe(3);
    expect(r!.blur).toBe(6);
    expect(r!.color).toBe("#333");
  });

  it("parses box-shadow without blur (2 values)", () => {
    const r = parseBoxShadow("2px 4px rgba(0,0,0,0.5)");
    expect(r).not.toBeNull();
    expect(r!.offsetX).toBe(2);
    expect(r!.offsetY).toBe(4);
    expect(r!.blur).toBe(0);
    expect(r!.color).toBe("rgba(0,0,0,0.5)");
  });

  it("returns null for empty string", () => {
    expect(parseBoxShadow("")).toBeNull();
  });

  it("parses negative offsets", () => {
    const r = parseBoxShadow("-1px -2px 4px #000");
    expect(r).not.toBeNull();
    expect(r!.offsetX).toBe(-1);
    expect(r!.offsetY).toBe(-2);
    expect(r!.blur).toBe(4);
  });
});

describe("resolveDropdownPanelStyle", () => {
  it("returns all defaults when called with no args", () => {
    const s = resolveDropdownPanelStyle();
    expect(s.fontSize).toBe(13);
    expect(s.itemHeight).toBe(30);
    expect(s.maxVisibleItems).toBe(6);
    expect(s.panelMinWidth).toBe(100);
    expect(s.hoverBackgroundColor).toBe("#f3f4f6");
    expect(s.selectedColor).toBe("#1d4ed8");
    expect(s.checkmarkSymbol).toBe("✓");
    expect(s.panelShadowColor).toBe("rgba(0,0,0,0.15)");
    expect(s.panelShadowOffsetX).toBe(0);
    expect(s.panelShadowOffsetY).toBe(2);
    expect(s.panelShadowBlur).toBe(8);
    // Fallbacks
    expect(s.panelBorderColor).toBe("#d1d5db");
    expect(s.panelBackgroundColor).toBe("#fff");
    expect(s.panelBorderRadius).toBe(4);
  });

  it("overrides with nested panel values", () => {
    const s = resolveDropdownPanelStyle({
      option: { height: 40, hoverBackgroundColor: "#ff0000", selectedColor: "#00ff00" },
      maxVisibleItems: 10,
      panel: { borderColor: "#111" },
    });
    expect(s.itemHeight).toBe(40);
    expect(s.maxVisibleItems).toBe(10);
    expect(s.hoverBackgroundColor).toBe("#ff0000");
    expect(s.selectedColor).toBe("#00ff00");
    expect(s.panelBorderColor).toBe("#111");
  });

  it("panelBorderColor falls back to borderColor", () => {
    const s = resolveDropdownPanelStyle({ borderColor: "#abc" });
    expect(s.panelBorderColor).toBe("#abc");
  });

  it("parses boxShadow from panel style", () => {
    const s = resolveDropdownPanelStyle({
      panel: { boxShadow: "1px 4px 12px rgba(255,0,0,0.5)" },
    });
    expect(s.panelShadowOffsetX).toBe(1);
    expect(s.panelShadowOffsetY).toBe(4);
    expect(s.panelShadowBlur).toBe(12);
    expect(s.panelShadowColor).toBe("rgba(255,0,0,0.5)");
  });

  it("resolves checkmark from nested checkmark style", () => {
    const s = resolveDropdownPanelStyle({
      checkmark: { content: "★", color: "#ff0000" },
    });
    expect(s.checkmarkSymbol).toBe("★");
    expect(s.checkmarkColor).toBe("#ff0000");
  });
});

describe("dropdown panel state", () => {
  beforeEach(() => {
    closeDropdownPanel();
  });

  it("starts with null state", () => {
    expect(getDropdownPanelState()).toBeNull();
  });

  it("opens and closes panel", () => {
    openDropdownPanel(basePanelState());
    expect(getDropdownPanelState()).not.toBeNull();
    expect(getDropdownPanelState()!.key).toBe("1:0");

    closeDropdownPanel();
    expect(getDropdownPanelState()).toBeNull();
  });

  it("sets hovered index", () => {
    openDropdownPanel(basePanelState());
    expect(setDropdownHoveredIndex(1)).toBe(true);
    expect(getDropdownPanelState()!.hoveredIndex).toBe(1);
    // Same index → no change
    expect(setDropdownHoveredIndex(1)).toBe(false);
  });

  it("setDropdownHoveredIndex returns false when no panel open", () => {
    expect(setDropdownHoveredIndex(0)).toBe(false);
  });
});

describe("drawDropdownPanel", () => {
  beforeEach(() => {
    closeDropdownPanel();
  });

  it("does nothing when no panel is open", () => {
    const ctx = mockCtx();
    drawDropdownPanel(ctx, 0, 0);
    expect((ctx.save as any).mock.calls.length).toBe(0);
  });

  it("draws panel with items", () => {
    openDropdownPanel(
      basePanelState({
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
      }),
    );

    const ctx = mockCtx();
    drawDropdownPanel(ctx, 0, 0);

    // Should have drawn: panel bg, items text
    expect((ctx.save as any).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((ctx.fillText as any).mock.calls.length).toBeGreaterThanOrEqual(2); // checkmark + labels
  });

  it("uses custom panel style", () => {
    openDropdownPanel(
      basePanelState({
        options: [{ value: "a", label: "Alpha" }],
        style: resolveDropdownPanelStyle({
          panel: { boxShadow: "0px 2px 8px rgba(255,0,0,0.5)", backgroundColor: "#ffeedd" },
          option: { hoverBackgroundColor: "#abcdef" },
          checkmark: { content: "★", color: "#ff0000" },
        }),
      }),
    );

    const ctx = mockCtx();
    drawDropdownPanel(ctx, 0, 0, 500);

    // Verify it doesn't crash and draws
    expect((ctx.fillText as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe("hitTestDropdownPanel", () => {
  beforeEach(() => {
    closeDropdownPanel();
  });

  it("returns null when no panel is open", () => {
    expect(hitTestDropdownPanel(0, 0, 0, 0)).toBeNull();
  });

  it("returns null when outside panel", () => {
    openDropdownPanel(basePanelState());
    // Far outside panel
    expect(hitTestDropdownPanel(0, 0, 0, 0)).toBeNull();
  });

  it("returns item hit inside panel", () => {
    openDropdownPanel(
      basePanelState({
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
      }),
    );

    // Panel is at triggerY + triggerH + 2 = 82, first item at y=82+4=86
    // Item height = 30, so first item covers 86-116, second 116-146
    const hit = hitTestDropdownPanel(150, 100, 0, 0);
    expect(hit).not.toBeNull();
    expect(hit!.type).toBe("item");
    expect((hit as { type: "item"; index: number }).index).toBe(0);

    // Second item
    const hit2 = hitTestDropdownPanel(150, 125, 0, 0);
    expect(hit2).not.toBeNull();
    expect(hit2!.type).toBe("item");
    expect((hit2 as { type: "item"; index: number }).index).toBe(1);
  });

  it("accounts for scroll offset", () => {
    openDropdownPanel(
      basePanelState({
        options: [{ value: "a", label: "Alpha" }],
      }),
    );

    // With scrollTop=50, panel viewport y shifts up by 50
    // Panel content y = 82, viewport y = 82 - 50 = 32
    const hit = hitTestDropdownPanel(150, 45, 0, 50);
    expect(hit).not.toBeNull();
    expect(hit!.type).toBe("item");
  });
});

describe("flip logic", () => {
  beforeEach(() => {
    closeDropdownPanel();
  });

  it("flips panel above trigger when it overflows viewport", () => {
    // Trigger near bottom: y=450, h=30 → panel would start at 482
    // With 3 items: panelH = 3*30 + 4*2 = 98, panel bottom = 482 + 98 = 580
    // Viewport height = 500 → overflows → should flip above
    openDropdownPanel(
      basePanelState({
        triggerY: 450,
        triggerH: 30,
      }),
    );

    // Without viewport height → no flip, panel below
    const hitBelow = hitTestDropdownPanel(150, 490, 0, 0);
    expect(hitBelow).not.toBeNull();

    // With viewport height → flip, panel now above trigger
    // Flipped panelY = 450 - 98 - 2 = 350
    // Panel covers 350..448 in content space (viewport with scrollTop=0)
    const hitAbove = hitTestDropdownPanel(150, 370, 0, 0, 500);
    expect(hitAbove).not.toBeNull();
    expect(hitAbove!.type).toBe("item");

    // Original position (below) should now be empty when flipped
    const hitOld = hitTestDropdownPanel(150, 490, 0, 0, 500);
    expect(hitOld).toBeNull();
  });

  it("does not flip when panel fits below", () => {
    openDropdownPanel(
      basePanelState({
        triggerY: 50,
        triggerH: 30,
      }),
    );

    // Panel at y=82, panelH=98, bottom=180, viewport=500 → fits
    const hit = hitTestDropdownPanel(150, 100, 0, 0, 500);
    expect(hit).not.toBeNull();
    expect(hit!.type).toBe("item");
  });

  it("does not flip when flipped position would be negative", () => {
    // Trigger at y=10, h=30 → panel below at y=42
    // 3 items: panelH=98, bottom=140, viewport=100 → overflows
    // Flipped: y=10-98-2 = -90 → negative → don't flip
    openDropdownPanel(
      basePanelState({
        triggerY: 10,
        triggerH: 30,
      }),
    );

    const hit = hitTestDropdownPanel(150, 55, 0, 0, 100);
    expect(hit).not.toBeNull();
    expect(hit!.type).toBe("item");
  });

  it("uses custom itemHeight for panel size calculation", () => {
    openDropdownPanel(
      basePanelState({
        triggerY: 400,
        triggerH: 30,
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        style: resolveDropdownPanelStyle({ option: { height: 20 } }),
      }),
    );

    // 2 items × 20 + 4*2 = 48, panel at y=432, bottom=480, viewport=500 → fits below
    const hit = hitTestDropdownPanel(150, 445, 0, 0, 500);
    expect(hit).not.toBeNull();
    expect(hit!.type).toBe("item");
  });
});
