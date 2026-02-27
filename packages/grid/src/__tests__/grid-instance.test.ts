import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { buildGridInstance } from "../grid-instance";
import type {
  SortingState,
  SortingUpdater,
  ColumnFiltersState,
  ColumnFiltersUpdater,
} from "../tanstack-types";

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

function createInstance(sorting: SortingState = []) {
  let currentSorting = sorting;
  const onSortingChange = (updater: SortingUpdater) => {
    currentSorting = typeof updater === "function" ? updater(currentSorting) : updater;
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
      state: { sorting: currentSorting, columnFilters: [], globalFilter: "" },
      onSortingChange,
      onColumnFiltersChange: () => {},
      onGlobalFilterChange: () => {},
    }),
    getSorting: () => currentSorting,
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
});
