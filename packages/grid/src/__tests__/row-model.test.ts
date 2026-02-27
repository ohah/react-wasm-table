import { describe, expect, it } from "bun:test";
import { createColumnHelper } from "../column-helper";
import {
  buildRow,
  buildRowModel,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "../row-model";
import type { GridColumnDef } from "../tanstack-types";

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
});
