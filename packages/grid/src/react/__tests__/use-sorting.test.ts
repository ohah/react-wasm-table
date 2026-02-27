import { describe, expect, it, mock, beforeEach } from "bun:test";
import { ColumnRegistry } from "../../adapter/column-registry";

/**
 * Test the sorting logic extracted into useSorting.
 * Since we don't have @testing-library/react, we test the core logic
 * by simulating what the hook does internally.
 */

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

/** Simulates the handleHeaderClick logic from useSorting */
function simulateHeaderClick(
  engine: any,
  registry: ColumnRegistry,
  sorting: { id: string; desc: boolean }[],
  colIndex: number,
  onSortingChange?: (s: any) => void,
  onBeforeSortChange?: (next: any) => boolean | void,
) {
  if (!engine) return { next: sorting, called: false };
  const columns = registry.getAll();
  const col = columns[colIndex];
  if (!col?.sortable) return { next: sorting, called: false };

  const existing = sorting.find((s) => s.id === col.id);
  let next: { id: string; desc: boolean }[];
  if (!existing) {
    next = [{ id: col.id, desc: false }];
  } else if (!existing.desc) {
    next = [{ id: col.id, desc: true }];
  } else {
    next = [];
  }

  if (onBeforeSortChange?.(next) === false) return { next: sorting, called: false, guarded: true };

  if (onSortingChange) {
    onSortingChange(next);
  }

  if (next.length > 0) {
    engine.setColumnarSort(
      next.map((s: any) => ({
        columnIndex: columns.findIndex((c) => c.id === s.id),
        direction: s.desc ? "desc" : "asc",
      })),
    );
  } else {
    engine.setColumnarSort([]);
  }

  return { next, called: true };
}

describe("useSorting logic", () => {
  let engine: ReturnType<typeof makeEngine>;
  let registry: ColumnRegistry;

  beforeEach(() => {
    engine = makeEngine();
    registry = makeRegistry([{ id: "name" }, { id: "age" }]);
  });

  it("cycles asc → desc → clear", () => {
    let sorting: { id: string; desc: boolean }[] = [];

    // Click col 0 → asc
    let result = simulateHeaderClick(engine, registry, sorting, 0);
    sorting = result.next;
    expect(sorting).toEqual([{ id: "name", desc: false }]);
    expect(engine.setColumnarSort).toHaveBeenCalledWith([{ columnIndex: 0, direction: "asc" }]);

    // Click col 0 → desc
    result = simulateHeaderClick(engine, registry, sorting, 0);
    sorting = result.next;
    expect(sorting).toEqual([{ id: "name", desc: true }]);
    expect(engine.setColumnarSort).toHaveBeenCalledWith([{ columnIndex: 0, direction: "desc" }]);

    // Click col 0 → clear
    result = simulateHeaderClick(engine, registry, sorting, 0);
    sorting = result.next;
    expect(sorting).toEqual([]);
    expect(engine.setColumnarSort).toHaveBeenCalledWith([]);
  });

  it("does nothing for non-sortable columns", () => {
    registry = makeRegistry([{ id: "name", sortable: false }]);
    const result = simulateHeaderClick(engine, registry, [], 0);
    expect(result.called).toBe(false);
    expect(engine.setColumnarSort).not.toHaveBeenCalled();
  });

  it("does nothing when engine is null", () => {
    const result = simulateHeaderClick(null, registry, [], 0);
    expect(result.called).toBe(false);
  });

  it("calls onSortingChange in controlled mode", () => {
    const onSortingChange = mock(() => {});
    simulateHeaderClick(engine, registry, [], 0, onSortingChange);
    expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: false }]);
  });

  it("switches columns on different col click", () => {
    let sorting: { id: string; desc: boolean }[] = [];

    // Click col 0 → asc name
    let result = simulateHeaderClick(engine, registry, sorting, 0);
    sorting = result.next;
    expect(sorting).toEqual([{ id: "name", desc: false }]);

    // Click col 1 → asc age (replaces name)
    result = simulateHeaderClick(engine, registry, sorting, 1);
    sorting = result.next;
    expect(sorting).toEqual([{ id: "age", desc: false }]);
  });

  describe("onBeforeSortChange guard", () => {
    it("returning false prevents sort and engine call", () => {
      const guard = mock(() => false as const);
      const result = simulateHeaderClick(engine, registry, [], 0, undefined, guard);
      expect(result.guarded).toBe(true);
      expect(result.called).toBe(false);
      expect(engine.setColumnarSort).not.toHaveBeenCalled();
      expect(guard).toHaveBeenCalledWith([{ id: "name", desc: false }]);
    });

    it("returning undefined allows sort normally", () => {
      const guard = mock(() => undefined);
      const result = simulateHeaderClick(engine, registry, [], 0, undefined, guard);
      expect(result.called).toBe(true);
      expect(result.next).toEqual([{ id: "name", desc: false }]);
      expect(engine.setColumnarSort).toHaveBeenCalled();
    });

    it("receives correct next value", () => {
      const guard = mock(() => {});
      simulateHeaderClick(engine, registry, [{ id: "name", desc: false }], 0, undefined, guard);
      expect(guard).toHaveBeenCalledWith([{ id: "name", desc: true }]);
    });

    it("not called for non-sortable columns", () => {
      const guard = mock(() => false as const);
      registry = makeRegistry([{ id: "name", sortable: false }]);
      simulateHeaderClick(engine, registry, [], 0, undefined, guard);
      expect(guard).not.toHaveBeenCalled();
    });
  });
});
