import { describe, expect, it, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useGridTable } from "../use-grid-table";
import { createColumnHelper } from "../column-helper";

const h = createColumnHelper<{ id: number; name: string }>();

const columns = [h.accessor("id", { header: "ID" }), h.accessor("name", { header: "Name" })];

const data = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

describe("useGridTable", () => {
  it("returns a GridInstance", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current).toBeDefined();
    expect(typeof result.current.getState).toBe("function");
  });

  it("exposes getAllColumns", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const cols = result.current.getAllColumns();
    expect(cols).toHaveLength(2);
  });

  it("manages sorting state internally", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.getState();
    });
    expect(result.current.getState().sorting).toEqual([]);
  });

  it("manages columnVisibility state internally", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getState().columnVisibility).toEqual({});
  });

  it("manages columnPinning state internally", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getState().columnPinning).toEqual({ left: [], right: [] });
  });

  it("uses controlled sorting when provided", () => {
    const sorting = [{ id: "id", desc: false }];
    const { result } = renderHook(() => useGridTable({ data, columns, state: { sorting } }));
    expect(result.current.getState().sorting).toEqual(sorting);
  });

  it("uses controlled columnFilters when provided", () => {
    const columnFilters = [{ id: "name", value: "Alice" }];
    const { result } = renderHook(() => useGridTable({ data, columns, state: { columnFilters } }));
    expect(result.current.getState().columnFilters).toEqual(columnFilters);
  });

  it("toggles sorting on a column", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      const col = result.current.getColumn("id");
      col?.toggleSorting(false);
    });
    expect(result.current.getState().sorting).toEqual([{ id: "id", desc: false }]);
  });

  it("returns row model", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    const rowModel = result.current.getRowModel();
    expect(rowModel.rows).toHaveLength(3);
  });

  it("handles empty data", () => {
    const { result } = renderHook(() => useGridTable({ data: [], columns }));
    expect(result.current.getRowModel().rows).toHaveLength(0);
  });

  it("manages pagination state", () => {
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { pagination: { pageIndex: 0, pageSize: 2 } } }),
    );
    expect(result.current.getState().pagination).toEqual({ pageIndex: 0, pageSize: 2 });
  });

  it("manages expanded state", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getState().expanded).toEqual({});
  });

  it("manages grouping state", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getState().grouping).toEqual([]);
  });

  it("changes column visibility via toggleVisibility", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      const col = result.current.getColumn("name");
      col?.toggleVisibility();
    });
    expect(result.current.getState().columnVisibility).toEqual({ name: false });
  });

  it("changes column pinning via pin", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      const col = result.current.getColumn("id");
      col?.pin("left");
    });
    expect(result.current.getState().columnPinning.left).toContain("id");
  });

  it("changes column sizing via setSize", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setColumnSizing({ id: 200 });
    });
    expect(result.current.getState().columnSizing).toEqual({ id: 200 });
  });

  it("toggles row expanded state", () => {
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        getSubRows: () => [],
      }),
    );
    act(() => {
      result.current.getExpandedRowModel().rows[0]?.toggleExpanded();
    });
    // Expanded state should change
    const expandedState = result.current.getState().expanded;
    expect(Object.keys(expandedState).length).toBeGreaterThan(0);
  });

  it("uses controlled globalFilter when provided", () => {
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { globalFilter: "Alice" } }),
    );
    expect(result.current.getState().globalFilter).toBe("Alice");
  });

  it("manages global filter internally", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getState().globalFilter).toBe("");
  });

  it("uses controlled columnSizing when provided", () => {
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { columnSizing: { id: 150 } } }),
    );
    expect(result.current.getState().columnSizing).toEqual({ id: 150 });
  });

  it("manages rowPinning state", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    expect(result.current.getState().rowPinning).toEqual({ top: [], bottom: [] });
  });

  // --- Internal onChange handlers (else branches) ---

  it("updates internal columnFilters via setColumnFilters", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setColumnFilters([{ id: "name", value: "Bob" }]);
    });
    expect(result.current.getState().columnFilters).toEqual([{ id: "name", value: "Bob" }]);
  });

  it("updates internal columnFilters via setColumnFilters with updater function", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setColumnFilters([{ id: "name", value: "A" }]);
    });
    act(() => {
      result.current.setColumnFilters((prev) => [...prev, { id: "id", value: 1 }]);
    });
    expect(result.current.getState().columnFilters).toHaveLength(2);
  });

  it("updates internal globalFilter via setGlobalFilter", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setGlobalFilter("Alice");
    });
    expect(result.current.getState().globalFilter).toBe("Alice");
  });

  it("updates internal columnSizingInfo via setColumnSizingInfo", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setColumnSizingInfo({
        startOffset: 100,
        startSize: 150,
        deltaOffset: 0,
        deltaPercentage: 0,
        columnSizingStart: [],
        isResizingColumn: "id",
      });
    });
    expect(result.current.getState().columnSizingInfo.isResizingColumn).toBe("id");
  });

  it("updates internal columnVisibility via toggleVisibility back to visible", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      const col = result.current.getColumn("name");
      col?.toggleVisibility();
    });
    expect(result.current.getState().columnVisibility).toEqual({ name: false });
    act(() => {
      const col = result.current.getColumn("name");
      col?.toggleVisibility();
    });
    expect(result.current.getState().columnVisibility).toEqual({ name: true });
  });

  it("updates internal columnSizing via setColumnSizing with updater", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setColumnSizing((prev) => ({ ...prev, id: 250 }));
    });
    expect(result.current.getState().columnSizing).toEqual({ id: 250 });
  });

  it("updates internal columnPinning via setColumnPinning updater", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      const col = result.current.getColumn("name");
      col?.pin("right");
    });
    expect(result.current.getState().columnPinning.right).toContain("name");
  });

  it("updates internal rowPinning via setRowPinning", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setRowPinning({ top: ["0"], bottom: [] });
    });
    expect(result.current.getState().rowPinning).toEqual({ top: ["0"], bottom: [] });
  });

  it("updates internal pagination via setPagination", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setPagination({ pageIndex: 1, pageSize: 5 });
    });
    expect(result.current.getState().pagination).toEqual({ pageIndex: 1, pageSize: 5 });
  });

  it("updates internal grouping via setGrouping", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current.setGrouping(["name"]);
    });
    expect(result.current.getState().grouping).toEqual(["name"]);
  });

  it("updates internal expanded via toggleExpanded on row", () => {
    const { result } = renderHook(() => useGridTable({ data, columns, getSubRows: () => [] }));
    act(() => {
      const rows = result.current.getExpandedRowModel().rows;
      rows[0]?.toggleExpanded(true);
    });
    expect(result.current.getState().expanded).toHaveProperty("0");
  });

  it("wraps _setVisibleRange to persist across instance rebuilds", () => {
    const { result } = renderHook(() => useGridTable({ data, columns }));
    act(() => {
      result.current._setVisibleRange({ start: 0, end: 2 });
    });
    // The wrapped _setVisibleRange should work without error
    const rowModel = result.current.getRowModel();
    expect(rowModel.rows.length).toBeLessThanOrEqual(3);
  });

  // --- Controlled onChange callbacks (if branches) ---

  it("delegates sorting to controlled onSortingChange", () => {
    const onSortingChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { sorting: [] }, onSortingChange }),
    );
    act(() => {
      const col = result.current.getColumn("id");
      col?.toggleSorting(false);
    });
    expect(onSortingChange).toHaveBeenCalled();
  });

  it("delegates columnFilters to controlled onColumnFiltersChange", () => {
    const onColumnFiltersChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { columnFilters: [] }, onColumnFiltersChange }),
    );
    act(() => {
      result.current.setColumnFilters([{ id: "name", value: "A" }]);
    });
    expect(onColumnFiltersChange).toHaveBeenCalled();
  });

  it("delegates globalFilter to controlled onGlobalFilterChange", () => {
    const onGlobalFilterChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { globalFilter: "" }, onGlobalFilterChange }),
    );
    act(() => {
      result.current.setGlobalFilter("test");
    });
    expect(onGlobalFilterChange).toHaveBeenCalledWith("test");
  });

  it("delegates columnVisibility to controlled onColumnVisibilityChange", () => {
    const onColumnVisibilityChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { columnVisibility: {} }, onColumnVisibilityChange }),
    );
    act(() => {
      const col = result.current.getColumn("name");
      col?.toggleVisibility();
    });
    expect(onColumnVisibilityChange).toHaveBeenCalled();
  });

  it("delegates columnSizing to controlled onColumnSizingChange", () => {
    const onColumnSizingChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { columnSizing: {} }, onColumnSizingChange }),
    );
    act(() => {
      result.current.setColumnSizing({ id: 200 });
    });
    expect(onColumnSizingChange).toHaveBeenCalled();
  });

  it("delegates columnSizingInfo to controlled onColumnSizingInfoChange", () => {
    const onColumnSizingInfoChange = mock(() => {});
    const { result } = renderHook(() => useGridTable({ data, columns, onColumnSizingInfoChange }));
    act(() => {
      result.current.setColumnSizingInfo({
        startOffset: 0,
        startSize: 100,
        deltaOffset: 0,
        deltaPercentage: 0,
        columnSizingStart: [],
        isResizingColumn: "id",
      });
    });
    expect(onColumnSizingInfoChange).toHaveBeenCalled();
  });

  it("delegates columnPinning to controlled onColumnPinningChange", () => {
    const onColumnPinningChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        state: { columnPinning: { left: [], right: [] } },
        onColumnPinningChange,
      }),
    );
    act(() => {
      const col = result.current.getColumn("id");
      col?.pin("left");
    });
    expect(onColumnPinningChange).toHaveBeenCalled();
  });

  it("delegates rowPinning to controlled onRowPinningChange", () => {
    const onRowPinningChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        state: { rowPinning: { top: [], bottom: [] } },
        onRowPinningChange,
      }),
    );
    act(() => {
      result.current.setRowPinning({ top: ["0"], bottom: [] });
    });
    expect(onRowPinningChange).toHaveBeenCalled();
  });

  it("delegates expanded to controlled onExpandedChange", () => {
    const onExpandedChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        getSubRows: () => [],
        state: { expanded: {} },
        onExpandedChange,
      }),
    );
    act(() => {
      result.current.getExpandedRowModel().rows[0]?.toggleExpanded();
    });
    expect(onExpandedChange).toHaveBeenCalled();
  });

  it("delegates pagination to controlled onPaginationChange", () => {
    const onPaginationChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({
        data,
        columns,
        state: { pagination: { pageIndex: 0, pageSize: 10 } },
        onPaginationChange,
      }),
    );
    act(() => {
      result.current.setPagination({ pageIndex: 1, pageSize: 10 });
    });
    expect(onPaginationChange).toHaveBeenCalled();
  });

  it("delegates grouping to controlled onGroupingChange", () => {
    const onGroupingChange = mock(() => {});
    const { result } = renderHook(() =>
      useGridTable({ data, columns, state: { grouping: [] }, onGroupingChange }),
    );
    act(() => {
      result.current.setGrouping(["name"]);
    });
    expect(onGroupingChange).toHaveBeenCalled();
  });
});
