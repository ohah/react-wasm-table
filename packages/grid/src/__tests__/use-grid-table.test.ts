/**
 * Tests for useGridTable hook logic.
 *
 * Since we don't have @testing-library/react or a DOM environment,
 * we test the hook's core logic through buildGridInstance directly.
 * The hook is a thin wrapper that adds React state management
 * (useState + useMemo + useCallback) around buildGridInstance.
 *
 * What useGridTable adds over buildGridInstance:
 * 1. Controlled vs uncontrolled sorting state resolution
 * 2. SortingUpdater function evaluation (function → direct value)
 * 3. onSortingChange callback routing
 * 4. Controlled vs uncontrolled filter state (columnFilters, globalFilter)
 *
 * We test these behaviors here using the same patterns.
 */
import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { buildGridInstance } from "../grid-instance";
import type {
  SortingState,
  SortingUpdater,
  ColumnFiltersState,
  ColumnFiltersUpdater,
  GridColumnDef,
} from "../tanstack-types";
import type { GridState } from "../grid-instance";

type Person = { name: string; age: number; status: string };
const helper = createColumnHelper<Person>();

const data: Person[] = [
  { name: "Alice", age: 30, status: "active" },
  { name: "Bob", age: 25, status: "inactive" },
  { name: "Charlie", age: 35, status: "active" },
];

const columns: GridColumnDef<Person, any>[] = [
  helper.accessor("name", { header: "Name", size: 150 }),
  helper.accessor("age", { header: "Age", size: 80, enableSorting: true }),
  helper.accessor("status", { header: "Status", size: 120, enableSorting: true }),
];

/**
 * Simulate the hook's controlled/uncontrolled state resolution logic:
 * - If controlledState.sorting is provided, use it
 * - Otherwise, use internalSorting (default from initialState)
 * - Same for columnFilters and globalFilter
 */
function simulateHookState(opts: {
  controlledSorting?: SortingState;
  controlledColumnFilters?: ColumnFiltersState;
  controlledGlobalFilter?: string;
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialGlobalFilter?: string;
  onSortingChange?: (updater: SortingUpdater) => void;
  onColumnFiltersChange?: (updater: ColumnFiltersUpdater) => void;
  onGlobalFilterChange?: (value: string) => void;
}) {
  let internalSorting: SortingState = opts.initialSorting ?? [];
  let internalColumnFilters: ColumnFiltersState = opts.initialColumnFilters ?? [];
  let internalGlobalFilter: string = opts.initialGlobalFilter ?? "";

  const sorting = opts.controlledSorting ?? internalSorting;
  const columnFilters = opts.controlledColumnFilters ?? internalColumnFilters;
  const globalFilter = opts.controlledGlobalFilter ?? internalGlobalFilter;

  const onSortingChange = (updater: SortingUpdater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (opts.onSortingChange) {
      opts.onSortingChange(next);
    } else {
      internalSorting = next;
    }
  };

  const onColumnFiltersChange = (updater: ColumnFiltersUpdater) => {
    const next = typeof updater === "function" ? updater(columnFilters) : updater;
    if (opts.onColumnFiltersChange) {
      opts.onColumnFiltersChange(next);
    } else {
      internalColumnFilters = next;
    }
  };

  const onGlobalFilterChange = (value: string) => {
    if (opts.onGlobalFilterChange) {
      opts.onGlobalFilterChange(value);
    } else {
      internalGlobalFilter = value;
    }
  };

  const state: GridState = { sorting, columnFilters, globalFilter };

  return {
    instance: buildGridInstance({
      data,
      columns,
      state,
      onSortingChange,
      onColumnFiltersChange,
      onGlobalFilterChange,
    }),
    getSorting: () => opts.controlledSorting ?? internalSorting,
    getColumnFilters: () => opts.controlledColumnFilters ?? internalColumnFilters,
    getGlobalFilter: () => opts.controlledGlobalFilter ?? internalGlobalFilter,
  };
}

