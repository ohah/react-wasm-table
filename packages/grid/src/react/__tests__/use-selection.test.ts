import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "../hooks/use-selection";
import { ColumnRegistry } from "../../adapter/column-registry";
import { SelectionManager } from "../../adapter/selection-manager";
import { StringTable } from "../../adapter/string-table";

function makeRegistry(cols: { id: string; selectable?: boolean }[]) {
  const reg = new ColumnRegistry();
  reg.setAll(cols.map((c) => ({ ...c, width: 100 })) as any);
  return reg;
}

function makeCanvasRef() {
  const canvas = document.createElement("canvas");
  const parent = document.createElement("div");
  parent.appendChild(canvas);
  return { current: canvas } as React.RefObject<HTMLCanvasElement>;
}

function defaultParams(overrides?: Partial<Parameters<typeof useSelection>[0]>) {
  const st = new StringTable();
  return {
    canvasRef: makeCanvasRef(),
    enableSelection: true,
    columnRegistry: makeRegistry([{ id: "name" }, { id: "age" }]),
    invalidate: mock(() => {}),
    getMemoryBridge: () => null,
    getStringTable: () => st,
    ...overrides,
  };
}

describe("useSelection (renderHook)", () => {
  describe("mousedown/move/up cycle", () => {
    it("starts and finishes selection", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 1, col: 0 }, false));
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(true);
      expect(result.current.selectionManagerRef.current.isDragging).toBe(true);

      act(() => result.current.handleCellMouseMove({ row: 3, col: 1 }));
      act(() => result.current.handleCellMouseUp());

      expect(result.current.selectionManagerRef.current.isDragging).toBe(false);
      expect(result.current.selectionManagerRef.current.getNormalized()).toEqual({
        minRow: 1,
        maxRow: 3,
        minCol: 0,
        maxCol: 1,
      });
    });

    it("does not start selection when enableSelection is false", () => {
      const params = defaultParams({ enableSelection: false });
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(false);
    });

    it("respects selectable=false on columns", () => {
      const params = defaultParams({
        columnRegistry: makeRegistry([
          { id: "name", selectable: true },
          { id: "actions", selectable: false },
        ]),
      });
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 1 }, false));
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(false);

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(true);
    });
  });

  describe("shift-click extends selection", () => {
    it("extends from anchor to new end", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 1, col: 0 }, false));
      act(() => result.current.handleCellMouseUp());

      act(() => result.current.handleCellMouseDown({ row: 5, col: 2 }, true));
      expect(result.current.selectionManagerRef.current.getNormalized()).toEqual({
        minRow: 1,
        maxRow: 5,
        minCol: 0,
        maxCol: 2,
      });
    });
  });

  describe("Escape clears selection", () => {
    it("clears on Escape keydown", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      act(() => result.current.handleCellMouseUp());
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(true);

      act(() => result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" })));
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(false);
    });
  });

  describe("Ctrl+C copies selection", () => {
    let savedNav: Navigator;
    beforeEach(() => {
      savedNav = globalThis.navigator;
    });
    afterEach(() => {
      Object.defineProperty(globalThis, "navigator", {
        value: savedNav,
        writable: true,
        configurable: true,
      });
    });

    it("writes TSV to clipboard", () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(globalThis, "navigator", {
        value: { ...savedNav, clipboard: { writeText: writeTextMock } },
        writable: true,
        configurable: true,
      });

      const st = new StringTable();
      st.populate(
        [
          { name: "Alice", age: "30" },
          { name: "Bob", age: "25" },
        ] as Record<string, unknown>[],
        ["name", "age"],
      );
      const params = defaultParams({ getStringTable: () => st });
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      act(() => result.current.handleCellMouseMove({ row: 1, col: 1 }));
      act(() => result.current.handleCellMouseUp());

      act(() =>
        result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "c", ctrlKey: true })),
      );

      expect(writeTextMock).toHaveBeenCalled();
      const written = writeTextMock.mock.calls[0]![0] as string;
      expect(written).toContain("Alice");
      expect(written).toContain("Bob");
    });

    it("uses onCopy override when provided", () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(globalThis, "navigator", {
        value: { ...savedNav, clipboard: { writeText: writeTextMock } },
        writable: true,
        configurable: true,
      });

      const st = new StringTable();
      st.populate([{ name: "Alice" }] as Record<string, unknown>[], ["name"]);
      const onCopy = mock((_tsv: string) => "custom-text");
      const params = defaultParams({ getStringTable: () => st, onCopy });
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      act(() => result.current.handleCellMouseUp());

      act(() =>
        result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "c", metaKey: true })),
      );

      expect(onCopy).toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalledWith("custom-text");
    });
  });

  describe("onBeforeSelectionChange guard", () => {
    it("returning false prevents selection start", () => {
      const guard = mock(() => false as const);
      const params = defaultParams({ onBeforeSelectionChange: guard });
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(false);
      expect(guard).toHaveBeenCalled();
    });

    it("returning false prevents Escape clear", () => {
      const guard = mock((next: unknown) => (next === null ? (false as const) : undefined));
      const params = defaultParams({ onBeforeSelectionChange: guard });
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      act(() => result.current.handleCellMouseUp());
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(true);

      act(() => result.current.handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" })));
      // Guard returned false for null → selection preserved
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(true);
    });
  });

  describe("controlled mode (selectionProp)", () => {
    it("syncs external selectionProp to SelectionManager", () => {
      const params = defaultParams({
        selectionProp: { minRow: 2, maxRow: 4, minCol: 0, maxCol: 1 },
      });
      const { result } = renderHook(() => useSelection(params));

      const norm = result.current.selectionManagerRef.current.getNormalized();
      expect(norm).toEqual({ minRow: 2, maxRow: 4, minCol: 0, maxCol: 1 });
    });

    it("clears selection when selectionProp becomes null", () => {
      let selectionProp: any = { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
      const params = defaultParams({ selectionProp });
      const { result, rerender } = renderHook(() => useSelection({ ...params, selectionProp }));

      expect(result.current.selectionManagerRef.current.hasSelection).toBe(true);

      selectionProp = null;
      rerender();
      expect(result.current.selectionManagerRef.current.hasSelection).toBe(false);
    });
  });

  describe("selectionManager DI (Step 0-5)", () => {
    it("uses injected SelectionManager when provided", () => {
      const external = new SelectionManager();
      const params = defaultParams({ selectionManager: external });
      const { result } = renderHook(() => useSelection(params));

      expect(result.current.selectionManagerRef.current).toBe(external);
    });

    it("creates internal SelectionManager when not provided", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useSelection(params));

      expect(result.current.selectionManagerRef.current).toBeInstanceOf(SelectionManager);
    });
  });

  describe("onSelectionChange callback", () => {
    it("fires when selection changes", () => {
      const onSelectionChange = mock(() => {});
      const params = defaultParams({ onSelectionChange });
      const { result } = renderHook(() => useSelection(params));

      act(() => result.current.handleCellMouseDown({ row: 0, col: 0 }, false));
      // onSelectionChange fires via onDirty → invalidate → onSelectionChange
      expect(onSelectionChange).toHaveBeenCalled();
    });
  });
});
