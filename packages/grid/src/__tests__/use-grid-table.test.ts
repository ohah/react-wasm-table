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
 * 5. Controlled vs uncontrolled columnVisibility state
 * 6. Controlled vs uncontrolled columnSizing / columnSizingInfo state
 * 7. Controlled vs uncontrolled columnPinning state
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
  ColumnVisibilityState,
  ColumnVisibilityUpdater,
  ColumnSizingState,
  ColumnSizingUpdater,
  ColumnSizingInfoState,
  ColumnSizingInfoUpdater,
  ColumnPinningState,
  ColumnPinningUpdater,
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

const DEFAULT_COLUMN_SIZING_INFO: ColumnSizingInfoState = {
  startOffset: null,
  startSize: null,
  deltaOffset: 0,
  deltaPercentage: 0,
  isResizingColumn: false,
  columnSizingStart: [],
};

/**
 * Simulate the hook's controlled/uncontrolled state resolution logic.
 */
function simulateHookState(opts: {
  controlledSorting?: SortingState;
  controlledColumnFilters?: ColumnFiltersState;
  controlledGlobalFilter?: string;
  controlledColumnVisibility?: ColumnVisibilityState;
  controlledColumnSizing?: ColumnSizingState;
  controlledColumnSizingInfo?: ColumnSizingInfoState;
  controlledColumnPinning?: ColumnPinningState;
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialGlobalFilter?: string;
  initialColumnVisibility?: ColumnVisibilityState;
  initialColumnSizing?: ColumnSizingState;
  initialColumnSizingInfo?: ColumnSizingInfoState;
  initialColumnPinning?: ColumnPinningState;
  onSortingChange?: (updater: SortingUpdater) => void;
  onColumnFiltersChange?: (updater: ColumnFiltersUpdater) => void;
  onGlobalFilterChange?: (value: string) => void;
  onColumnVisibilityChange?: (updater: ColumnVisibilityUpdater) => void;
  onColumnSizingChange?: (updater: ColumnSizingUpdater) => void;
  onColumnSizingInfoChange?: (updater: ColumnSizingInfoUpdater) => void;
  onColumnPinningChange?: (updater: ColumnPinningUpdater) => void;
}) {
  let internalSorting: SortingState = opts.initialSorting ?? [];
  let internalColumnFilters: ColumnFiltersState = opts.initialColumnFilters ?? [];
  let internalGlobalFilter: string = opts.initialGlobalFilter ?? "";
  let internalVisibility: ColumnVisibilityState = opts.initialColumnVisibility ?? {};
  let internalSizing: ColumnSizingState = opts.initialColumnSizing ?? {};
  let internalSizingInfo: ColumnSizingInfoState = opts.initialColumnSizingInfo ?? DEFAULT_COLUMN_SIZING_INFO;
  let internalPinning: ColumnPinningState = opts.initialColumnPinning ?? { left: [], right: [] };

  const sorting = opts.controlledSorting ?? internalSorting;
  const columnFilters = opts.controlledColumnFilters ?? internalColumnFilters;
  const globalFilter = opts.controlledGlobalFilter ?? internalGlobalFilter;
  const columnVisibility = opts.controlledColumnVisibility ?? internalVisibility;
  const columnSizing = opts.controlledColumnSizing ?? internalSizing;
  const columnSizingInfo = opts.controlledColumnSizingInfo ?? internalSizingInfo;
  const columnPinning = opts.controlledColumnPinning ?? internalPinning;

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

  const onColumnVisibilityChange = (updater: ColumnVisibilityUpdater) => {
    const next = typeof updater === "function" ? updater(columnVisibility) : updater;
    if (opts.onColumnVisibilityChange) {
      opts.onColumnVisibilityChange(next);
    } else {
      internalVisibility = next;
    }
  };

  const onColumnSizingChange = (updater: ColumnSizingUpdater) => {
    const next = typeof updater === "function" ? updater(columnSizing) : updater;
    if (opts.onColumnSizingChange) {
      opts.onColumnSizingChange(next);
    } else {
      internalSizing = next;
    }
  };

  const onColumnSizingInfoChange = (updater: ColumnSizingInfoUpdater) => {
    const next = typeof updater === "function" ? updater(columnSizingInfo) : updater;
    if (opts.onColumnSizingInfoChange) {
      opts.onColumnSizingInfoChange(next);
    } else {
      internalSizingInfo = next;
    }
  };

  const onColumnPinningChange = (updater: ColumnPinningUpdater) => {
    const next = typeof updater === "function" ? updater(columnPinning) : updater;
    if (opts.onColumnPinningChange) {
      opts.onColumnPinningChange(next);
    } else {
      internalPinning = next;
    }
  };

  const state: GridState = {
    sorting,
    columnFilters,
    globalFilter,
    columnVisibility,
    columnSizing,
    columnSizingInfo,
    columnPinning,
  };

  return {
    instance: buildGridInstance({
      data,
      columns,
      state,
      onSortingChange,
      onColumnFiltersChange,
      onGlobalFilterChange,
      onColumnVisibilityChange,
      onColumnSizingChange,
      onColumnSizingInfoChange,
      onColumnPinningChange,
    }),
    getSorting: () => opts.controlledSorting ?? internalSorting,
    getColumnFilters: () => opts.controlledColumnFilters ?? internalColumnFilters,
    getGlobalFilter: () => opts.controlledGlobalFilter ?? internalGlobalFilter,
    getVisibility: () => opts.controlledColumnVisibility ?? internalVisibility,
    getSizing: () => opts.controlledColumnSizing ?? internalSizing,
    getSizingInfo: () => opts.controlledColumnSizingInfo ?? internalSizingInfo,
    getPinning: () => opts.controlledColumnPinning ?? internalPinning,
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

  // ── Visibility state tests ─────────────────────────────────────────

  describe("visibility state — uncontrolled", () => {
    it("defaults to empty columnVisibility (all visible)", () => {
      const { instance } = simulateHookState({});
      expect(instance.getState().columnVisibility).toEqual({});
    });

    it("uses initialState.columnVisibility", () => {
      const { instance } = simulateHookState({
        initialColumnVisibility: { name: false },
      });
      expect(instance.getState().columnVisibility).toEqual({ name: false });
    });

    it("toggleVisibility updates internal state", () => {
      const { instance, getVisibility } = simulateHookState({});
      instance.getColumn("name")!.toggleVisibility();
      expect(getVisibility()).toEqual({ name: false });
    });

    it("setColumnVisibility updates internal state", () => {
      const { instance, getVisibility } = simulateHookState({});
      instance.setColumnVisibility({ name: false, age: false });
      expect(getVisibility()).toEqual({ name: false, age: false });
    });

    it("resetColumnVisibility clears to empty", () => {
      const { instance, getVisibility } = simulateHookState({
        initialColumnVisibility: { name: false },
      });
      instance.resetColumnVisibility();
      expect(getVisibility()).toEqual({});
    });
  });

  describe("visibility state — controlled", () => {
    it("uses controlledColumnVisibility over initial", () => {
      const { instance } = simulateHookState({
        controlledColumnVisibility: { name: false },
        initialColumnVisibility: { age: false },
      });
      expect(instance.getState().columnVisibility).toEqual({ name: false });
    });

    it("calls onColumnVisibilityChange on toggleVisibility", () => {
      let captured: ColumnVisibilityState | undefined;
      const { instance } = simulateHookState({
        controlledColumnVisibility: {},
        onColumnVisibilityChange: (u) => {
          captured = u;
        },
      });
      instance.getColumn("name")!.toggleVisibility();
      expect(captured).toEqual({ name: false });
    });

    it("calls onColumnVisibilityChange on setColumnVisibility", () => {
      let captured: ColumnVisibilityUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnVisibility: {},
        onColumnVisibilityChange: (u) => {
          captured = u;
        },
      });
      instance.setColumnVisibility({ name: false });
      expect(captured).toEqual({ name: false });
    });

    it("calls onColumnVisibilityChange on resetColumnVisibility", () => {
      let captured: ColumnVisibilityUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnVisibility: { name: false },
        onColumnVisibilityChange: (u) => {
          captured = u;
        },
      });
      instance.resetColumnVisibility();
      expect(captured).toEqual({});
    });
  });

  // ── Sizing state tests ────────────────────────────────────────────

  describe("sizing state — uncontrolled", () => {
    it("defaults to empty columnSizing", () => {
      const { instance } = simulateHookState({});
      expect(instance.getState().columnSizing).toEqual({});
    });

    it("uses initialState.columnSizing", () => {
      const { instance } = simulateHookState({
        initialColumnSizing: { name: 200 },
      });
      expect(instance.getState().columnSizing).toEqual({ name: 200 });
    });

    it("setColumnSizing updates internal state", () => {
      const { instance, getSizing } = simulateHookState({});
      instance.setColumnSizing({ name: 250 });
      expect(getSizing()).toEqual({ name: 250 });
    });

    it("resetColumnSizing clears to empty", () => {
      const { instance, getSizing } = simulateHookState({
        initialColumnSizing: { name: 200 },
      });
      instance.resetColumnSizing();
      expect(getSizing()).toEqual({});
    });

    it("resetSize removes specific column from sizing", () => {
      const { instance, getSizing } = simulateHookState({
        initialColumnSizing: { name: 200, age: 100 },
      });
      instance.getColumn("name")!.resetSize();
      expect(getSizing()).toEqual({ age: 100 });
    });
  });

  describe("sizing state — controlled", () => {
    it("uses controlledColumnSizing over initial", () => {
      const { instance } = simulateHookState({
        controlledColumnSizing: { name: 300 },
        initialColumnSizing: { name: 200 },
      });
      expect(instance.getState().columnSizing).toEqual({ name: 300 });
    });

    it("calls onColumnSizingChange on setColumnSizing", () => {
      let captured: ColumnSizingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnSizing: {},
        onColumnSizingChange: (u) => {
          captured = u;
        },
      });
      instance.setColumnSizing({ name: 250 });
      expect(captured).toEqual({ name: 250 });
    });

    it("calls onColumnSizingChange on resetColumnSizing", () => {
      let captured: ColumnSizingUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnSizing: { name: 200 },
        onColumnSizingChange: (u) => {
          captured = u;
        },
      });
      instance.resetColumnSizing();
      expect(captured).toEqual({});
    });
  });

  describe("sizing info state — controlled", () => {
    it("calls onColumnSizingInfoChange on setColumnSizingInfo", () => {
      let captured: ColumnSizingInfoUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnSizingInfo: DEFAULT_COLUMN_SIZING_INFO,
        onColumnSizingInfoChange: (u) => {
          captured = u;
        },
      });
      const info: ColumnSizingInfoState = {
        startOffset: 100,
        startSize: 150,
        deltaOffset: 10,
        deltaPercentage: 0,
        isResizingColumn: "name",
        columnSizingStart: [["name", 150]],
      };
      instance.setColumnSizingInfo(info);
      expect(captured).toEqual(info);
    });
  });

  // ── Pinning state tests ───────────────────────────────────────────

  describe("pinning state — uncontrolled", () => {
    it("defaults to empty columnPinning", () => {
      const { instance } = simulateHookState({});
      expect(instance.getState().columnPinning).toEqual({ left: [], right: [] });
    });

    it("uses initialState.columnPinning", () => {
      const { instance } = simulateHookState({
        initialColumnPinning: { left: ["name"], right: [] },
      });
      expect(instance.getState().columnPinning).toEqual({ left: ["name"], right: [] });
    });

    it("pin updates internal state", () => {
      const { instance, getPinning } = simulateHookState({});
      instance.getColumn("name")!.pin("left");
      expect(getPinning()).toEqual({ left: ["name"], right: [] });
    });

    it("unpin updates internal state", () => {
      const { instance, getPinning } = simulateHookState({
        initialColumnPinning: { left: ["name"], right: [] },
      });
      instance.getColumn("name")!.unpin();
      expect(getPinning()).toEqual({ left: [], right: [] });
    });

    it("setColumnPinning updates internal state", () => {
      const { instance, getPinning } = simulateHookState({});
      instance.setColumnPinning({ left: ["name"], right: ["status"] });
      expect(getPinning()).toEqual({ left: ["name"], right: ["status"] });
    });

    it("resetColumnPinning clears to empty", () => {
      const { instance, getPinning } = simulateHookState({
        initialColumnPinning: { left: ["name"], right: [] },
      });
      instance.resetColumnPinning();
      expect(getPinning()).toEqual({ left: [], right: [] });
    });
  });

  describe("pinning state — controlled", () => {
    it("uses controlledColumnPinning over initial", () => {
      const { instance } = simulateHookState({
        controlledColumnPinning: { left: ["status"], right: [] },
        initialColumnPinning: { left: ["name"], right: [] },
      });
      expect(instance.getState().columnPinning).toEqual({ left: ["status"], right: [] });
    });

    it("calls onColumnPinningChange on pin", () => {
      let captured: ColumnPinningState | undefined;
      const { instance } = simulateHookState({
        controlledColumnPinning: { left: [], right: [] },
        onColumnPinningChange: (u) => {
          captured = u;
        },
      });
      instance.getColumn("name")!.pin("left");
      expect(captured).toEqual({ left: ["name"], right: [] });
    });

    it("calls onColumnPinningChange on setColumnPinning", () => {
      let captured: ColumnPinningUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnPinning: { left: [], right: [] },
        onColumnPinningChange: (u) => {
          captured = u;
        },
      });
      instance.setColumnPinning({ left: ["name"], right: ["status"] });
      expect(captured).toEqual({ left: ["name"], right: ["status"] });
    });

    it("calls onColumnPinningChange on resetColumnPinning", () => {
      let captured: ColumnPinningUpdater | undefined;
      const { instance } = simulateHookState({
        controlledColumnPinning: { left: ["name"], right: [] },
        onColumnPinningChange: (u) => {
          captured = u;
        },
      });
      instance.resetColumnPinning();
      expect(captured).toEqual({ left: [], right: [] });
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
