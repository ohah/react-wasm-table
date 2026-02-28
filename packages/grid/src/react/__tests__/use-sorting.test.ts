import { describe, expect, it, mock, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useSorting } from "../hooks/use-sorting";
import { ColumnRegistry } from "../../adapter/column-registry";

function makeEngine() {
  return {
    setColumnarSort: mock(() => {}),
  } as any;
}

function makeRegistry(cols: { id: string; sortable?: boolean }[]) {
  const reg = new ColumnRegistry();
  reg.setAll(cols.map((c) => ({ id: c.id, sortable: c.sortable ?? true, width: 100 })) as any);
  return reg;
}

describe("useSorting (renderHook)", () => {
  let engine: ReturnType<typeof makeEngine>;
  let registry: ColumnRegistry;
  let invalidate: ReturnType<typeof mock>;

  beforeEach(() => {
    engine = makeEngine();
    registry = makeRegistry([{ id: "name" }, { id: "age" }]);
    invalidate = mock(() => {});
  });

  it("starts with empty sorting by default", () => {
    const { result } = renderHook(() =>
      useSorting({ engine, columnRegistry: registry, invalidate }),
    );
    expect(result.current.sorting).toEqual([]);
  });

  it("starts with initialSorting if provided", () => {
    const { result } = renderHook(() =>
      useSorting({
        engine,
        columnRegistry: registry,
        invalidate,
        initialSorting: [{ id: "name", desc: false }],
      }),
    );
    expect(result.current.sorting).toEqual([{ id: "name", desc: false }]);
  });

  it("cycles asc → desc → clear (uncontrolled)", () => {
    const { result } = renderHook(() =>
      useSorting({ engine, columnRegistry: registry, invalidate }),
    );

    // Click col 0 → asc
    act(() => result.current.handleHeaderClick(0));
    expect(result.current.sorting).toEqual([{ id: "name", desc: false }]);
    expect(engine.setColumnarSort).toHaveBeenCalledWith([{ columnIndex: 0, direction: "asc" }]);
    expect(invalidate).toHaveBeenCalled();

    // Click col 0 → desc
    act(() => result.current.handleHeaderClick(0));
    expect(result.current.sorting).toEqual([{ id: "name", desc: true }]);

    // Click col 0 → clear
    act(() => result.current.handleHeaderClick(0));
    expect(result.current.sorting).toEqual([]);
    expect(engine.setColumnarSort).toHaveBeenCalledWith([]);
  });

  it("switches columns on different col click", () => {
    const { result } = renderHook(() =>
      useSorting({ engine, columnRegistry: registry, invalidate }),
    );

    act(() => result.current.handleHeaderClick(0));
    expect(result.current.sorting).toEqual([{ id: "name", desc: false }]);

    act(() => result.current.handleHeaderClick(1));
    expect(result.current.sorting).toEqual([{ id: "age", desc: false }]);
  });

  it("does nothing for non-sortable columns", () => {
    const reg = makeRegistry([{ id: "name", sortable: false }]);
    const { result } = renderHook(() => useSorting({ engine, columnRegistry: reg, invalidate }));

    act(() => result.current.handleHeaderClick(0));
    expect(result.current.sorting).toEqual([]);
    expect(engine.setColumnarSort).not.toHaveBeenCalled();
  });

  it("does nothing when engine is null", () => {
    const { result } = renderHook(() =>
      useSorting({ engine: null, columnRegistry: registry, invalidate }),
    );

    act(() => result.current.handleHeaderClick(0));
    expect(result.current.sorting).toEqual([]);
  });

  describe("controlled mode (onSortingChange)", () => {
    it("calls onSortingChange instead of internal setState", () => {
      const onSortingChange = mock(() => {});
      const { result } = renderHook(() =>
        useSorting({ engine, columnRegistry: registry, invalidate, onSortingChange }),
      );

      act(() => result.current.handleHeaderClick(0));
      expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: false }]);
    });

    it("uses sortingProp as source of truth", () => {
      const { result } = renderHook(() =>
        useSorting({
          engine,
          columnRegistry: registry,
          invalidate,
          sortingProp: [{ id: "age", desc: true }],
        }),
      );

      expect(result.current.sorting).toEqual([{ id: "age", desc: true }]);
    });
  });

  describe("updater pattern (TanStack-compatible)", () => {
    it("onSortingChange receives resolved SortingState (direct value, not function)", () => {
      const onSortingChange = mock(() => {});
      const { result } = renderHook(() =>
        useSorting({ engine, columnRegistry: registry, invalidate, onSortingChange }),
      );

      act(() => result.current.handleHeaderClick(0));
      // The callback receives a direct SortingState value (which is a valid SortingUpdater)
      const arg = onSortingChange.mock.calls[0]![0];
      expect(Array.isArray(arg)).toBe(true);
      expect(arg).toEqual([{ id: "name", desc: false }]);
    });

    it("onSortingChange type accepts updater functions (type compatibility)", () => {
      // This test verifies that onSortingChange can receive both values and functions
      // (as per TanStack's SortingUpdater type)
      let captured: unknown = null;
      const onSortingChange = mock((updater: unknown) => {
        captured = updater;
      });
      const { result } = renderHook(() =>
        useSorting({ engine, columnRegistry: registry, invalidate, onSortingChange }),
      );

      act(() => result.current.handleHeaderClick(0));
      // useSorting always passes a resolved value, not a function updater
      expect(typeof captured).not.toBe("function");
      expect(captured).toEqual([{ id: "name", desc: false }]);
    });
  });

  describe("onBeforeSortChange guard", () => {
    it("returning false prevents sort", () => {
      const guard = mock(() => false as const);
      const { result } = renderHook(() =>
        useSorting({
          engine,
          columnRegistry: registry,
          invalidate,
          onBeforeSortChange: guard,
        }),
      );

      act(() => result.current.handleHeaderClick(0));
      expect(guard).toHaveBeenCalledWith([{ id: "name", desc: false }]);
      expect(result.current.sorting).toEqual([]);
      expect(engine.setColumnarSort).not.toHaveBeenCalled();
    });

    it("returning undefined allows sort", () => {
      const guard = mock(() => undefined);
      const { result } = renderHook(() =>
        useSorting({
          engine,
          columnRegistry: registry,
          invalidate,
          onBeforeSortChange: guard,
        }),
      );

      act(() => result.current.handleHeaderClick(0));
      expect(result.current.sorting).toEqual([{ id: "name", desc: false }]);
      expect(engine.setColumnarSort).toHaveBeenCalled();
    });
  });
});
