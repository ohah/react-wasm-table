import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import {
  buildRow,
  buildRowModel,
  buildVirtualRowModel,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  buildExpandedRowModel,
  getPaginationRowModel,
  buildPaginationRowModel,
  getGroupedRowModel,
  buildGroupedRowModel,
  getFacetedRowModel,
  buildFacetedValues,
} from "../row-model";
import type { AggregationFn } from "../row-model";
import type { GridColumnDef, ExpandedState, ExpandedUpdater } from "../tanstack-types";

type Person = { name: string; age: number; status: string };
const helper = createColumnHelper<Person>();

const columns: GridColumnDef<Person, any>[] = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
  helper.accessor("status", { header: "Status" }),
];

const data: Person[] = [
  { name: "Alice", age: 30, status: "active" },
  { name: "Bob", age: 25, status: "inactive" },
  { name: "Charlie", age: 35, status: "active" },
  { name: "Dave", age: 28, status: "pending" },
];

describe("Row", () => {
  it("has correct id, index, and original reference", () => {
    const row = buildRow(data, 2, 0, columns);
    expect(row.id).toBe("2");
    expect(row.index).toBe(0);
    expect(row.original).toBe(data[2]!);
  });

  it("getValue returns the correct cell value", () => {
    const row = buildRow(data, 0, 0, columns);
    expect(row.getValue("name")).toBe("Alice");
    expect(row.getValue("age")).toBe(30);
    expect(row.getValue("status")).toBe("active");
  });

  it("getValue returns undefined for unknown column", () => {
    const row = buildRow(data, 0, 0, columns);
    expect(row.getValue("unknown")).toBeUndefined();
  });

  it("getAllCellValues returns all values", () => {
    const row = buildRow(data, 1, 0, columns);
    expect(row.getAllCellValues()).toEqual({
      name: "Bob",
      age: 25,
      status: "inactive",
    });
  });

  it("works with accessorFn columns", () => {
    const fnColumns: GridColumnDef<Person, any>[] = [
      helper.accessor((row) => `${row.name} (${row.age})`, {
        id: "display",
        header: "Display",
      }),
    ];
    const row = buildRow(data, 0, 0, fnColumns);
    expect(row.getValue("display")).toBe("Alice (30)");
  });
});

describe("RowModel", () => {
  it("has correct rowCount", () => {
    const model = buildRowModel(data, null, columns);
    expect(model.rowCount).toBe(4);
  });

  it("rows returns all rows in order (no indices)", () => {
    const model = buildRowModel(data, null, columns);
    expect(model.rows).toHaveLength(4);
    expect(model.rows[0]!.original.name).toBe("Alice");
    expect(model.rows[3]!.original.name).toBe("Dave");
  });

  it("rows applies index indirection", () => {
    const indices = new Uint32Array([2, 0, 3]); // Charlie, Alice, Dave
    const model = buildRowModel(data, indices, columns);
    expect(model.rowCount).toBe(3);
    expect(model.rows[0]!.original.name).toBe("Charlie");
    expect(model.rows[0]!.index).toBe(0); // view index
    expect(model.rows[0]!.id).toBe("2"); // original index
    expect(model.rows[1]!.original.name).toBe("Alice");
    expect(model.rows[2]!.original.name).toBe("Dave");
  });

  it("rows are lazily cached", () => {
    const model = buildRowModel(data, null, columns);
    const first = model.rows;
    const second = model.rows;
    expect(first).toBe(second); // same array reference
  });

  it("getRow returns row at view index", () => {
    const indices = new Uint32Array([3, 1]); // Dave, Bob
    const model = buildRowModel(data, indices, columns);
    const row = model.getRow(1);
    expect(row.original.name).toBe("Bob");
    expect(row.index).toBe(1);
    expect(row.id).toBe("1");
  });

  it("getRow throws RangeError for out-of-bounds index", () => {
    const model = buildRowModel(data, null, columns);
    expect(() => model.getRow(-1)).toThrow(RangeError);
    expect(() => model.getRow(4)).toThrow(RangeError);
  });

  it("handles empty data", () => {
    const model = buildRowModel([], null, columns);
    expect(model.rowCount).toBe(0);
    expect(model.rows).toEqual([]);
  });

  it("handles number[] indices", () => {
    const indices = [1, 3];
    const model = buildRowModel(data, indices, columns);
    expect(model.rowCount).toBe(2);
    expect(model.rows[0]!.original.name).toBe("Bob");
    expect(model.rows[1]!.original.name).toBe("Dave");
  });
});

