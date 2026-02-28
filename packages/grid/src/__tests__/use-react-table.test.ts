import { describe, expect, it, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useReactTable } from "../use-react-table";
import { useGridTable } from "../use-grid-table";
import { getCoreRowModel } from "../row-model";
import { createColumnHelper } from "../column-helper";
import type { SortingState, SortingUpdater, ColumnFiltersUpdater } from "../tanstack-types";

type TestData = { name: string; age: number };

const helper = createColumnHelper<TestData>();
const columns = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
];

const data: TestData[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

describe("useReactTable", () => {
  it("should return a GridInstance", () => {
    const { result } = renderHook(() =>
      useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
      }),
    );

    const table = result.current;
    expect(table.getState).toBeDefined();
    expect(table.getAllColumns).toBeDefined();
    expect(table.getRowModel).toBeDefined();
    expect(table.setSorting).toBeDefined();
  });

  it("should provide options on the instance", () => {
    const { result } = renderHook(() =>
      useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
      }),
    );

    const table = result.current;
    expect(table.options).toBeDefined();
    expect(table.options.data).toBe(data);
    expect(table.options.columns).toBe(columns);
  });

  it("should provide getHeaderGroups", () => {
    const { result } = renderHook(() =>
      useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
      }),
    );

    const table = result.current;
    const groups = table.getHeaderGroups();
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]!.headers.length).toBe(2);
    expect(groups[0]!.headers[0]!.column.id).toBe("name");
    expect(groups[0]!.headers[1]!.column.id).toBe("age");
  });

  it("should return row model with working getVisibleCells", () => {
    const { result } = renderHook(() =>
      useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
      }),
    );

    const table = result.current;
    const rowModel = table.getRowModel();
    expect(rowModel.rows.length).toBe(2);

    const row = rowModel.rows[0]!;
    expect(row.getValue("name")).toBe("Alice");
    expect(row.getValue("age")).toBe(30);

    // getVisibleCells should now return cells with proper context
    const cells = row.getVisibleCells();
    expect(cells.length).toBe(2);
    expect(cells[0]!.id).toBe("0_name");
    expect(cells[0]!.getValue()).toBe("Alice");
    expect(cells[1]!.id).toBe("0_age");
    expect(cells[1]!.getValue()).toBe(30);

    // Cell context should include cell self-reference and table
    const ctx = cells[0]!.getContext();
    expect(ctx.cell).toBe(cells[0]);
    expect(ctx.table).toBe(table);
    expect(ctx.row.id).toBe("0");
  });

  it("should manage sorting state in uncontrolled mode", () => {
    const { result } = renderHook(() =>
      useReactTable({
        data,
        columns: [
          helper.accessor("name", { header: "Name", enableSorting: true }),
          helper.accessor("age", { header: "Age", enableSorting: true }),
        ],
        getCoreRowModel: getCoreRowModel(),
      }),
    );

    const table = result.current;
    expect(table.getState().sorting).toEqual([]);
  });
});

describe("useGridTable updater pattern", () => {
  it("forwards SortingUpdater directly to controlled onSortingChange", () => {
    const onSortingChange = mock((_updater: SortingUpdater) => {});
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: { sorting: [] },
        onSortingChange,
      }),
    );

    // Call setSorting with a direct value
    act(() => result.current.setSorting([{ id: "name", desc: false }]));
    expect(onSortingChange).toHaveBeenCalledTimes(1);
    expect(onSortingChange.mock.calls[0]![0]).toEqual([{ id: "name", desc: false }]);
  });

  it("forwards updater function to controlled onSortingChange", () => {
    const onSortingChange = mock((_updater: SortingUpdater) => {});
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: { sorting: [{ id: "name", desc: false }] },
        onSortingChange,
      }),
    );

    // Call setSorting with an updater function
    const updaterFn = (prev: SortingState) => [...prev, { id: "age", desc: true }];
    act(() => result.current.setSorting(updaterFn));
    expect(onSortingChange).toHaveBeenCalledTimes(1);
    // The updater function should be forwarded directly, not resolved
    expect(typeof onSortingChange.mock.calls[0]![0]).toBe("function");
  });

  it("resolves updater function in uncontrolled mode", () => {
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
      }),
    );

    // Set initial sorting
    act(() => result.current.setSorting([{ id: "name", desc: false }]));
    expect(result.current.getState().sorting).toEqual([{ id: "name", desc: false }]);

    // Use updater function — should resolve against current state
    act(() => result.current.setSorting((prev) => prev.map((s) => ({ ...s, desc: true }))));
    expect(result.current.getState().sorting).toEqual([{ id: "name", desc: true }]);
  });

  it("forwards ColumnFiltersUpdater directly to controlled onColumnFiltersChange", () => {
    const onColumnFiltersChange = mock((_updater: ColumnFiltersUpdater) => {});
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: { columnFilters: [] },
        onColumnFiltersChange,
      }),
    );

    act(() => result.current.setColumnFilters([{ id: "name", value: "Alice" }]));
    expect(onColumnFiltersChange).toHaveBeenCalledTimes(1);
    expect(onColumnFiltersChange.mock.calls[0]![0]).toEqual([{ id: "name", value: "Alice" }]);
  });

  it("allows useState setter as onSortingChange (TanStack pattern)", () => {
    // Simulates the TanStack pattern: onSortingChange: setSorting
    let captured: SortingState = [];
    const setSorting = (updater: SortingUpdater) => {
      captured = typeof updater === "function" ? updater(captured) : updater;
    };

    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: { sorting: captured },
        onSortingChange: setSorting,
      }),
    );

    act(() => result.current.setSorting([{ id: "name", desc: false }]));
    expect(captured).toEqual([{ id: "name", desc: false }]);

    act(() => result.current.setSorting((prev) => [...prev, { id: "age", desc: true }]));
    expect(captured).toEqual([
      { id: "name", desc: false },
      { id: "age", desc: true },
    ]);
  });
});
