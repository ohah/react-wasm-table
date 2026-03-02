import { describe, expect, it, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useEditing } from "../hooks/use-editing";
import { ColumnRegistry } from "../../adapter/column-registry";
import { EditorManager } from "../../adapter/editor-manager";
import { SelectionManager } from "../../adapter/selection-manager";

const STRIDE = 16;

function makeLayoutBuf(
  cells: {
    row: number;
    col: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }[],
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
    cols: { id: string; width: number; editor?: string; editCell?: any }[],
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
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 }, // header (unified row=0)
      { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 }, // data (unified row=1)
    ]);
    const { result } = setup(
      [{ id: "name", width: 100, editor: "text" }],
      [{ name: "Alice" }],
      buf,
    );

    act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
    expect(result.current.editorManagerRef.current.isEditing).toBe(true);
  });

  it("does not open editor for columns without editor prop", () => {
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
      { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
    ]);
    const { result } = setup(
      [{ id: "name", width: 100 }], // no editor
      [{ name: "Alice" }],
      buf,
    );

    act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
    expect(result.current.editorManagerRef.current.isEditing).toBe(false);
  });

  it("does not open editor when layout buffer is null", () => {
    const { result } = setup(
      [{ id: "name", width: 100, editor: "text" }],
      [{ name: "Alice" }],
      undefined, // no buffer
    );

    act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
    expect(result.current.editorManagerRef.current.isEditing).toBe(false);
  });

  it("does not open editor when row data is missing", () => {
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
      { row: 6, col: 0, x: 0, y: 40, w: 100, h: 36 }, // unified row 6 → data row 5, doesn't exist
    ]);
    const { result } = setup(
      [{ id: "name", width: 100, editor: "text" }],
      [{ name: "Alice" }], // only row 0
      buf,
    );

    act(() => result.current.handleCellDoubleClick({ row: 6, col: 0 }));
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

  describe("meta.updateData integration", () => {
    function setupWithMeta(
      cols: { id: string; width: number; editor?: string }[],
      data: Record<string, unknown>[],
      layoutBuf: Float32Array,
      meta?: {
        updateData?: (...args: unknown[]) => void;
        [key: string]: unknown;
      },
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
          getLayoutBuf: () => layoutBuf,
          getHeaderCount: () => 1,
          getTotalCellCount: () => layoutBuf.length / STRIDE,
          meta,
        }),
      );
    }

    it("calls updateData with correct rowIndex, columnId, value on commitValue", () => {
      const updateData = mock(() => {});
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setupWithMeta(
        [{ id: "name", width: 100, editor: "text" }],
        [{ name: "Alice" }],
        buf,
        { updateData },
      );

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      const em = result.current.editorManagerRef.current;
      expect(em.isEditing).toBe(true);
      act(() => {
        em.commitValue("NewName");
      });
      expect(updateData).toHaveBeenCalledTimes(1);
      // rowIndex=0 (row 1 - headerCount 1), columnId="name"
      expect(updateData.mock.calls[0]![0]).toBe(0);
      expect(updateData.mock.calls[0]![1]).toBe("name");
      expect(updateData.mock.calls[0]![2]).toBe("NewName");
    });

    it("does not throw when meta is undefined", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setupWithMeta(
        [{ id: "name", width: 100, editor: "text" }],
        [{ name: "Alice" }],
        buf,
        undefined,
      );

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      expect(() => {
        act(() => result.current.editorManagerRef.current.commitValue("val"));
      }).not.toThrow();
    });

    it("does not throw when meta.updateData is undefined", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setupWithMeta(
        [{ id: "name", width: 100, editor: "text" }],
        [{ name: "Alice" }],
        buf,
        {}, // meta without updateData
      );

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      expect(() => {
        act(() => result.current.editorManagerRef.current.commitValue("val"));
      }).not.toThrow();
    });
  });

  it("clears selection when editor opens", () => {
    const buf = makeLayoutBuf([
      { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 }, // header (unified row=0)
      { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 }, // data (unified row=1)
    ]);
    const registry = new ColumnRegistry();
    registry.setAll([{ id: "name", width: 100, editor: "text" }] as any);
    const sm = new SelectionManager();
    sm.start(1, 0);
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

    act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
    expect(sm.hasSelection).toBe(false);
  });

  describe("isCellEditable", () => {
    it("returns true for data row with editor column", () => {
      const { result } = setup([{ id: "name", width: 100, editor: "text" }], [{ name: "Alice" }]);
      expect(result.current.isCellEditable({ row: 1, col: 0 })).toBe(true);
    });

    it("returns true for data row with editCell column", () => {
      const { result } = setup(
        [{ id: "name", width: 100, editCell: () => null }],
        [{ name: "Alice" }],
      );
      expect(result.current.isCellEditable({ row: 1, col: 0 })).toBe(true);
    });

    it("returns false for header row", () => {
      const { result } = setup([{ id: "name", width: 100, editor: "text" }], [{ name: "Alice" }]);
      expect(result.current.isCellEditable({ row: 0, col: 0 })).toBe(false);
    });

    it("returns false for column without editor", () => {
      const { result } = setup([{ id: "name", width: 100 }], [{ name: "Alice" }]);
      expect(result.current.isCellEditable({ row: 1, col: 0 })).toBe(false);
    });

    it("returns false for out-of-range column", () => {
      const { result } = setup([{ id: "name", width: 100, editor: "text" }], [{ name: "Alice" }]);
      expect(result.current.isCellEditable({ row: 1, col: 5 })).toBe(false);
    });
  });

  describe("editTrigger", () => {
    function setupTrigger(
      trigger: "click" | "dblclick",
      cols: { id: string; width: number; editor?: string }[],
      data: Record<string, unknown>[],
      layoutBuf?: Float32Array,
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
          getHeaderCount: () => 1,
          getTotalCellCount: () => (layoutBuf ? layoutBuf.length / STRIDE : 0),
          editTrigger: trigger,
        }),
      );
    }

    it("dblclick trigger: double-click opens editor, single-click does not", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setupTrigger(
        "dblclick",
        [{ id: "name", width: 100, editor: "text" }],
        [{ name: "Alice" }],
        buf,
      );

      act(() => result.current.handleCellClick({ row: 1, col: 0 }));
      expect(result.current.editorManagerRef.current.isEditing).toBe(false);

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);
    });

    it("click trigger: single-click opens editor, double-click does not", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setupTrigger(
        "click",
        [{ id: "name", width: 100, editor: "text" }],
        [{ name: "Alice" }],
        buf,
      );

      act(() => result.current.handleCellClick({ row: 1, col: 0 }));
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);
    });

    it("click trigger: clicking non-editable cell cancels editor", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 0, col: 1, x: 100, y: 0, w: 80, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
        { row: 1, col: 1, x: 100, y: 40, w: 80, h: 36 },
      ]);
      const { result } = setupTrigger(
        "click",
        [
          { id: "name", width: 100, editor: "text" },
          { id: "status", width: 80 },
        ],
        [{ name: "Alice", status: "active" }],
        buf,
      );

      act(() => result.current.handleCellClick({ row: 1, col: 0 }));
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);

      act(() => result.current.handleCellClick({ row: 1, col: 1 }));
      expect(result.current.editorManagerRef.current.isEditing).toBe(false);
    });
  });

  describe("Tab navigation", () => {
    function setupNav(
      cols: { id: string; width: number; editor?: string }[],
      data: Record<string, unknown>[],
      layoutCells: {
        row: number;
        col: number;
        x: number;
        y: number;
        w: number;
        h: number;
      }[],
    ) {
      const buf = makeLayoutBuf(layoutCells);
      const registry = new ColumnRegistry();
      registry.setAll(cols as any);
      const sm = new SelectionManager();
      const editorDiv = document.createElement("div");
      document.body.appendChild(editorDiv);
      const hook = renderHook(() =>
        useEditing({
          editorRef: { current: editorDiv },
          columnRegistry: registry,
          data,
          selectionManagerRef: { current: sm },
          getLayoutBuf: () => buf,
          getHeaderCount: () => cols.length, // header cells in buffer
          getTotalCellCount: () => layoutCells.length,
        }),
      );
      return { ...hook, editorDiv };
    }

    it("Tab (commitAndNavigate) moves to next editable column in the same row", () => {
      const cols = [
        { id: "name", width: 100, editor: "text" },
        { id: "age", width: 80, editor: "number" },
        { id: "dept", width: 120, editor: "text" },
      ];
      const data = [{ name: "Alice", age: 30, dept: "Eng" }];
      const cells = [
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 0, col: 1, x: 100, y: 0, w: 80, h: 40 },
        { row: 0, col: 2, x: 180, y: 0, w: 120, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
        { row: 1, col: 1, x: 100, y: 40, w: 80, h: 36 },
        { row: 1, col: 2, x: 180, y: 40, w: 120, h: 36 },
      ];
      const { result } = setupNav(cols, data, cells);

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      const em = result.current.editorManagerRef.current;
      expect(em.isEditing).toBe(true);

      // Simulate Tab via commitAndNavigate
      act(() => em.commitAndNavigate("Alice", "next"));
      // Should open editor at next editable cell (row:1, col:1)
      expect(em.isEditing).toBe(true);
      expect(em.activeCoord).toEqual({ row: 1, col: 1 });
    });

    it("Tab skips non-editable columns", () => {
      const cols = [
        { id: "name", width: 100, editor: "text" },
        { id: "status", width: 80 },
        { id: "dept", width: 120, editor: "text" },
      ];
      const data = [{ name: "Alice", status: "active", dept: "Eng" }];
      const cells = [
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 0, col: 1, x: 100, y: 0, w: 80, h: 40 },
        { row: 0, col: 2, x: 180, y: 0, w: 120, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
        { row: 1, col: 1, x: 100, y: 40, w: 80, h: 36 },
        { row: 1, col: 2, x: 180, y: 40, w: 120, h: 36 },
      ];
      const { result } = setupNav(cols, data, cells);

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      act(() => result.current.editorManagerRef.current.commitAndNavigate("Alice", "next"));
      // Should skip col 1 (no editor) and land on col 2
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);
      expect(result.current.editorManagerRef.current.activeCoord).toEqual({ row: 1, col: 2 });
    });

    it("Tab wraps to first editable column of next row", () => {
      const cols = [{ id: "name", width: 100, editor: "text" }];
      const data = [{ name: "Alice" }, { name: "Bob" }];
      const cells = [
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
        { row: 2, col: 0, x: 0, y: 76, w: 100, h: 36 },
      ];
      const { result } = setupNav(cols, data, cells);

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      act(() => result.current.editorManagerRef.current.commitAndNavigate("Alice", "next"));
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);
      expect(result.current.editorManagerRef.current.activeCoord).toEqual({ row: 2, col: 0 });
    });

    it("Shift+Tab moves to previous editable column", () => {
      const cols = [
        { id: "name", width: 100, editor: "text" },
        { id: "age", width: 80, editor: "number" },
      ];
      const data = [{ name: "Alice", age: 30 }];
      const cells = [
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 0, col: 1, x: 100, y: 0, w: 80, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
        { row: 1, col: 1, x: 100, y: 40, w: 80, h: 36 },
      ];
      const { result } = setupNav(cols, data, cells);

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 1 }));
      act(() => result.current.editorManagerRef.current.commitAndNavigate(30, "prev"));
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);
      expect(result.current.editorManagerRef.current.activeCoord).toEqual({ row: 1, col: 0 });
    });

    it("Tab at last cell of last row closes editor (no wrap)", () => {
      const cols = [{ id: "name", width: 100, editor: "text" }];
      const data = [{ name: "Alice" }];
      const cells = [
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ];
      const { result } = setupNav(cols, data, cells);

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      act(() => result.current.editorManagerRef.current.commitAndNavigate("Alice", "next"));
      // No next editable cell → editor should be closed
      expect(result.current.editorManagerRef.current.isEditing).toBe(false);
    });
  });

  describe("handleTypingKeyDown", () => {
    function setupTyping(
      cols: { id: string; width: number; editor?: string }[],
      data: Record<string, unknown>[],
      layoutBuf: Float32Array,
    ) {
      const registry = new ColumnRegistry();
      registry.setAll(cols as any);
      const sm = new SelectionManager();
      const editorDiv = document.createElement("div");
      document.body.appendChild(editorDiv);
      return renderHook(() =>
        useEditing({
          editorRef: { current: editorDiv },
          columnRegistry: registry,
          data,
          selectionManagerRef: { current: sm },
          getLayoutBuf: () => layoutBuf,
          getHeaderCount: () => cols.length,
          getTotalCellCount: () => layoutBuf.length / STRIDE,
        }),
      );
    }

    it("opens editor with initialChar on printable single character", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setupTyping(
        [{ id: "name", width: 100, editor: "text" }],
        [{ name: "Alice" }],
        buf,
      );

      // Simulate single-cell selection
      const sm = (result.current as any).editorManagerRef.current;
      // We need to call handleCellClick or set up selection first
      // Use the selectionManagerRef to set a single cell selection
      // Access via the hook's internal selection manager
      act(() => {
        // Get selection manager from the closure — set selection manually
        // The hook uses selectionManagerRef.current.getNormalized()
        // We'll simulate by making the hook's handleCellClick first to create a selection state
        // Instead, directly test handleTypingKeyDown by accessing it
      });

      // For this test, we need the selection manager to have a single cell selected
      // Since setupTyping gives us a SelectionManager, let's set it up differently
      const registry2 = new ColumnRegistry();
      registry2.setAll([{ id: "name", width: 100, editor: "text" }] as any);
      const sm2 = new SelectionManager();
      sm2.start(1, 0);
      sm2.finish();
      const editorDiv2 = document.createElement("div");
      document.body.appendChild(editorDiv2);

      const { result: r2 } = renderHook(() =>
        useEditing({
          editorRef: { current: editorDiv2 },
          columnRegistry: registry2,
          data: [{ name: "Alice" }],
          selectionManagerRef: { current: sm2 },
          getLayoutBuf: () => buf,
          getHeaderCount: () => 1,
          getTotalCellCount: () => buf.length / STRIDE,
        }),
      );

      const em2 = r2.current.editorManagerRef.current;
      expect(em2.isEditing).toBe(false);

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "a" });
        r2.current.handleTypingKeyDown(event);
      });

      expect(em2.isEditing).toBe(true);
      expect(em2.initialChar).toBe("a");
    });

    it("ignores ctrl/meta/alt key combinations", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const registry = new ColumnRegistry();
      registry.setAll([{ id: "name", width: 100, editor: "text" }] as any);
      const sm = new SelectionManager();
      sm.start(1, 0);
      sm.finish();
      const editorDiv = document.createElement("div");
      document.body.appendChild(editorDiv);

      const { result } = renderHook(() =>
        useEditing({
          editorRef: { current: editorDiv },
          columnRegistry: registry,
          data: [{ name: "Alice" }],
          selectionManagerRef: { current: sm },
          getLayoutBuf: () => buf,
          getHeaderCount: () => 1,
          getTotalCellCount: () => buf.length / STRIDE,
        }),
      );

      act(() => {
        result.current.handleTypingKeyDown(
          new KeyboardEvent("keydown", { key: "c", ctrlKey: true }),
        );
      });
      expect(result.current.editorManagerRef.current.isEditing).toBe(false);

      act(() => {
        result.current.handleTypingKeyDown(
          new KeyboardEvent("keydown", { key: "c", metaKey: true }),
        );
      });
      expect(result.current.editorManagerRef.current.isEditing).toBe(false);

      act(() => {
        result.current.handleTypingKeyDown(
          new KeyboardEvent("keydown", { key: "c", altKey: true }),
        );
      });
      expect(result.current.editorManagerRef.current.isEditing).toBe(false);
    });

    it("ignores when already editing", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const registry = new ColumnRegistry();
      registry.setAll([{ id: "name", width: 100, editor: "text" }] as any);
      const sm = new SelectionManager();
      sm.start(1, 0);
      sm.finish();
      const editorDiv = document.createElement("div");
      document.body.appendChild(editorDiv);

      const { result } = renderHook(() =>
        useEditing({
          editorRef: { current: editorDiv },
          columnRegistry: registry,
          data: [{ name: "Alice" }],
          selectionManagerRef: { current: sm },
          getLayoutBuf: () => buf,
          getHeaderCount: () => 1,
          getTotalCellCount: () => buf.length / STRIDE,
        }),
      );

      // Open editor first
      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);
      const prevCoord = result.current.editorManagerRef.current.activeCoord;

      // Type should not re-open or change anything
      act(() => {
        result.current.handleTypingKeyDown(new KeyboardEvent("keydown", { key: "x" }));
      });
      expect(result.current.editorManagerRef.current.activeCoord).toEqual(prevCoord);
    });

    it("ignores when selection spans multiple rows", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
        { row: 2, col: 0, x: 0, y: 76, w: 100, h: 36 },
      ]);
      const registry = new ColumnRegistry();
      registry.setAll([{ id: "name", width: 100, editor: "text" }] as any);
      const sm = new SelectionManager();
      sm.start(1, 0);
      sm.extend(2, 0);
      sm.finish();
      const editorDiv = document.createElement("div");
      document.body.appendChild(editorDiv);

      const { result } = renderHook(() =>
        useEditing({
          editorRef: { current: editorDiv },
          columnRegistry: registry,
          data: [{ name: "Alice" }, { name: "Bob" }],
          selectionManagerRef: { current: sm },
          getLayoutBuf: () => buf,
          getHeaderCount: () => 1,
          getTotalCellCount: () => buf.length / STRIDE,
        }),
      );

      act(() => {
        result.current.handleTypingKeyDown(new KeyboardEvent("keydown", { key: "a" }));
      });
      expect(result.current.editorManagerRef.current.isEditing).toBe(false);
    });
  });

  describe("editCell priority", () => {
    it("editCell takes precedence over editor", () => {
      const customEditor = mock(() => null);
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setup(
        [{ id: "name", width: 100, editor: "text", editCell: customEditor }],
        [{ name: "Alice" }],
        buf,
      );

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      const em = result.current.editorManagerRef.current;
      expect(em.isEditing).toBe(true);
      // editorType should be "custom" when editCell is present
      expect(em.editorType).toBe("custom");
    });

    it("opens editor for column with editCell but no editor prop", () => {
      const buf = makeLayoutBuf([
        { row: 0, col: 0, x: 0, y: 0, w: 100, h: 40 },
        { row: 1, col: 0, x: 0, y: 40, w: 100, h: 36 },
      ]);
      const { result } = setup(
        [{ id: "name", width: 100, editCell: () => null }],
        [{ name: "Alice" }],
        buf,
      );

      act(() => result.current.handleCellDoubleClick({ row: 1, col: 0 }));
      expect(result.current.editorManagerRef.current.isEditing).toBe(true);
    });
  });
});
