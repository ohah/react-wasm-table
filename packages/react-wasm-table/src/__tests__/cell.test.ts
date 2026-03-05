import { describe, expect, it } from "bun:test";
import { buildCell } from "../cell";
import type { Cell } from "../cell";
import type { GridColumn } from "../grid-instance";
import type { Row } from "../row-model";

type TestData = { name: string; age: number };

function makeRow(data: TestData, index: number): Row<TestData> {
  return {
    id: String(index),
    index,
    original: data,
    getValue: (columnId: string) => (data as Record<string, unknown>)[columnId],
    getAllCellValues: () => ({ name: data.name, age: data.age }),
    getVisibleCells: () => [],
    subRows: [],
    depth: 0,
    getCanExpand: () => false,
    getIsExpanded: () => false,
    toggleExpanded: () => {},
    getLeafRows: () => [],
  };
}

function makeColumn(id: string): GridColumn<TestData, unknown> {
  return {
    id,
    columnDef: { accessorKey: id as keyof TestData & string } as any,
    depth: 0,
    columns: [],
    getSize: () => 100,
    getCanSort: () => false,
    getIsSorted: () => false,
    toggleSorting: () => {},
    getToggleSortingHandler: () => () => {},
    getCanFilter: () => false,
    getIsFiltered: () => false,
    getFilterValue: () => undefined,
    setFilterValue: () => {},
    resetFilterValue: () => {},
    getCanHide: () => true,
    getIsVisible: () => true,
    toggleVisibility: () => {},
    getCanResize: () => true,
    getIsResizing: () => false,
    resetSize: () => {},
    getCanPin: () => true,
    getIsPinned: () => false,
    pin: () => {},
    unpin: () => {},
    getPinnedIndex: () => -1,
  };
}

describe("Cell", () => {
  const data: TestData = { name: "Alice", age: 30 };
  const row = makeRow(data, 0);
  const column = makeColumn("name");

  it("should have correct id format", () => {
    const cell = buildCell(row, column);
    expect(cell.id).toBe("0_name");
  });

  it("should reference row and column", () => {
    const cell = buildCell(row, column);
    expect(cell.row).toBe(row);
    expect(cell.column).toBe(column);
  });

  it("should getValue from row", () => {
    const cell = buildCell(row, column);
    expect(cell.getValue()).toBe("Alice");
  });

  it("should getContext with correct structure", () => {
    const cell = buildCell(row, column);
    const ctx = cell.getContext();
    expect(ctx.getValue()).toBe("Alice");
    expect(ctx.renderValue()).toBe("Alice");
    expect(ctx.row.original).toBe(data);
    expect(ctx.row.index).toBe(0);
    expect(ctx.column.id).toBe("name");
  });

  it("should handle numeric column", () => {
    const ageColumn = makeColumn("age");
    const cell = buildCell(row, ageColumn);
    expect(cell.id).toBe("0_age");
    expect(cell.getValue()).toBe(30);
  });

  it("should return null for renderValue when value is undefined", () => {
    const missingColumn = makeColumn("missing");
    const cell = buildCell(row, missingColumn);
    expect(cell.getContext().renderValue()).toBeNull();
  });

  it("should include cell self-reference in getContext", () => {
    const cell = buildCell(row, column);
    const ctx = cell.getContext();
    expect(ctx.cell).toBe(cell);
  });

  it("should include table reference in getContext when provided", () => {
    const fakeTable = { id: "test-table" } as any;
    const cell = buildCell(row, column, fakeTable);
    const ctx = cell.getContext();
    expect(ctx.table).toBe(fakeTable);
  });

  it("should have table undefined when not provided", () => {
    const cell = buildCell(row, column);
    const ctx = cell.getContext();
    expect(ctx.table).toBeUndefined();
  });

  it("should include row.id in getContext", () => {
    const cell = buildCell(row, column);
    const ctx = cell.getContext();
    expect(ctx.row.id).toBe("0");
  });

  it("should include row.getAllCellValues in getContext", () => {
    const cell = buildCell(row, column);
    const ctx = cell.getContext();
    expect(ctx.row.getAllCellValues!()).toEqual({ name: "Alice", age: 30 });
  });
});
