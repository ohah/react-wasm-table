import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import {
  buildRow,
  buildRowModel,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  buildExpandedRowModel,
} from "../row-model";
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
    expect(row.original).toBe(data[2]);
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
