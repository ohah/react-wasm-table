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
  ExpandedState,
  ExpandedUpdater,
} from "../tanstack-types";
import type { GridState } from "../grid-instance";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  status: string;
};

const helper = createColumnHelper<Person>();

const sampleData: Person[] = [
  { firstName: "Alice", lastName: "Smith", age: 30, status: "active" },
  { firstName: "Bob", lastName: "Jones", age: 25, status: "inactive" },
  { firstName: "Charlie", lastName: "Brown", age: 35, status: "active" },
  { firstName: "Dave", lastName: "Wilson", age: 28, status: "pending" },
];

function createInstance(sorting: SortingState = [], stateOverrides?: Partial<GridState>) {
  let currentSorting = sorting;
  let currentColumnFilters: ColumnFiltersState = stateOverrides?.columnFilters ?? [];
  let currentVisibility: ColumnVisibilityState = stateOverrides?.columnVisibility ?? {};
  let currentSizing: ColumnSizingState = stateOverrides?.columnSizing ?? {};
  let currentSizingInfo: ColumnSizingInfoState = stateOverrides?.columnSizingInfo ?? {
    startOffset: null,
    startSize: null,
    deltaOffset: 0,
    deltaPercentage: 0,
    isResizingColumn: false,
    columnSizingStart: [],
  };
  let currentPinning: ColumnPinningState = stateOverrides?.columnPinning ?? { left: [], right: [] };

  const onSortingChange = (updater: SortingUpdater) => {
    currentSorting = typeof updater === "function" ? updater(currentSorting) : updater;
  };
  const onColumnFiltersChange = (updater: ColumnFiltersUpdater) => {
    currentColumnFilters = typeof updater === "function" ? updater(currentColumnFilters) : updater;
  };
  const onColumnVisibilityChange = (updater: ColumnVisibilityUpdater) => {
    currentVisibility = typeof updater === "function" ? updater(currentVisibility) : updater;
  };
  const onColumnSizingChange = (updater: ColumnSizingUpdater) => {
    currentSizing = typeof updater === "function" ? updater(currentSizing) : updater;
  };
  const onColumnSizingInfoChange = (updater: ColumnSizingInfoUpdater) => {
    currentSizingInfo = typeof updater === "function" ? updater(currentSizingInfo) : updater;
  };
  const onColumnPinningChange = (updater: ColumnPinningUpdater) => {
    currentPinning = typeof updater === "function" ? updater(currentPinning) : updater;
  };

  const columns = [
    helper.accessor("firstName", { header: "First", size: 150 }),
    helper.accessor("lastName", { header: "Last", size: 150 }),
    helper.accessor("age", {
      header: "Age",
      size: 80,
      enableSorting: true,
    }),
    helper.accessor("status", {
      header: "Status",
      size: 120,
      enableSorting: true,
    }),
  ];

  return {
    instance: buildGridInstance({
      data: sampleData,
      columns,
      state: {
        sorting: currentSorting,
        columnFilters: currentColumnFilters,
        globalFilter: stateOverrides?.globalFilter ?? "",
        columnVisibility: currentVisibility,
        columnSizing: currentSizing,
        columnSizingInfo: currentSizingInfo,
        columnPinning: currentPinning,
      },
      onSortingChange,
      onColumnFiltersChange,
      onGlobalFilterChange: () => {},
      onColumnVisibilityChange,
      onColumnSizingChange,
      onColumnSizingInfoChange,
      onColumnPinningChange,
    }),
    getSorting: () => currentSorting,
    getColumnFilters: () => currentColumnFilters,
    getVisibility: () => currentVisibility,
    getSizing: () => currentSizing,
    getSizingInfo: () => currentSizingInfo,
    getPinning: () => currentPinning,
  };
}

