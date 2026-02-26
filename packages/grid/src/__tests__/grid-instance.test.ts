import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import { buildGridInstance } from "../grid-instance";
import type { SortingState, SortingUpdater } from "../tanstack-types";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  status: string;
};

const helper = createColumnHelper<Person>();

function createInstance(sorting: SortingState = []) {
  let currentSorting = sorting;
  const onSortingChange = (updater: SortingUpdater) => {
    currentSorting =
      typeof updater === "function" ? updater(currentSorting) : updater;
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
      columns,
      state: { sorting: currentSorting },
      onSortingChange,
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
        columns,
        state: { sorting: [] },
        onSortingChange: () => {},
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
      const { instance: i2, getSorting: gs2 } = createInstance([
        { id: "age", desc: false },
      ]);
      i2.getColumn("age")!.toggleSorting();
      expect(gs2()).toEqual([{ id: "age", desc: true }]);

      // desc → remove
      const { instance: i3, getSorting: gs3 } = createInstance([
        { id: "age", desc: true },
      ]);
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
        columns,
        state: { sorting: [] },
        onSortingChange: () => {},
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
        columns,
        state: { sorting: [] },
        onSortingChange: () => {},
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
          columns: [
            helper.accessor("firstName", { header: "First" }),
          ],
        }),
      ];
      const instance = buildGridInstance({
        columns,
        state: { sorting: [] },
        onSortingChange: () => {},
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
      const { instance, getSorting } = createInstance([
        { id: "age", desc: true },
      ]);
      instance.resetSorting();
      expect(getSorting()).toEqual([]);
    });
  });
});
