import { describe, expect, it, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useDataIngestion } from "../hooks/use-data-ingestion";
import { ColumnRegistry } from "../../adapter/column-registry";

function makeEngine() {
  return {
    initColumnar: mock(() => {}),
    ingestFloat64Column: mock(() => {}),
    ingestStringColumn: mock(() => {}),
    ingestBoolColumn: mock(() => {}),
    finalizeColumnar: mock(() => {}),
    setColumnarScrollConfig: mock(() => {}),
  } as any;
}

function makeRegistry(cols: { id: string; width: number }[]) {
  const reg = new ColumnRegistry();
  reg.setAll(cols as any);
  return reg;
}

function defaultParams(overrides?: Record<string, unknown>) {
  return {
    engine: makeEngine(),
    data: [
      { name: "Alice", dept: "Eng", salary: 100 },
      { name: "Bob", dept: "Sales", salary: 200 },
    ] as Record<string, unknown>[],
    columnRegistry: makeRegistry([
      { id: "name", width: 200 },
      { id: "dept", width: 150 },
      { id: "salary", width: 120 },
    ]),
    rowHeight: 36,
    height: 600,
    headerHeight: 40,
    invalidate: mock(() => {}),
    ...overrides,
  };
}

describe("useDataIngestion (renderHook)", () => {
  it("calls ingestData and setColumnarScrollConfig on mount", () => {
    const engine = makeEngine();
    const registry = makeRegistry([
      { id: "name", width: 200 },
      { id: "age", width: 100 },
    ]);
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ] as Record<string, unknown>[];
    const invalidate = mock(() => {});

    renderHook(() =>
      useDataIngestion({
        engine,
        data,
        columnRegistry: registry,
        rowHeight: 36,
        height: 600,
        headerHeight: 40,
        invalidate,
      }),
    );

    expect(engine.initColumnar).toHaveBeenCalledWith(2, 2); // 2 cols, 2 rows
    expect(engine.finalizeColumnar).toHaveBeenCalled();
    // rowHeight=36, height-headerHeight=560, overscan=5
    expect(engine.setColumnarScrollConfig).toHaveBeenCalledWith(36, 560, 5);
    expect(invalidate).toHaveBeenCalled();
  });

  it("does nothing when engine is null", () => {
    const registry = makeRegistry([{ id: "name", width: 200 }]);
    const invalidate = mock(() => {});

    renderHook(() =>
      useDataIngestion({
        engine: null,
        data: [{ name: "Alice" }] as Record<string, unknown>[],
        columnRegistry: registry,
        rowHeight: 36,
        height: 600,
        headerHeight: 40,
        invalidate,
      }),
    );

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does nothing when columns are empty", () => {
    const engine = makeEngine();
    const registry = makeRegistry([]);
    const invalidate = mock(() => {});

    renderHook(() =>
      useDataIngestion({
        engine,
        data: [{ name: "Alice" }] as Record<string, unknown>[],
        columnRegistry: registry,
        rowHeight: 36,
        height: 600,
        headerHeight: 40,
        invalidate,
      }),
    );

    expect(engine.initColumnar).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("returns a stringTableRef", () => {
    const engine = makeEngine();
    const registry = makeRegistry([{ id: "name", width: 200 }]);
    const data = [{ name: "Alice" }] as Record<string, unknown>[];

    const { result } = renderHook(() =>
      useDataIngestion({
        engine,
        data,
        columnRegistry: registry,
        rowHeight: 36,
        height: 600,
        headerHeight: 40,
        invalidate: mock(() => {}),
      }),
    );

    // StringTable should be populated (keyed by column ID)
    expect(result.current.stringTableRef.current.get("name", 0)).toBe("Alice");
  });

  it("re-ingests when data changes", () => {
    const engine = makeEngine();
    const registry = makeRegistry([{ id: "name", width: 200 }]);
    const invalidate = mock(() => {});
    let data = [{ name: "Alice" }] as Record<string, unknown>[];

    const { rerender } = renderHook(() =>
      useDataIngestion({
        engine,
        data,
        columnRegistry: registry,
        rowHeight: 36,
        height: 600,
        headerHeight: 40,
        invalidate,
      }),
    );

    expect(engine.initColumnar).toHaveBeenCalledTimes(1);

    data = [{ name: "Alice" }, { name: "Bob" }] as Record<string, unknown>[];
    rerender();

    expect(engine.initColumnar).toHaveBeenCalledTimes(2);
  });

  describe("column reorder (pinning)", () => {
    it("re-ingests when column order changes via registry", () => {
      const params = defaultParams();
      const engine = params.engine;
      renderHook(() => useDataIngestion(params));

      expect(engine.initColumnar).toHaveBeenCalledTimes(1);

      // Simulate pinning reorder: salary moved to front
      act(() => {
        params.columnRegistry.setAll([
          { id: "salary", width: 120 },
          { id: "name", width: 200 },
          { id: "dept", width: 150 },
        ] as any);
      });

      // Should have re-ingested because column ID order changed
      expect(engine.initColumnar).toHaveBeenCalledTimes(2);
    });

    it("does NOT re-ingest when only column sizes change (same order)", () => {
      const params = defaultParams();
      const engine = params.engine;
      renderHook(() => useDataIngestion(params));

      expect(engine.initColumnar).toHaveBeenCalledTimes(1);

      // Simulate column resize: same IDs, different widths
      act(() => {
        params.columnRegistry.setAll([
          { id: "name", width: 300 },
          { id: "dept", width: 200 },
          { id: "salary", width: 80 },
        ] as any);
      });

      // Should NOT re-ingest because column ID order is unchanged
      expect(engine.initColumnar).toHaveBeenCalledTimes(1);
    });

    it("StringTable returns correct data after column reorder", () => {
      const params = defaultParams();
      const { result } = renderHook(() => useDataIngestion(params));

      const st = result.current.stringTableRef.current;
      expect(st.get("name", 0)).toBe("Alice");
      expect(st.get("salary", 0)).toBe("100");

      // Reorder columns (pinning simulation)
      act(() => {
        params.columnRegistry.setAll([
          { id: "salary", width: 120 },
          { id: "name", width: 200 },
          { id: "dept", width: 150 },
        ] as any);
      });

      // StringTable lookups by ID still return correct data
      expect(st.get("name", 0)).toBe("Alice");
      expect(st.get("salary", 0)).toBe("100");
      expect(st.get("dept", 1)).toBe("Sales");
    });

    it("re-ingests when a column is added", () => {
      const params = defaultParams();
      const engine = params.engine;
      renderHook(() => useDataIngestion(params));

      expect(engine.initColumnar).toHaveBeenCalledTimes(1);

      // Add a new column (visibility change)
      act(() => {
        params.columnRegistry.setAll([
          { id: "name", width: 200 },
          { id: "dept", width: 150 },
          { id: "salary", width: 120 },
          { id: "score", width: 100 },
        ] as any);
      });

      expect(engine.initColumnar).toHaveBeenCalledTimes(2);
    });

    it("re-ingests when a column is removed", () => {
      const params = defaultParams();
      const engine = params.engine;
      renderHook(() => useDataIngestion(params));

      expect(engine.initColumnar).toHaveBeenCalledTimes(1);

      // Remove a column (visibility toggle)
      act(() => {
        params.columnRegistry.setAll([
          { id: "name", width: 200 },
          { id: "salary", width: 120 },
        ] as any);
      });

      expect(engine.initColumnar).toHaveBeenCalledTimes(2);
    });
  });
});
