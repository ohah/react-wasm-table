import { describe, expect, it, mock, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useFiltering } from "../hooks/use-filtering";
import { ColumnRegistry } from "../../adapter/column-registry";

function makeEngine() {
  return {
    setColumnarFilters: mock(() => {}),
    setGlobalFilter: mock(() => {}),
  } as any;
}

function makeRegistry(cols: { id: string }[]) {
  const reg = new ColumnRegistry();
  reg.setAll(cols.map((c) => ({ id: c.id, width: 100 })) as any);
  return reg;
}

describe("useFiltering (renderHook)", () => {
  let engine: ReturnType<typeof makeEngine>;
  let registry: ColumnRegistry;
  let invalidate: ReturnType<typeof mock>;

  beforeEach(() => {
    engine = makeEngine();
    registry = makeRegistry([{ id: "name" }, { id: "age" }, { id: "status" }]);
    invalidate = mock(() => {});
  });

  it("starts with empty column filters by default", () => {
    const { result } = renderHook(() =>
      useFiltering({ engine, columnRegistry: registry, invalidate }),
    );
    expect(result.current.columnFilters).toEqual([]);
    expect(result.current.globalFilter).toBe("");
  });

  it("starts with initial column filters if provided", () => {
    const initial = [{ id: "name", value: "Alice" }];
    const { result } = renderHook(() =>
      useFiltering({
        engine,
        columnRegistry: registry,
        invalidate,
        initialColumnFilters: initial,
      }),
    );
    expect(result.current.columnFilters).toEqual(initial);
  });

  it("starts with initial global filter if provided", () => {
    const { result } = renderHook(() =>
      useFiltering({
        engine,
        columnRegistry: registry,
        invalidate,
        initialGlobalFilter: "search",
      }),
    );
    expect(result.current.globalFilter).toBe("search");
  });

  it("setColumnFilters updates internal state (uncontrolled)", () => {
    const { result } = renderHook(() =>
      useFiltering({ engine, columnRegistry: registry, invalidate }),
    );

    act(() => result.current.setColumnFilters([{ id: "name", value: "Bob" }]));
    expect(result.current.columnFilters).toEqual([{ id: "name", value: "Bob" }]);
    expect(engine.setColumnarFilters).toHaveBeenCalledWith([
      { columnIndex: 0, op: "eq", value: "Bob" },
    ]);
    expect(invalidate).toHaveBeenCalled();
  });

  it("setColumnFilters with op passes op to WASM", () => {
    const { result } = renderHook(() =>
      useFiltering({ engine, columnRegistry: registry, invalidate }),
    );

    act(() => result.current.setColumnFilters([{ id: "age", value: 30, op: "gte" }]));
    expect(engine.setColumnarFilters).toHaveBeenCalledWith([
      { columnIndex: 1, op: "gte", value: 30 },
    ]);
  });

  it("setColumnFilters skips unknown column IDs", () => {
    const { result } = renderHook(() =>
      useFiltering({ engine, columnRegistry: registry, invalidate }),
    );

    act(() =>
      result.current.setColumnFilters([
        { id: "name", value: "A" },
        { id: "unknown", value: "X" },
      ]),
    );
    expect(engine.setColumnarFilters).toHaveBeenCalledWith([
      { columnIndex: 0, op: "eq", value: "A" },
    ]);
  });

  it("setGlobalFilter updates internal state (uncontrolled)", () => {
    const { result } = renderHook(() =>
      useFiltering({ engine, columnRegistry: registry, invalidate }),
    );

    act(() => result.current.setGlobalFilter("test"));
    expect(result.current.globalFilter).toBe("test");
    expect(engine.setGlobalFilter).toHaveBeenCalledWith("test");
    expect(invalidate).toHaveBeenCalled();
  });

  it("setGlobalFilter passes null for empty string", () => {
    const { result } = renderHook(() =>
      useFiltering({ engine, columnRegistry: registry, invalidate }),
    );

    act(() => result.current.setGlobalFilter(""));
    expect(engine.setGlobalFilter).toHaveBeenCalledWith(null);
  });

  describe("controlled mode", () => {
    it("uses columnFiltersProp as source of truth", () => {
      const controlled = [{ id: "name", value: "Alice" }];
      const { result } = renderHook(() =>
        useFiltering({
          engine,
          columnRegistry: registry,
          invalidate,
          columnFiltersProp: controlled,
        }),
      );
      expect(result.current.columnFilters).toEqual(controlled);
    });

    it("uses globalFilterProp as source of truth", () => {
      const { result } = renderHook(() =>
        useFiltering({
          engine,
          columnRegistry: registry,
          invalidate,
          globalFilterProp: "search",
        }),
      );
      expect(result.current.globalFilter).toBe("search");
    });

    it("calls onColumnFiltersChange instead of internal setState", () => {
      const onChange = mock(() => {});
      const { result } = renderHook(() =>
        useFiltering({
          engine,
          columnRegistry: registry,
          invalidate,
          onColumnFiltersChange: onChange,
        }),
      );

      act(() => result.current.setColumnFilters([{ id: "name", value: "A" }]));
      expect(onChange).toHaveBeenCalledWith([{ id: "name", value: "A" }]);
    });

    it("calls onGlobalFilterChange instead of internal setState", () => {
      const onChange = mock(() => {});
      const { result } = renderHook(() =>
        useFiltering({
          engine,
          columnRegistry: registry,
          invalidate,
          onGlobalFilterChange: onChange,
        }),
      );

      act(() => result.current.setGlobalFilter("search"));
      expect(onChange).toHaveBeenCalledWith("search");
    });
  });

  describe("updater pattern (TanStack-compatible)", () => {
    it("onColumnFiltersChange receives resolved ColumnFiltersState", () => {
      const onChange = mock(() => {});
      const { result } = renderHook(() =>
        useFiltering({
          engine,
          columnRegistry: registry,
          invalidate,
          onColumnFiltersChange: onChange,
        }),
      );

      act(() => result.current.setColumnFilters([{ id: "name", value: "A" }]));
      const arg = onChange.mock.calls[0]![0];
      expect(Array.isArray(arg)).toBe(true);
      expect(arg).toEqual([{ id: "name", value: "A" }]);
    });
  });

  it("does nothing when engine is null", () => {
    const { result } = renderHook(() =>
      useFiltering({ engine: null, columnRegistry: registry, invalidate }),
    );

    act(() => result.current.setColumnFilters([{ id: "name", value: "A" }]));
    // No crash, no engine call
    expect(invalidate).not.toHaveBeenCalled();

    act(() => result.current.setGlobalFilter("test"));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
