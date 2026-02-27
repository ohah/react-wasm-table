import { describe, expect, it, mock } from "bun:test";
import {
  headerLayer,
  dataLayer,
  gridLinesLayer,
  selectionLayer,
  DEFAULT_LAYERS,
  createAfterDrawLayer,
} from "../layer";
import type { InternalLayerContext } from "../layer";
import type { Theme } from "../../types";

const defaultTheme: Theme = {
  headerBackground: "#f5f5f5",
  headerColor: "#333",
  headerFontSize: 13,
  cellBackground: "#fff",
  cellColor: "#333",
  fontSize: 13,
  borderColor: "#e0e0e0",
  selectedBackground: "#1976d2",
  fontFamily: "system-ui, sans-serif",
};

function mockRenderer() {
  return {
    drawHeaderFromBuffer: mock(() => {}),
    drawRowsFromBuffer: mock(() => {}),
    drawGridLinesFromBuffer: mock(() => {}),
    drawSelection: mock(() => {}),
    clear: mock(() => {}),
    context: {} as CanvasRenderingContext2D,
  };
}

function buildContext(overrides?: Partial<InternalLayerContext>): InternalLayerContext {
  const renderer = mockRenderer();
  return {
    ctx: {} as CanvasRenderingContext2D,
    renderer: renderer as any,
    layoutBuf: new Float32Array(0),
    viewIndices: new Uint32Array(0),
    width: 800,
    height: 600,
    scrollLeft: 0,
    scrollTop: 0,
    headerHeight: 40,
    rowHeight: 36,
    headerCount: 3,
    totalCellCount: 33,
    dataCount: 30,
    visibleRowStart: 0,
    dataRowCount: 100,
    columns: [],
    theme: defaultTheme,
    _headersWithSort: ["Name", "Age \u25B2", "Status"],
    _getInstruction: () => ({ type: "text", value: "test" }),
    _cellRendererRegistry: { get: () => undefined } as any,
    _enableSelection: true,
    _selection: { minRow: 0, maxRow: 2, minCol: 0, maxCol: 1 },
    _selectionStyle: undefined,
    ...overrides,
  };
}

describe("headerLayer", () => {
  it("has correct name and space", () => {
    const layer = headerLayer();
    expect(layer.name).toBe("header");
    expect(layer.space).toBe("content");
  });

  it("calls drawHeaderFromBuffer with correct args", () => {
    const layer = headerLayer();
    const ctx = buildContext();
    layer.draw(ctx);

    const renderer = ctx.renderer as ReturnType<typeof mockRenderer>;
    expect(renderer.drawHeaderFromBuffer).toHaveBeenCalledTimes(1);
    expect(renderer.drawHeaderFromBuffer).toHaveBeenCalledWith(
      ctx.layoutBuf,
      0,
      ctx.headerCount,
      ctx._headersWithSort,
      ctx.theme,
      ctx.headerHeight,
    );
  });
});

describe("dataLayer", () => {
  it("has correct name and space", () => {
    const layer = dataLayer();
    expect(layer.name).toBe("data");
    expect(layer.space).toBe("content");
  });

  it("calls drawRowsFromBuffer with correct args", () => {
    const layer = dataLayer();
    const ctx = buildContext();
    layer.draw(ctx);

    const renderer = ctx.renderer as ReturnType<typeof mockRenderer>;
    expect(renderer.drawRowsFromBuffer).toHaveBeenCalledTimes(1);
    expect(renderer.drawRowsFromBuffer).toHaveBeenCalledWith(
      ctx.layoutBuf,
      ctx.headerCount,
      ctx.dataCount,
      ctx._getInstruction,
      ctx.theme,
      ctx.rowHeight,
      ctx._cellRendererRegistry,
    );
  });
});

