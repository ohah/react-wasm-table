import { describe, expect, it, mock } from "bun:test";
import { renderHook } from "@testing-library/react";
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

    // StringTable should be populated
    expect(result.current.stringTableRef.current.get(0, 0)).toBe("Alice");
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
});