describe("useGridTable state logic", () => {
  describe("uncontrolled mode", () => {
    it("defaults to empty sorting", () => {
      const { instance } = simulateHookState({});
      expect(instance.getState().sorting).toEqual([]);
    });

    it("uses initialState.sorting", () => {
      const { instance } = simulateHookState({
        initialSorting: [{ id: "age", desc: false }],
      });
      expect(instance.getState().sorting).toEqual([{ id: "age", desc: false }]);
    });

    it("toggleSorting updates internal state", () => {
      const { instance, getSorting } = simulateHookState({});
      instance.getColumn("age")!.toggleSorting();
      expect(getSorting()).toEqual([{ id: "age", desc: false }]);
    });

    it("setSorting updates internal state", () => {
      const { instance, getSorting } = simulateHookState({});
      instance.setSorting([{ id: "status", desc: true }]);
      expect(getSorting()).toEqual([{ id: "status", desc: true }]);
    });

    it("resetSorting clears to empty", () => {
      const { instance, getSorting } = simulateHookState({
        initialSorting: [{ id: "age", desc: true }],
      });
      instance.resetSorting();
      expect(getSorting()).toEqual([]);
    });
  });

  describe("controlled mode", () => {
    it("uses controlledSorting over initialSorting", () => {
      const { instance } = simulateHookState({
        controlledSorting: [{ id: "status", desc: false }],
        initialSorting: [{ id: "age", desc: true }],
      });
      expect(instance.getState().sorting).toEqual([{ id: "status", desc: false }]);
    });

    it("calls onSortingChange when toggle is invoked", () => {
      let captured: SortingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledSorting: [],
        onSortingChange: (updater) => {
          captured = updater;
        },
      });
      instance.getColumn("age")!.toggleSorting();
      expect(captured).toBeDefined();
      expect(captured).toEqual([{ id: "age", desc: false }]);
    });

    it("calls onSortingChange on setSorting", () => {
      let captured: SortingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledSorting: [],
        onSortingChange: (updater) => {
          captured = updater;
        },
      });
      instance.setSorting([{ id: "age", desc: true }]);
      expect(captured).toEqual([{ id: "age", desc: true }]);
    });

    it("calls onSortingChange on resetSorting", () => {
      let captured: SortingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledSorting: [{ id: "age", desc: false }],
        onSortingChange: (updater) => {
          captured = updater;
        },
      });
      instance.resetSorting();
      expect(captured).toEqual([]);
    });
  });

  describe("SortingUpdater function evaluation", () => {
    it("evaluates function updater with current state", () => {
      let captured: SortingState | undefined;
      simulateHookState({
        controlledSorting: [{ id: "age", desc: false }],
        onSortingChange: (v) => {
          captured = v;
        },
      }).instance.setSorting((prev: SortingState) => prev.map((s) => ({ ...s, desc: !s.desc })));
      expect(captured).toEqual([{ id: "age", desc: true }]);
    });

    it("evaluates function updater for uncontrolled mode", () => {
      const { instance, getSorting } = simulateHookState({
        initialSorting: [{ id: "age", desc: false }],
      });
      instance.setSorting((prev: SortingState) => [...prev, { id: "status", desc: true }]);
      expect(getSorting()).toEqual([
        { id: "age", desc: false },
        { id: "status", desc: true },
      ]);
    });
  });

  describe("grouped columns with hook", () => {
    it("handles grouped column definitions", () => {
      const grouped = [
        helper.group({
          header: "Info",
          columns: [
            helper.accessor("name", { header: "Name" }),
            helper.accessor("age", { header: "Age", enableSorting: true }),
          ],
        }),
        helper.accessor("status", { header: "Status" }),
      ];

      const instance = buildGridInstance({
        data,
        columns: grouped,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });

      expect(instance.getAllColumns()).toHaveLength(2);
      expect(instance.getAllLeafColumns()).toHaveLength(3);
      expect(instance.getColumn("name")).toBeDefined();
      expect(instance.getColumn("age")!.getCanSort()).toBe(true);
    });
  });

  // ── Filter state tests ────────────────────────────────────────────

  describe("filter state — uncontrolled", () => {
    it("defaults to empty columnFilters and globalFilter", () => {
      const { instance } = simulateHookState({});
      expect(instance.getState().columnFilters).toEqual([]);
      expect(instance.getState().globalFilter).toBe("");
    });

    it("uses initialState.columnFilters", () => {
      const { instance } = simulateHookState({
        initialColumnFilters: [{ id: "name", value: "Alice" }],
      });
      expect(instance.getState().columnFilters).toEqual([{ id: "name", value: "Alice" }]);
    });

    it("uses initialState.globalFilter", () => {
      const { instance } = simulateHookState({
        initialGlobalFilter: "search",
      });
      expect(instance.getState().globalFilter).toBe("search");
    });

    it("setColumnFilters updates internal state", () => {
      const { instance, getColumnFilters } = simulateHookState({});
      instance.setColumnFilters([{ id: "name", value: "Bob" }]);
      expect(getColumnFilters()).toEqual([{ id: "name", value: "Bob" }]);
    });

    it("setGlobalFilter updates internal state", () => {
      const { instance, getGlobalFilter } = simulateHookState({});
      instance.setGlobalFilter("test");
      expect(getGlobalFilter()).toBe("test");
    });

    it("resetColumnFilters clears to empty", () => {
      const { instance, getColumnFilters } = simulateHookState({
        initialColumnFilters: [{ id: "name", value: "Alice" }],
      });
      instance.resetColumnFilters();
      expect(getColumnFilters()).toEqual([]);
    });
  });

  describe("filter state — controlled", () => {
    it("uses controlledColumnFilters over initial", () => {
      const { instance } = simulateHookState({
        controlledColumnFilters: [{ id: "name", value: "Alice" }],
        initialColumnFilters: [{ id: "age", value: 30 }],
      });
      expect(instance.getState().columnFilters).toEqual([{ id: "name", value: "Alice" }]);
    });

    it("uses controlledGlobalFilter over initial", () => {
      const { instance } = simulateHookState({
        controlledGlobalFilter: "controlled",
        initialGlobalFilter: "initial",
      });
      expect(instance.getState().globalFilter).toBe("controlled");
    });

    it("calls onColumnFiltersChange on setColumnFilters", () => {
      let captured: ColumnFiltersUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnFilters: [],
        onColumnFiltersChange: (u) => {
          captured = u;
        },
      });
      instance.setColumnFilters([{ id: "name", value: "A" }]);
      expect(captured).toEqual([{ id: "name", value: "A" }]);
    });

    it("calls onGlobalFilterChange on setGlobalFilter", () => {
      let captured: string | undefined;
      const { instance } = simulateHookState({
        controlledGlobalFilter: "",
        onGlobalFilterChange: (v) => {
          captured = v;
        },
      });
      instance.setGlobalFilter("test");
      expect(captured).toBe("test");
    });

    it("calls onColumnFiltersChange on resetColumnFilters", () => {
      let captured: ColumnFiltersUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnFilters: [{ id: "name", value: "A" }],
        onColumnFiltersChange: (u) => {
          captured = u;
        },
      });
      instance.resetColumnFilters();
      expect(captured).toEqual([]);
    });
  });

  describe("ColumnFiltersUpdater function evaluation", () => {
    it("evaluates function updater with current state", () => {
      let captured: ColumnFiltersState | undefined;
      simulateHookState({
        controlledColumnFilters: [{ id: "name", value: "A" }],
        onColumnFiltersChange: (v) => {
          captured = v;
        },
      }).instance.setColumnFilters((prev: ColumnFiltersState) => [
        ...prev,
        { id: "age", value: 30 },
      ]);
      expect(captured).toEqual([
        { id: "name", value: "A" },
        { id: "age", value: 30 },
      ]);
    });
  });

  // ── Row model tests ───────────────────────────────────────────────

  describe("row model", () => {
    it("getCoreRowModel returns all data", () => {
      const { instance } = simulateHookState({});
      const model = instance.getCoreRowModel();
      expect(model.rowCount).toBe(3);
      expect(model.rows[0]!.original.name).toBe("Alice");
    });

    it("getRowModel returns all data when no viewIndices", () => {
      const { instance } = simulateHookState({});
      const model = instance.getRowModel();
      expect(model.rowCount).toBe(3);
    });

    it("getRow returns a row by view index", () => {
      const { instance } = simulateHookState({});
      const row = instance.getRow(1);
      expect(row.original.name).toBe("Bob");
      expect(row.getValue("age")).toBe(25);
    });

    it("getRow throws for out-of-bounds", () => {
      const { instance } = simulateHookState({});
      expect(() => instance.getRow(99)).toThrow(RangeError);
    });
  });
});