describe("gridLinesLayer", () => {
  it("has correct name and space", () => {
    const layer = gridLinesLayer();
    expect(layer.name).toBe("gridLines");
    expect(layer.space).toBe("content");
  });

  it("calls drawGridLinesFromBuffer with correct args", () => {
    const layer = gridLinesLayer();
    const ctx = buildContext();
    layer.draw(ctx);

    const renderer = ctx.renderer as ReturnType<typeof mockRenderer>;
    expect(renderer.drawGridLinesFromBuffer).toHaveBeenCalledTimes(1);
    expect(renderer.drawGridLinesFromBuffer).toHaveBeenCalledWith(
      ctx.layoutBuf,
      ctx.headerCount,
      ctx.totalCellCount,
      ctx.theme,
      ctx.headerHeight,
      ctx.rowHeight,
    );
  });
});

describe("selectionLayer", () => {
  it("has correct name and space", () => {
    const layer = selectionLayer();
    expect(layer.name).toBe("selection");
    expect(layer.space).toBe("content");
  });

  it("calls drawSelection when enabled and selection present", () => {
    const layer = selectionLayer();
    const ctx = buildContext();
    layer.draw(ctx);

    const renderer = ctx.renderer as ReturnType<typeof mockRenderer>;
    expect(renderer.drawSelection).toHaveBeenCalledTimes(1);
    expect(renderer.drawSelection).toHaveBeenCalledWith(
      ctx.layoutBuf,
      ctx.headerCount,
      ctx.totalCellCount,
      ctx._selection,
      ctx.theme,
      ctx._selectionStyle,
    );
  });

  it("is no-op when _enableSelection is false", () => {
    const layer = selectionLayer();
    const ctx = buildContext({ _enableSelection: false });
    layer.draw(ctx);

    const renderer = ctx.renderer as ReturnType<typeof mockRenderer>;
    expect(renderer.drawSelection).not.toHaveBeenCalled();
  });

  it("is no-op when _selection is null", () => {
    const layer = selectionLayer();
    const ctx = buildContext({ _selection: null });
    layer.draw(ctx);

    const renderer = ctx.renderer as ReturnType<typeof mockRenderer>;
    expect(renderer.drawSelection).not.toHaveBeenCalled();
  });
});

describe("DEFAULT_LAYERS", () => {
  it("has exactly 4 layers", () => {
    expect(DEFAULT_LAYERS).toHaveLength(4);
  });

  it("has correct order: header → data → gridLines → selection", () => {
    expect(DEFAULT_LAYERS.map((l) => l.name)).toEqual(["header", "data", "gridLines", "selection"]);
  });

  it("all layers are content space", () => {
    for (const layer of DEFAULT_LAYERS) {
      expect(layer.space).toBe("content");
    }
  });
});

describe("createAfterDrawLayer", () => {
  it("creates a viewport-space layer named afterDraw", () => {
    const cb = mock(() => {});
    const layer = createAfterDrawLayer(cb);
    expect(layer.name).toBe("afterDraw");
    expect(layer.space).toBe("viewport");
  });

  it("passes correct AfterDrawContext to callback", () => {
    const cb = mock(() => {});
    const layer = createAfterDrawLayer(cb);
    const ctx = buildContext({
      width: 800,
      height: 600,
      scrollTop: 100,
      scrollLeft: 50,
      headerHeight: 40,
      rowHeight: 36,
      visibleRowStart: 3,
      dataCount: 15,
      dataRowCount: 200,
    });

    layer.draw(ctx);

    expect(cb).toHaveBeenCalledTimes(1);
    const arg = cb.mock.calls[0]![0] as any;
    expect(arg.ctx).toBe(ctx.ctx);
    expect(arg.width).toBe(800);
    expect(arg.height).toBe(600);
    expect(arg.scrollTop).toBe(100);
    expect(arg.scrollLeft).toBe(50);
    expect(arg.headerHeight).toBe(40);
    expect(arg.rowHeight).toBe(36);
    expect(arg.visibleRowStart).toBe(3);
    expect(arg.visibleRowCount).toBe(15);
    expect(arg.dataRowCount).toBe(200);
    expect(arg.columns).toBe(ctx.columns);
  });
});