describe("GridInstance", () => {
  describe("getState", () => {
    it("returns initial state", () => {
      const { instance } = createInstance();
      expect(instance.getState().sorting).toEqual([]);
    });

    it("returns provided sorting state", () => {
      const sorting = [{ id: "age", desc: false }];
      const { instance } = createInstance(sorting);
      expect(instance.getState().sorting).toEqual(sorting);
    });
  });

  describe("getAllColumns", () => {
    it("returns all column instances", () => {
      const { instance } = createInstance();
      const cols = instance.getAllColumns();
      expect(cols).toHaveLength(4);
      expect(cols[0]!.id).toBe("firstName");
      expect(cols[3]!.id).toBe("status");
    });
  });

  describe("getAllLeafColumns", () => {
    it("returns leaf columns for flat definitions", () => {
      const { instance } = createInstance();
      expect(instance.getAllLeafColumns()).toHaveLength(4);
    });

    it("returns leaf columns for grouped definitions", () => {
      const columns = [
        helper.group({
          header: "Name",
          columns: [
            helper.accessor("firstName", { header: "First" }),
            helper.accessor("lastName", { header: "Last" }),
          ],
        }),
        helper.accessor("age", { header: "Age", enableSorting: true }),
      ];

      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });

      expect(instance.getAllColumns()).toHaveLength(2); // group + age
      expect(instance.getAllLeafColumns()).toHaveLength(3); // first + last + age
    });
  });

  describe("getColumn", () => {
    it("finds a column by ID", () => {
      const { instance } = createInstance();
      const col = instance.getColumn("age");
      expect(col).toBeDefined();
      expect(col!.id).toBe("age");
    });

    it("returns undefined for unknown ID", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("unknown")).toBeUndefined();
    });
  });

  describe("GridColumn methods", () => {
    it("getSize returns the column size", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getSize()).toBe(150);
      expect(instance.getColumn("age")!.getSize()).toBe(80);
    });

    it("getCanSort reflects enableSorting", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getCanSort()).toBe(false);
      expect(instance.getColumn("age")!.getCanSort()).toBe(true);
    });

    it("getIsSorted returns false when not sorted", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("age")!.getIsSorted()).toBe(false);
    });

    it("getIsSorted returns 'asc' or 'desc'", () => {
      const { instance } = createInstance([{ id: "age", desc: false }]);
      expect(instance.getColumn("age")!.getIsSorted()).toBe("asc");

      const { instance: i2 } = createInstance([{ id: "age", desc: true }]);
      expect(i2.getColumn("age")!.getIsSorted()).toBe("desc");
    });

    it("toggleSorting cycles asc → desc → off", () => {
      const { instance, getSorting } = createInstance();
      const col = instance.getColumn("age")!;

      // First toggle: asc
      col.toggleSorting();
      expect(getSorting()).toEqual([{ id: "age", desc: false }]);

      // Rebuild instance with new state to test cycle
      const { instance: i2, getSorting: gs2 } = createInstance([{ id: "age", desc: false }]);
      i2.getColumn("age")!.toggleSorting();
      expect(gs2()).toEqual([{ id: "age", desc: true }]);

      // desc → remove
      const { instance: i3, getSorting: gs3 } = createInstance([{ id: "age", desc: true }]);
      i3.getColumn("age")!.toggleSorting();
      expect(gs3()).toEqual([]);
    });

    it("toggleSorting with explicit desc", () => {
      const { instance, getSorting } = createInstance();
      instance.getColumn("age")!.toggleSorting(true);
      expect(getSorting()).toEqual([{ id: "age", desc: true }]);
    });

    it("getToggleSortingHandler returns a callable handler", () => {
      const { instance, getSorting } = createInstance();
      const handler = instance.getColumn("age")!.getToggleSortingHandler();
      expect(typeof handler).toBe("function");
      handler({});
      expect(getSorting()).toEqual([{ id: "age", desc: false }]);
    });

    it("getIsSorted checks state regardless of enableSorting", () => {
      // Even if enableSorting is not set, getIsSorted reports state
      // (TanStack behavior: getIsSorted reads state, getCanSort gates UI)
      const { instance } = createInstance([{ id: "firstName", desc: false }]);
      expect(instance.getColumn("firstName")!.getIsSorted()).toBe("asc");
      expect(instance.getColumn("firstName")!.getCanSort()).toBe(false);
    });

    it("getSize returns default 150 when no size specified", () => {
      const columns = [
        helper.accessor("firstName", { header: "First" }), // no size
      ];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      expect(instance.getColumn("firstName")!.getSize()).toBe(150);
    });
  });

  describe("multi-column sorting", () => {
    it("setSorting with multiple columns", () => {
      const { instance, getSorting } = createInstance();
      instance.setSorting([
        { id: "age", desc: false },
        { id: "status", desc: true },
      ]);
      expect(getSorting()).toEqual([
        { id: "age", desc: false },
        { id: "status", desc: true },
      ]);
    });

    it("toggleSorting replaces all sort entries with single column", () => {
      const { instance: i2, getSorting: gs2 } = createInstance([
        { id: "age", desc: false },
        { id: "status", desc: true },
      ]);
      i2.getColumn("age")!.toggleSorting();
      // toggleSorting should set [{ id: "age", desc: true }] (cycle asc→desc)
      expect(gs2()).toEqual([{ id: "age", desc: true }]);
    });
  });

  describe("group column instances", () => {
    it("builds group columns with children and depth", () => {
      const columns = [
        helper.group({
          header: "Name",
          columns: [
            helper.accessor("firstName", { header: "First", enableSorting: true }),
            helper.accessor("lastName", { header: "Last" }),
          ],
        }),
        helper.accessor("age", { header: "Age", size: 80 }),
      ];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });

      const allCols = instance.getAllColumns();
      expect(allCols).toHaveLength(2); // group + age

      // Group column
      const group = allCols[0]!;
      expect(group.columns).toHaveLength(2);
      expect(group.depth).toBe(0);

      // Children
      expect(group.columns[0]!.id).toBe("firstName");
      expect(group.columns[0]!.depth).toBe(1);
      expect(group.columns[0]!.parent).toBe(group);

      // Leaf columns
      expect(instance.getAllLeafColumns()).toHaveLength(3);
    });

    it("group column getCanSort returns false", () => {
      const columns = [
        helper.group({
          header: "Info",
          columns: [helper.accessor("firstName", { header: "First" })],
        }),
      ];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });

      // Group column itself is not sortable
      expect(instance.getAllColumns()[0]!.getCanSort()).toBe(false);
    });
  });

  describe("setSorting / resetSorting", () => {
    it("setSorting sets sorting state", () => {
      const { instance, getSorting } = createInstance();
      instance.setSorting([{ id: "status", desc: false }]);
      expect(getSorting()).toEqual([{ id: "status", desc: false }]);
    });

    it("resetSorting clears sorting", () => {
      const { instance, getSorting } = createInstance([{ id: "age", desc: true }]);
      instance.resetSorting();
      expect(getSorting()).toEqual([]);
    });
  });

  describe("filter methods", () => {
    it("setColumnFilters calls onColumnFiltersChange", () => {
      let captured: ColumnFiltersUpdater | undefined;
      const columns = [
        helper.accessor("firstName", { header: "First" }),
        helper.accessor("age", { header: "Age" }),
      ];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: (u) => {
          captured = u;
        },
        onGlobalFilterChange: () => {},
      });
      instance.setColumnFilters([{ id: "firstName", value: "Alice" }]);
      expect(captured).toEqual([{ id: "firstName", value: "Alice" }]);
    });

    it("setGlobalFilter calls onGlobalFilterChange", () => {
      let captured: string | undefined;
      const columns = [helper.accessor("firstName", { header: "First" })];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: (v) => {
          captured = v;
        },
      });
      instance.setGlobalFilter("test");
      expect(captured).toBe("test");
    });

    it("resetColumnFilters calls onColumnFiltersChange with empty array", () => {
      let captured: ColumnFiltersUpdater | undefined;
      const columns = [helper.accessor("firstName", { header: "First" })];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [{ id: "firstName", value: "A" }], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: (u) => {
          captured = u;
        },
        onGlobalFilterChange: () => {},
      });
      instance.resetColumnFilters();
      expect(captured).toEqual([]);
    });
  });

  describe("row model", () => {
    it("getCoreRowModel returns all data in original order", () => {
      const { instance } = createInstance();
      const model = instance.getCoreRowModel();
      expect(model.rowCount).toBe(4);
      expect(model.rows[0]!.original.firstName).toBe("Alice");
      expect(model.rows[3]!.original.firstName).toBe("Dave");
    });

    it("getRowModel with no viewIndices returns all data", () => {
      const { instance } = createInstance();
      const model = instance.getRowModel();
      expect(model.rowCount).toBe(4);
    });

    it("getRowModel with viewIndices returns filtered view", () => {
      const columns = [
        helper.accessor("firstName", { header: "First" }),
        helper.accessor("age", { header: "Age" }),
      ];
      const indices = new Uint32Array([2, 0]); // Charlie, Alice
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
        viewIndices: indices,
      });
      const model = instance.getRowModel();
      expect(model.rowCount).toBe(2);
      expect(model.rows[0]!.original.firstName).toBe("Charlie");
      expect(model.rows[1]!.original.firstName).toBe("Alice");
    });

    it("getRow returns row at view index", () => {
      const { instance } = createInstance();
      const row = instance.getRow(1);
      expect(row.original.firstName).toBe("Bob");
      expect(row.getValue("age")).toBe(25);
    });

    it("getRow throws for out-of-bounds", () => {
      const { instance } = createInstance();
      expect(() => instance.getRow(99)).toThrow(RangeError);
    });

    it("getCoreRowModel is cached", () => {
      const { instance } = createInstance();
      const first = instance.getCoreRowModel();
      const second = instance.getCoreRowModel();
      expect(first).toBe(second);
    });

    it("getRowModel is cached", () => {
      const { instance } = createInstance();
      const first = instance.getRowModel();
      const second = instance.getRowModel();
      expect(first).toBe(second);
    });
  });

  describe("getState includes filter fields", () => {
    it("includes columnFilters and globalFilter", () => {
      const columns = [helper.accessor("firstName", { header: "First" })];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: {
          sorting: [],
          columnFilters: [{ id: "firstName", value: "Alice" }],
          globalFilter: "test",
        },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      expect(instance.getState().columnFilters).toEqual([{ id: "firstName", value: "Alice" }]);
      expect(instance.getState().globalFilter).toBe("test");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Column Filtering (per-column methods)
  // ══════════════════════════════════════════════════════════════════

  describe("column filtering (per-column)", () => {
    it("getCanFilter returns true for accessor columns by default", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getCanFilter()).toBe(true);
      expect(instance.getColumn("age")!.getCanFilter()).toBe(true);
    });

    it("getCanFilter returns false for display columns by default", () => {
      const columns = [{ id: "actions", header: "Actions" } as any];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      expect(instance.getColumn("actions")!.getCanFilter()).toBe(false);
    });

    it("getCanFilter respects enableColumnFilter: false", () => {
      const columns = [
        helper.accessor("firstName", { header: "First", enableColumnFilter: false }),
      ];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      expect(instance.getColumn("firstName")!.getCanFilter()).toBe(false);
    });

    it("getIsFiltered returns false when column is not filtered", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getIsFiltered()).toBe(false);
    });

    it("getIsFiltered returns true when column has active filter", () => {
      const { instance } = createInstance([], {
        columnFilters: [{ id: "firstName", value: "Alice" }],
      });
      expect(instance.getColumn("firstName")!.getIsFiltered()).toBe(true);
      expect(instance.getColumn("age")!.getIsFiltered()).toBe(false);
    });

    it("getFilterValue returns undefined when no filter set", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getFilterValue()).toBeUndefined();
    });

    it("getFilterValue returns current filter value", () => {
      const { instance } = createInstance([], {
        columnFilters: [{ id: "firstName", value: "Alice" }],
      });
      expect(instance.getColumn("firstName")!.getFilterValue()).toBe("Alice");
    });

    it("setFilterValue adds a new filter entry", () => {
      const { instance, getColumnFilters } = createInstance();
      instance.getColumn("firstName")!.setFilterValue("Bob");
      expect(getColumnFilters()).toEqual([{ id: "firstName", value: "Bob" }]);
    });

    it("setFilterValue updates existing filter entry", () => {
      const { instance, getColumnFilters } = createInstance([], {
        columnFilters: [{ id: "firstName", value: "Alice" }],
      });
      instance.getColumn("firstName")!.setFilterValue("Bob");
      expect(getColumnFilters()).toEqual([{ id: "firstName", value: "Bob" }]);
    });

    it("resetFilterValue removes filter for that column", () => {
      const { instance, getColumnFilters } = createInstance([], {
        columnFilters: [
          { id: "firstName", value: "Alice" },
          { id: "age", value: 30 },
        ],
      });
      instance.getColumn("firstName")!.resetFilterValue();
      expect(getColumnFilters()).toEqual([{ id: "age", value: 30 }]);
    });

    it("resetFilterValue on unfiltered column is no-op", () => {
      const { instance, getColumnFilters } = createInstance([], {
        columnFilters: [{ id: "age", value: 30 }],
      });
      instance.getColumn("firstName")!.resetFilterValue();
      expect(getColumnFilters()).toEqual([{ id: "age", value: 30 }]);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Column Visibility
  // ══════════════════════════════════════════════════════════════════

  describe("column visibility", () => {
    it("getCanHide returns true by default", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getCanHide()).toBe(true);
    });

    it("getCanHide returns false when enableHiding: false", () => {
      const columns = [helper.accessor("firstName", { header: "First", enableHiding: false })];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      expect(instance.getColumn("firstName")!.getCanHide()).toBe(false);
    });

    it("getIsVisible returns true by default", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getIsVisible()).toBe(true);
    });

    it("getIsVisible returns false when column is hidden", () => {
      const { instance } = createInstance([], { columnVisibility: { firstName: false } });
      expect(instance.getColumn("firstName")!.getIsVisible()).toBe(false);
      expect(instance.getColumn("lastName")!.getIsVisible()).toBe(true);
    });

    it("toggleVisibility hides a visible column", () => {
      const { instance, getVisibility } = createInstance();
      instance.getColumn("firstName")!.toggleVisibility();
      expect(getVisibility()).toEqual({ firstName: false });
    });

    it("toggleVisibility shows a hidden column", () => {
      const { instance, getVisibility } = createInstance([], {
        columnVisibility: { firstName: false },
      });
      instance.getColumn("firstName")!.toggleVisibility();
      expect(getVisibility()).toEqual({ firstName: true });
    });

    it("toggleVisibility with explicit isVisible", () => {
      const { instance, getVisibility } = createInstance();
      instance.getColumn("firstName")!.toggleVisibility(false);
      expect(getVisibility()).toEqual({ firstName: false });
    });

    it("setColumnVisibility sets state directly", () => {
      const { instance, getVisibility } = createInstance();
      instance.setColumnVisibility({ firstName: false, lastName: false });
      expect(getVisibility()).toEqual({ firstName: false, lastName: false });
    });

    it("resetColumnVisibility resets to empty (all visible)", () => {
      const { instance, getVisibility } = createInstance([], {
        columnVisibility: { firstName: false },
      });
      instance.resetColumnVisibility();
      expect(getVisibility()).toEqual({});
    });

    it("getVisibleLeafColumns excludes hidden columns", () => {
      const { instance } = createInstance([], {
        columnVisibility: { firstName: false, status: false },
      });
      const visible = instance.getVisibleLeafColumns();
      expect(visible).toHaveLength(2);
      expect(visible.map((c) => c.id)).toEqual(["lastName", "age"]);
    });

    it("getVisibleLeafColumns returns all when none hidden", () => {
      const { instance } = createInstance();
      expect(instance.getVisibleLeafColumns()).toHaveLength(4);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Column Resizing
  // ══════════════════════════════════════════════════════════════════

  describe("column resizing", () => {
    it("getCanResize returns true by default", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getCanResize()).toBe(true);
    });

    it("getCanResize returns false when enableResizing: false", () => {
      const columns = [helper.accessor("firstName", { header: "First", enableResizing: false })];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      expect(instance.getColumn("firstName")!.getCanResize()).toBe(false);
    });

    it("getSize uses columnSizing override", () => {
      const { instance } = createInstance([], { columnSizing: { firstName: 200 } });
      expect(instance.getColumn("firstName")!.getSize()).toBe(200);
      // Others use def.size
      expect(instance.getColumn("lastName")!.getSize()).toBe(150);
    });

    it("getSize falls back to def.size when no sizing override", () => {
      const { instance } = createInstance([], { columnSizing: {} });
      expect(instance.getColumn("age")!.getSize()).toBe(80);
    });

    it("getIsResizing returns false when not resizing", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getIsResizing()).toBe(false);
    });

    it("getIsResizing returns true when column is being resized", () => {
      const { instance } = createInstance([], {
        columnSizingInfo: {
          startOffset: 150,
          startSize: 150,
          deltaOffset: 20,
          deltaPercentage: 0,
          isResizingColumn: "firstName",
          columnSizingStart: [["firstName", 150]],
        },
      });
      expect(instance.getColumn("firstName")!.getIsResizing()).toBe(true);
      expect(instance.getColumn("lastName")!.getIsResizing()).toBe(false);
    });

    it("resetSize removes column from sizing state", () => {
      const { instance, getSizing } = createInstance([], {
        columnSizing: { firstName: 200, lastName: 180 },
      });
      instance.getColumn("firstName")!.resetSize();
      expect(getSizing()).toEqual({ lastName: 180 });
    });

    it("setColumnSizing sets state directly", () => {
      const { instance, getSizing } = createInstance();
      instance.setColumnSizing({ firstName: 250, age: 100 });
      expect(getSizing()).toEqual({ firstName: 250, age: 100 });
    });

    it("resetColumnSizing resets to empty", () => {
      const { instance, getSizing } = createInstance([], {
        columnSizing: { firstName: 200 },
      });
      instance.resetColumnSizing();
      expect(getSizing()).toEqual({});
    });

    it("setColumnSizingInfo sets drag state", () => {
      const { instance, getSizingInfo } = createInstance();
      const info: ColumnSizingInfoState = {
        startOffset: 100,
        startSize: 150,
        deltaOffset: 10,
        deltaPercentage: 0,
        isResizingColumn: "firstName",
        columnSizingStart: [["firstName", 150]],
      };
      instance.setColumnSizingInfo(info);
      expect(getSizingInfo()).toEqual(info);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Column Pinning
  // ══════════════════════════════════════════════════════════════════

  describe("column pinning", () => {
    it("getCanPin returns true by default", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getCanPin()).toBe(true);
    });

    it("getCanPin returns false when enablePinning: false", () => {
      const columns = [helper.accessor("firstName", { header: "First", enablePinning: false })];
      const instance = buildGridInstance({
        data: sampleData,
        columns,
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      expect(instance.getColumn("firstName")!.getCanPin()).toBe(false);
    });

    it("getIsPinned returns false when not pinned", () => {
      const { instance } = createInstance();
      expect(instance.getColumn("firstName")!.getIsPinned()).toBe(false);
    });

    it("getIsPinned returns 'left' when pinned left", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: ["firstName"], right: [] },
      });
      expect(instance.getColumn("firstName")!.getIsPinned()).toBe("left");
    });

    it("getIsPinned returns 'right' when pinned right", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: [], right: ["status"] },
      });
      expect(instance.getColumn("status")!.getIsPinned()).toBe("right");
    });

    it("pin adds column to left pinned array", () => {
      const { instance, getPinning } = createInstance();
      instance.getColumn("firstName")!.pin("left");
      expect(getPinning()).toEqual({ left: ["firstName"], right: [] });
    });

    it("pin adds column to right pinned array", () => {
      const { instance, getPinning } = createInstance();
      instance.getColumn("status")!.pin("right");
      expect(getPinning()).toEqual({ left: [], right: ["status"] });
    });

    it("pin moves column from left to right", () => {
      const { instance, getPinning } = createInstance([], {
        columnPinning: { left: ["firstName"], right: [] },
      });
      instance.getColumn("firstName")!.pin("right");
      expect(getPinning()).toEqual({ left: [], right: ["firstName"] });
    });

    it("pin moves column from right to left", () => {
      const { instance, getPinning } = createInstance([], {
        columnPinning: { left: [], right: ["status"] },
      });
      instance.getColumn("status")!.pin("left");
      expect(getPinning()).toEqual({ left: ["status"], right: [] });
    });

    it("unpin removes column from both arrays", () => {
      const { instance, getPinning } = createInstance([], {
        columnPinning: { left: ["firstName"], right: ["status"] },
      });
      instance.getColumn("firstName")!.unpin();
      expect(getPinning()).toEqual({ left: [], right: ["status"] });
    });

    it("getPinnedIndex returns index in pinned group", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: ["firstName", "lastName"], right: ["status"] },
      });
      expect(instance.getColumn("firstName")!.getPinnedIndex()).toBe(0);
      expect(instance.getColumn("lastName")!.getPinnedIndex()).toBe(1);
      expect(instance.getColumn("status")!.getPinnedIndex()).toBe(0);
      expect(instance.getColumn("age")!.getPinnedIndex()).toBe(-1);
    });

    it("setColumnPinning sets state directly", () => {
      const { instance, getPinning } = createInstance();
      instance.setColumnPinning({ left: ["firstName"], right: ["status"] });
      expect(getPinning()).toEqual({ left: ["firstName"], right: ["status"] });
    });

    it("resetColumnPinning resets to empty", () => {
      const { instance, getPinning } = createInstance([], {
        columnPinning: { left: ["firstName"], right: ["status"] },
      });
      instance.resetColumnPinning();
      expect(getPinning()).toEqual({ left: [], right: [] });
    });

    it("getLeftLeafColumns returns left-pinned visible columns", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: ["firstName", "lastName"], right: [] },
      });
      const left = instance.getLeftLeafColumns();
      expect(left.map((c) => c.id)).toEqual(["firstName", "lastName"]);
    });

    it("getRightLeafColumns returns right-pinned visible columns", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: [], right: ["status"] },
      });
      const right = instance.getRightLeafColumns();
      expect(right.map((c) => c.id)).toEqual(["status"]);
    });

    it("getCenterLeafColumns returns unpinned visible columns", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: ["firstName"], right: ["status"] },
      });
      const center = instance.getCenterLeafColumns();
      expect(center.map((c) => c.id)).toEqual(["lastName", "age"]);
    });

    it("getLeftLeafColumns excludes hidden columns", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: ["firstName", "lastName"], right: [] },
        columnVisibility: { firstName: false },
      });
      const left = instance.getLeftLeafColumns();
      expect(left.map((c) => c.id)).toEqual(["lastName"]);
    });

    it("getCenterLeafColumns excludes hidden columns", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: ["firstName"], right: ["status"] },
        columnVisibility: { age: false },
      });
      const center = instance.getCenterLeafColumns();
      expect(center.map((c) => c.id)).toEqual(["lastName"]);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // getState includes new fields
  // ══════════════════════════════════════════════════════════════════

  describe("getState includes new feature fields", () => {
    it("includes columnVisibility", () => {
      const { instance } = createInstance([], { columnVisibility: { firstName: false } });
      expect(instance.getState().columnVisibility).toEqual({ firstName: false });
    });

    it("includes columnSizing", () => {
      const { instance } = createInstance([], { columnSizing: { firstName: 200 } });
      expect(instance.getState().columnSizing).toEqual({ firstName: 200 });
    });

    it("includes columnPinning", () => {
      const { instance } = createInstance([], {
        columnPinning: { left: ["firstName"], right: [] },
      });
      expect(instance.getState().columnPinning).toEqual({ left: ["firstName"], right: [] });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Expanding
  // ══════════════════════════════════════════════════════════════════

  describe("expanding", () => {
    type TreePerson = Person & { children?: TreePerson[] };
    const treeHelper = createColumnHelper<TreePerson>();
    const treeData: TreePerson[] = [
      {
        firstName: "Alice",
        lastName: "Smith",
        age: 30,
        status: "active",
        children: [
          { firstName: "Bob", lastName: "Jones", age: 25, status: "inactive" },
          { firstName: "Charlie", lastName: "Brown", age: 35, status: "active" },
        ],
      },
      { firstName: "Dave", lastName: "Wilson", age: 28, status: "pending" },
    ];
    const treeColumns = [
      treeHelper.accessor("firstName", { header: "First", size: 150 }),
      treeHelper.accessor("age", { header: "Age", size: 80 }),
    ];
    const getSubRows = (row: TreePerson) => row.children;

    function createExpandInstance(expanded: ExpandedState = {}) {
      let currentExpanded = expanded;
      const onExpandedChange = (updater: ExpandedUpdater) => {
        currentExpanded = typeof updater === "function" ? updater(currentExpanded) : updater;
      };
      const instance = buildGridInstance({
        data: treeData,
        columns: treeColumns,
        state: { sorting: [], columnFilters: [], globalFilter: "", expanded: currentExpanded },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
        onExpandedChange,
        getSubRows,
      });
      return { instance, getExpanded: () => currentExpanded };
    }

    it("getExpandedRowModel returns RowModel", () => {
      const { instance } = createExpandInstance();
      const model = instance.getExpandedRowModel();
      expect(model).toBeDefined();
      expect(model.rowCount).toBe(2); // collapsed → only root
    });

    it("getExpandedRowModel with expanded root shows children", () => {
      const { instance } = createExpandInstance({ "0": true });
      const model = instance.getExpandedRowModel();
      expect(model.rowCount).toBe(4);
      expect(model.rows.map((r) => r.original.firstName)).toEqual([
        "Alice",
        "Bob",
        "Charlie",
        "Dave",
      ]);
    });

    it("setExpanded calls onExpandedChange", () => {
      const { instance, getExpanded } = createExpandInstance();
      instance.setExpanded({ "0": true });
      expect(getExpanded()).toEqual({ "0": true });
    });

    it("resetExpanded clears to empty", () => {
      const { instance, getExpanded } = createExpandInstance({ "0": true });
      instance.resetExpanded();
      expect(getExpanded()).toEqual({});
    });

    it("toggleAllRowsExpanded sets expanded=true", () => {
      const { instance, getExpanded } = createExpandInstance();
      instance.toggleAllRowsExpanded();
      expect(getExpanded()).toBe(true);
    });

    it("toggleAllRowsExpanded(false) sets expanded={}", () => {
      const { instance, getExpanded } = createExpandInstance(true);
      instance.toggleAllRowsExpanded(false);
      expect(getExpanded()).toEqual({});
    });

    it("getIsAllRowsExpanded returns true when expanded=true", () => {
      const { instance } = createExpandInstance(true);
      expect(instance.getIsAllRowsExpanded()).toBe(true);
    });

    it("getIsAllRowsExpanded returns false when not all expandable rows are expanded", () => {
      // Only Alice is expandable in treeData, so { "0": true } means all expanded.
      // An empty record means Alice is collapsed.
      const { instance } = createExpandInstance({});
      expect(instance.getIsAllRowsExpanded()).toBe(false);
    });

    it("getExpandedRowModel without getSubRows returns core model", () => {
      const instance = buildGridInstance({
        data: sampleData,
        columns: [
          helper.accessor("firstName", { header: "First" }),
          helper.accessor("age", { header: "Age" }),
        ],
        state: { sorting: [], columnFilters: [], globalFilter: "" },
        onSortingChange: () => {},
        onColumnFiltersChange: () => {},
        onGlobalFilterChange: () => {},
      });
      const model = instance.getExpandedRowModel();
      expect(model.rowCount).toBe(4);
    });
  });
});