describe("Factory markers", () => {
  it("getCoreRowModel returns core marker", () => {
    expect(getCoreRowModel()._type).toBe("core");
  });

  it("getSortedRowModel returns sorted marker", () => {
    expect(getSortedRowModel()._type).toBe("sorted");
  });

  it("getFilteredRowModel returns filtered marker", () => {
    expect(getFilteredRowModel()._type).toBe("filtered");
  });

  it("getExpandedRowModel returns expanded marker", () => {
    expect(getExpandedRowModel()._type).toBe("expanded");
  });

  it("getPaginationRowModel returns pagination marker", () => {
    expect(getPaginationRowModel()._type).toBe("pagination");
  });

  it("getGroupedRowModel returns grouped marker", () => {
    expect(getGroupedRowModel()._type).toBe("grouped");
  });

  it("getFacetedRowModel returns faceted marker", () => {
    expect(getFacetedRowModel()._type).toBe("faceted");
  });
});

describe("buildVirtualRowModel", () => {
  it("returns only rows within the given range", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: 1, end: 3 });
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0]!.original.name).toBe("Bob");
    expect(model.rows[0]!.index).toBe(1);
    expect(model.rows[1]!.original.name).toBe("Charlie");
    expect(model.rows[1]!.index).toBe(2);
  });

  it("rowCount reflects total data size, not range", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: 0, end: 2 });
    expect(model.rowCount).toBe(4);
    expect(model.rows).toHaveLength(2);
  });

  it("applies index indirection within range", () => {
    const indices = new Uint32Array([2, 0, 3, 1]); // Charlie, Alice, Dave, Bob
    const model = buildVirtualRowModel(data, indices, columns, { start: 1, end: 3 });
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0]!.original.name).toBe("Alice"); // indices[1] = 0
    expect(model.rows[1]!.original.name).toBe("Dave"); // indices[2] = 3
  });

  it("getRow accesses any row by index (not limited to range)", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: 0, end: 2 });
    const row = model.getRow(3);
    expect(row.original.name).toBe("Dave");
  });

  it("getRow throws RangeError for out-of-bounds", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: 0, end: 2 });
    expect(() => model.getRow(-1)).toThrow(RangeError);
    expect(() => model.getRow(4)).toThrow(RangeError);
  });

  it("clamps range to valid bounds", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: -5, end: 100 });
    expect(model.rows).toHaveLength(4);
    expect(model.rowCount).toBe(4);
  });

  it("handles empty range", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: 2, end: 2 });
    expect(model.rows).toHaveLength(0);
    expect(model.rowCount).toBe(4);
  });

  it("handles inverted range (start > end)", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: 3, end: 1 });
    expect(model.rows).toHaveLength(0);
  });

  it("rows are lazily cached", () => {
    const model = buildVirtualRowModel(data, null, columns, { start: 0, end: 2 });
    const first = model.rows;
    const second = model.rows;
    expect(first).toBe(second);
  });

  it("handles empty data", () => {
    const model = buildVirtualRowModel([], null, columns, { start: 0, end: 10 });
    expect(model.rows).toHaveLength(0);
    expect(model.rowCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Tree / Expanding
// ══════════════════════════════════════════════════════════════════════

type TreeNode = { name: string; age: number; status: string; children?: TreeNode[] };
const treeHelper = createColumnHelper<TreeNode>();
const treeColumns: GridColumnDef<TreeNode, any>[] = [
  treeHelper.accessor("name", { header: "Name" }),
  treeHelper.accessor("age", { header: "Age" }),
];

const treeData: TreeNode[] = [
  {
    name: "Alice",
    age: 30,
    status: "active",
    children: [
      {
        name: "Bob",
        age: 25,
        status: "inactive",
        children: [{ name: "Eve", age: 5, status: "active" }],
      },
      { name: "Charlie", age: 35, status: "active" },
    ],
  },
  { name: "Dave", age: 28, status: "pending" },
];

const getSubRows = (row: TreeNode) => row.children;

describe("Row tree fields", () => {
  it("buildRow with subRows sets depth and parentId", () => {
    const subRow = buildRow(treeData, 0, 1, treeColumns, { depth: 1, parentId: "99" });
    expect(subRow.depth).toBe(1);
    expect(subRow.parentId).toBe("99");
  });

  it("buildRow without options defaults to depth 0 and empty subRows", () => {
    const row = buildRow(data, 0, 0, columns);
    expect(row.depth).toBe(0);
    expect(row.subRows).toEqual([]);
    expect(row.parentId).toBeUndefined();
  });

  it("getCanExpand returns true when subRows exist", () => {
    const child = buildRow(data, 1, 0, columns);
    const row = buildRow(data, 0, 0, columns, { subRows: [child] });
    expect(row.getCanExpand()).toBe(true);
  });

  it("getCanExpand returns false when no subRows", () => {
    const row = buildRow(data, 0, 0, columns);
    expect(row.getCanExpand()).toBe(false);
  });

  it("getLeafRows collects only leaf nodes from nested tree", () => {
    const leaf1 = buildRow(data, 2, 2, columns);
    const leaf2 = buildRow(data, 3, 3, columns);
    const mid = buildRow(data, 1, 1, columns, { subRows: [leaf1] });
    const root = buildRow(data, 0, 0, columns, { subRows: [mid, leaf2] });
    const leaves = root.getLeafRows();
    expect(leaves).toHaveLength(2);
    expect(leaves[0]!.id).toBe("2");
    expect(leaves[1]!.id).toBe("3");
  });
});

describe("Row getIsExpanded / toggleExpanded", () => {
  it("getIsExpanded returns true when expanded=true (all expanded)", () => {
    const row = buildRow(data, 0, 0, columns, { expanded: true });
    expect(row.getIsExpanded()).toBe(true);
  });

  it("getIsExpanded returns true when row ID in expanded record", () => {
    const row = buildRow(data, 0, 0, columns, { expanded: { "0": true } });
    expect(row.getIsExpanded()).toBe(true);
  });

  it("getIsExpanded returns false when row ID not in expanded record", () => {
    const row = buildRow(data, 0, 0, columns, { expanded: { "1": true } });
    expect(row.getIsExpanded()).toBe(false);
  });

  it("getIsExpanded returns false when expanded is empty or undefined", () => {
    const row1 = buildRow(data, 0, 0, columns, { expanded: {} });
    expect(row1.getIsExpanded()).toBe(false);
    const row2 = buildRow(data, 0, 0, columns);
    expect(row2.getIsExpanded()).toBe(false);
  });

  it("toggleExpanded calls onExpandedChange", () => {
    let captured: ExpandedUpdater | undefined;
    const row = buildRow(data, 0, 0, columns, {
      expanded: {},
      onExpandedChange: (u) => {
        captured = u;
      },
    });
    row.toggleExpanded();
    expect(captured).toBeDefined();
    // Evaluate the updater
    const next = typeof captured === "function" ? captured({}) : captured;
    expect(next).toEqual({ "0": true });
  });

  it("toggleExpanded toggles off when already expanded", () => {
    let captured: ExpandedUpdater | undefined;
    const row = buildRow(data, 0, 0, columns, {
      expanded: { "0": true },
      onExpandedChange: (u) => {
        captured = u;
      },
    });
    row.toggleExpanded();
    const next = typeof captured === "function" ? captured({ "0": true }) : captured;
    expect(next).toEqual({ "0": false });
  });
});

describe("buildExpandedRowModel", () => {
  it("all collapsed returns only root rows", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, {});
    expect(model.rowCount).toBe(2);
    expect(model.rows[0]!.original.name).toBe("Alice");
    expect(model.rows[1]!.original.name).toBe("Dave");
  });

  it("root expanded shows root + depth-1 children", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, { "0": true });
    expect(model.rowCount).toBe(4);
    expect(model.rows.map((r) => r.original.name)).toEqual(["Alice", "Bob", "Charlie", "Dave"]);
  });

  it("nested expanded shows deep children", () => {
    // Expand Alice (0) and Bob (child of Alice)
    // Bob's index in allData depends on insertion order.
    // buildExpandedRowModel pushes sub-items not in top-level data.
    // Alice = index 0, Dave = index 1, Bob = index 2, Eve = index 3, Charlie = index 4
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, {
      "0": true,
      "2": true,
    });
    expect(model.rows.map((r) => r.original.name)).toEqual([
      "Alice",
      "Bob",
      "Eve",
      "Charlie",
      "Dave",
    ]);
  });

  it("expanded=true expands all rows", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, true);
    expect(model.rows.map((r) => r.original.name)).toEqual([
      "Alice",
      "Bob",
      "Eve",
      "Charlie",
      "Dave",
    ]);
    expect(model.rowCount).toBe(5);
  });

  it("flat data (no children) works like core row model", () => {
    const flatData = [
      { name: "A", age: 1, status: "a" },
      { name: "B", age: 2, status: "b" },
    ];
    const model = buildExpandedRowModel(flatData, treeColumns, () => undefined, {});
    expect(model.rowCount).toBe(2);
    expect(model.rows[0]!.original.name).toBe("A");
    expect(model.rows[1]!.original.name).toBe("B");
  });

  it("getRow returns correct row by index", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, { "0": true });
    const row = model.getRow(1);
    expect(row.original.name).toBe("Bob");
    expect(row.index).toBe(1);
  });

  it("getRow throws RangeError for out-of-bounds", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, {});
    expect(() => model.getRow(-1)).toThrow(RangeError);
    expect(() => model.getRow(5)).toThrow(RangeError);
  });

  it("rows have correct depth", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, true);
    const depths = model.rows.map((r) => r.depth);
    expect(depths).toEqual([0, 1, 2, 1, 0]);
  });

  it("rows have correct parentId", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, true);
    // Alice (depth 0) has no parentId
    expect(model.rows[0]!.parentId).toBeUndefined();
    // Bob (depth 1) has parentId = Alice's index
    expect(model.rows[1]!.parentId).toBe("0");
    // Eve (depth 2) has parentId = Bob's index
    expect(model.rows[2]!.parentId).toBe(model.rows[1]!.id);
  });

  it("view indices are sequential after flattening", () => {
    const model = buildExpandedRowModel(treeData, treeColumns, getSubRows, true);
    const indices = model.rows.map((r) => r.index);
    expect(indices).toEqual([0, 1, 2, 3, 4]);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Pagination
// ══════════════════════════════════════════════════════════════════════

describe("buildPaginationRowModel", () => {
  it("returns first page of data", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 0, pageSize: 2 });
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0]!.original.name).toBe("Alice");
    expect(model.rows[1]!.original.name).toBe("Bob");
  });

  it("returns second page of data", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 1, pageSize: 2 });
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0]!.original.name).toBe("Charlie");
    expect(model.rows[1]!.original.name).toBe("Dave");
  });

  it("returns partial last page", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 1, pageSize: 3 });
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]!.original.name).toBe("Dave");
  });

  it("rowCount returns total count (not page count)", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 0, pageSize: 2 });
    expect(model.rowCount).toBe(4);
  });

  it("handles pageSize > data.length", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 0, pageSize: 100 });
    expect(model.rows).toHaveLength(4);
    expect(model.rowCount).toBe(4);
  });

  it("handles empty data", () => {
    const model = buildPaginationRowModel([], null, columns, { pageIndex: 0, pageSize: 10 });
    expect(model.rows).toHaveLength(0);
    expect(model.rowCount).toBe(0);
  });

  it("handles out-of-range pageIndex (returns empty)", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 10, pageSize: 2 });
    expect(model.rows).toHaveLength(0);
    expect(model.rowCount).toBe(4);
  });

  it("applies index indirection", () => {
    const indices = new Uint32Array([2, 0, 3, 1]); // Charlie, Alice, Dave, Bob
    const model = buildPaginationRowModel(data, indices, columns, { pageIndex: 1, pageSize: 2 });
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0]!.original.name).toBe("Dave");
    expect(model.rows[1]!.original.name).toBe("Bob");
  });

  it("getRow works within current page", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 0, pageSize: 2 });
    const row = model.getRow(1);
    expect(row.original.name).toBe("Bob");
  });

  it("getRow throws for out-of-bounds within page", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 0, pageSize: 2 });
    expect(() => model.getRow(2)).toThrow(RangeError);
  });

  it("rows have sequential view indices starting at 0", () => {
    const model = buildPaginationRowModel(data, null, columns, { pageIndex: 1, pageSize: 2 });
    expect(model.rows[0]!.index).toBe(0);
    expect(model.rows[1]!.index).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Grouped
// ══════════════════════════════════════════════════════════════════════

describe("buildGroupedRowModel", () => {
  it("groups by single column", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    // active: Alice, Charlie; inactive: Bob; pending: Dave
    expect(model.rows).toHaveLength(3);
    const groupIds = model.rows.map((r) => r.id);
    expect(groupIds[0]).toContain("group:status:active");
    expect(groupIds[1]).toContain("group:status:inactive");
    expect(groupIds[2]).toContain("group:status:pending");
  });

  it("group rows have subRows containing leaf rows", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    const activeGroup = model.rows[0]!;
    expect(activeGroup.subRows).toHaveLength(2);
    expect(activeGroup.subRows[0]!.original.name).toBe("Alice");
    expect(activeGroup.subRows[1]!.original.name).toBe("Charlie");
  });

  it("group row getValue returns group value for grouping column", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    expect(model.rows[0]!.getValue("status")).toBe("active");
    expect(model.rows[1]!.getValue("status")).toBe("inactive");
  });

  it("group row getValue returns undefined for non-grouping column without aggregation", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    expect(model.rows[0]!.getValue("age")).toBeUndefined();
  });

  it("group row getValue uses aggregationFn when provided", () => {
    const aggFns: Record<string, AggregationFn<Person>> = {
      age: (_colId, leafRows) => {
        let sum = 0;
        for (const r of leafRows) sum += r.getValue("age") as number;
        return sum / leafRows.length;
      },
    };
    const model = buildGroupedRowModel(data, null, columns, ["status"], aggFns);
    // active group: Alice(30) + Charlie(35) = avg 32.5
    expect(model.rows[0]!.getValue("age")).toBe(32.5);
  });

  it("empty grouping returns normal row model", () => {
    const model = buildGroupedRowModel(data, null, columns, []);
    expect(model.rowCount).toBe(4);
    expect(model.rows[0]!.original.name).toBe("Alice");
  });

  it("applies index indirection", () => {
    const indices = new Uint32Array([0, 2]); // Alice, Charlie — both active
    const model = buildGroupedRowModel(data, indices, columns, ["status"]);
    expect(model.rows).toHaveLength(1); // only active group
    expect(model.rows[0]!.getValue("status")).toBe("active");
    expect(model.rows[0]!.subRows).toHaveLength(2);
  });

  it("multi-level grouping creates nested groups", () => {
    const extData: Person[] = [
      { name: "Alice", age: 30, status: "active" },
      { name: "Bob", age: 25, status: "active" },
      { name: "Charlie", age: 35, status: "inactive" },
    ];
    const model = buildGroupedRowModel(extData, null, columns, ["status", "name"]);
    // Top level: active, inactive
    expect(model.rows).toHaveLength(2);
    // active group has sub-groups by name
    const activeGroup = model.rows[0]!;
    expect(activeGroup.subRows).toHaveLength(2); // Alice group, Bob group
    expect(activeGroup.subRows[0]!.id).toContain("group:name:Alice");
  });

  it("getRow works by index", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    const row = model.getRow(0);
    expect(row.id).toContain("group:status:active");
  });

  it("getRow throws for out-of-bounds", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    expect(() => model.getRow(10)).toThrow(RangeError);
  });

  it("group rows getCanExpand returns true", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    expect(model.rows[0]!.getCanExpand()).toBe(true);
  });

  it("getLeafRows returns all leaf rows of a group", () => {
    const model = buildGroupedRowModel(data, null, columns, ["status"]);
    const leaves = model.rows[0]!.getLeafRows();
    expect(leaves).toHaveLength(2);
    expect(leaves[0]!.original.name).toBe("Alice");
    expect(leaves[1]!.original.name).toBe("Charlie");
  });
});

