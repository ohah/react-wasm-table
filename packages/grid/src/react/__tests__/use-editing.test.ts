import { describe, expect, it, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useEditing } from "../hooks/use-editing";
import { ColumnRegistry } from "../../adapter/column-registry";
import { EditorManager } from "../../adapter/editor-manager";
import { SelectionManager } from "../../adapter/selection-manager";

const STRIDE = 16;

function makeLayoutBuf(
  cells: { row: number; col: number; x: number; y: number; w: number; h: number }[],
) {
  const buf = new Float32Array(cells.length * STRIDE);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    buf[i * STRIDE + 0] = c.row;
    buf[i * STRIDE + 1] = c.col;
    buf[i * STRIDE + 2] = c.x;
    buf[i * STRIDE + 3] = c.y;
    buf[i * STRIDE + 4] = c.w;
    buf[i * STRIDE + 5] = c.h;
  }
  return buf;
}

describe("useEditing (renderHook)", () => {
  function setup(
    cols: { id: string; width: number; editor?: string }[],
    data: Record<string, unknown>[],
    layoutBuf?: Float32Array,
    headerCount = 1,
  ) {
    const registry = new ColumnRegistry();
    registry.setAll(cols as any);

    const sm = new SelectionManager();
    const editorDiv = document.createElement("div");

    return renderHook(() =>
      useEditing({
        editorRef: { current: editorDiv },
        columnRegistry: registry,
        data,
        selectionManagerRef: { current: sm },
        getLayoutBuf: () => layoutBuf ?? null,
        getHeaderCount: () => headerCount,
        getTotalCellCount: () => (layoutBuf ? layoutBuf.length / STRIDE : 0),
      }),
    );
  }

  it("returns editorManagerRef and handleCellDoubleClick", () => {
    const { result } = setup([{ id: "name", width: 100, editor: "text" }], [{ name: "Alice" }]);
    expect(result.current.editorManagerRef.current).toBeDefined();
    expect(typeof result.current.handleCellDoubleClick).toBe("function");
  });

  it("opens editor on double-click when column has editor", () => {
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 }, // header
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 }, // data
    ]);
    const { result } = setup(
      [{ id: "name", width: 100, editor: "text" }],
      [{ name: "Alice" }],
      buf,
    );

    act(() => result.current.handleCellDoubleClick({ row: 0, col: 0 }));
    expect(result.current.editorManagerRef.current.isEditing).toBe(true);
  });

  it("does not open editor for columns without editor prop", () => {
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 },
    ]);
    const { result } = setup(
      [{ id: "name", width: 100 }], // no editor
      [{ name: "Alice" }],
      buf,
    );

    act(() => result.current.handleCellDoubleClick({ row: 0, col: 0 }));
    expect(result.current.editorManagerRef.current.isEditing).toBe(false);
  });

  it("does not open editor when layout buffer is null", () => {
    const { result } = setup(
      [{ id: "name", width: 100, editor: "text" }],
      [{ name: "Alice" }],
      undefined, // no buffer
    );

    act(() => result.current.handleCellDoubleClick({ row: 0, col: 0 }));
    expect(result.current.editorManagerRef.current.isEditing).toBe(false);
  });

  it("does not open editor when row data is missing", () => {
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
      { row: 5, col: 0, x: 0, y: 40, w: 100, h: 36 }, // row 5 doesn't exist in data
    ]);
    const { result } = setup(
      [{ id: "name", width: 100, editor: "text" }],
      [{ name: "Alice" }], // only row 0
      buf,
    );

    act(() => result.current.handleCellDoubleClick({ row: 5, col: 0 }));
    expect(result.current.editorManagerRef.current.isEditing).toBe(false);
  });

  describe("editorManager DI (Step 0-5)", () => {
    it("uses injected EditorManager when provided", () => {
      const external = new EditorManager();
      const { result } = setup([{ id: "name", width: 100, editor: "text" }], [{ name: "Alice" }]);

      // Default: creates internal
      expect(result.current.editorManagerRef.current).toBeInstanceOf(EditorManager);

      // With DI
      const registry = new ColumnRegistry();
      registry.setAll([{ id: "name", width: 100, editor: "text" }] as any);
      const sm = new SelectionManager();
      const editorDiv = document.createElement("div");
      const { result: diResult } = renderHook(() =>
        useEditing({
          editorRef: { current: editorDiv },
          columnRegistry: registry,
          data: [{ name: "Alice" }],
          selectionManagerRef: { current: sm },
          getLayoutBuf: () => null,
          getHeaderCount: () => 0,
          getTotalCellCount: () => 0,
          editorManager: external,
        }),
      );
      expect(diResult.current.editorManagerRef.current).toBe(external);
    });

    it("switches to new external manager when prop changes", () => {
      const first = new EditorManager();
      const second = new EditorManager();
      let em: EditorManager | undefined = first;
      const registry = new ColumnRegistry();
      registry.setAll([{ id: "name", width: 100, editor: "text" }] as any);
      const sm = new SelectionManager();
      const editorDiv = document.createElement("div");
      const baseParams = {
        editorRef: { current: editorDiv },
        columnRegistry: registry,
        data: [{ name: "Alice" }] as Record<string, unknown>[],
        selectionManagerRef: { current: sm },
        getLayoutBuf: () => null as Float32Array | null,
        getHeaderCount: () => 0,
        getTotalCellCount: () => 0,
      };
      const { result, rerender } = renderHook(() =>
        useEditing({ ...baseParams, editorManager: em }),
      );
      expect(result.current.editorManagerRef.current).toBe(first);

      em = second;
      rerender();
      expect(result.current.editorManagerRef.current).toBe(second);
    });
  });

  it("clears selection when editor opens", () => {
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
      { row: 0, col: 0, x: 0, y: 40, w: 100, h: 36 },
    ]);
    const registry = new ColumnRegistry();
    registry.setAll([{ id: "name", width: 100, editor: "text" }] as any);
    const sm = new SelectionManager();
    sm.start(0, 0);
    sm.finish();
    expect(sm.hasSelection).toBe(true);

    const editorDiv = document.createElement("div");
    const { result } = renderHook(() =>
      useEditing({
        editorRef: { current: editorDiv },
        columnRegistry: registry,
        data: [{ name: "Alice" }],
        selectionManagerRef: { current: sm },
        getLayoutBuf: () => buf,
        getHeaderCount: () => 1,
        getTotalCellCount: () => 2,
      }),
    );

    act(() => result.current.handleCellDoubleClick({ row: 0, col: 0 }));
    expect(sm.hasSelection).toBe(false);
  });
});