// ══════════════════════════════════════════════════════════════════════
// Faceted
// ══════════════════════════════════════════════════════════════════════

describe("buildFacetedValues", () => {
  it("computes unique values with counts", () => {
    const result = buildFacetedValues(data, null, columns);
    const statusFacet = result.get("status")!;
    expect(statusFacet.uniqueValues.get("active")).toBe(2);
    expect(statusFacet.uniqueValues.get("inactive")).toBe(1);
    expect(statusFacet.uniqueValues.get("pending")).toBe(1);
  });

  it("computes min/max for numeric columns", () => {
    const result = buildFacetedValues(data, null, columns);
    const ageFacet = result.get("age")!;
    expect(ageFacet.min).toBe(25);
    expect(ageFacet.max).toBe(35);
  });

  it("min/max is undefined for string columns", () => {
    const result = buildFacetedValues(data, null, columns);
    const nameFacet = result.get("name")!;
    expect(nameFacet.min).toBeUndefined();
    expect(nameFacet.max).toBeUndefined();
  });

  it("handles empty data", () => {
    const result = buildFacetedValues([], null, columns);
    const nameFacet = result.get("name")!;
    expect(nameFacet.uniqueValues.size).toBe(0);
    expect(nameFacet.min).toBeUndefined();
  });

  it("applies index indirection", () => {
    const indices = new Uint32Array([0, 2]); // Alice, Charlie — both active
    const result = buildFacetedValues(data, indices, columns);
    const statusFacet = result.get("status")!;
    expect(statusFacet.uniqueValues.size).toBe(1);
    expect(statusFacet.uniqueValues.get("active")).toBe(2);
  });

  it("covers all accessor columns", () => {
    const result = buildFacetedValues(data, null, columns);
    expect(result.has("name")).toBe(true);
    expect(result.has("age")).toBe(true);
    expect(result.has("status")).toBe(true);
  });

  it("unique values for name column has all names", () => {
    const result = buildFacetedValues(data, null, columns);
    const nameFacet = result.get("name")!;
    expect(nameFacet.uniqueValues.size).toBe(4);
    expect(nameFacet.uniqueValues.get("Alice")).toBe(1);
    expect(nameFacet.uniqueValues.get("Bob")).toBe(1);
  });
});
