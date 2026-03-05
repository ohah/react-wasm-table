import { useState, useCallback } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  flexRender,
  createColumnHelper,
  useGridTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Text,
  Badge,
  type PaginationState,
  type SortingState,
  type ColumnFiltersState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";
import { useContainerSize } from "../useContainerSize";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

// ── Data ──────────────────────────────────────────────────────────

type Employee = {
  id: number;
  name: string;
  department: string;
  title: string;
  salary: number;
  isActive: boolean;
};

const rawData = generateEmployees(500) as unknown as Employee[];

const helper = createColumnHelper<Employee>();

const columns = [
  helper.accessor("id", { header: "#", size: 60, align: "right", padding: [0, 8] }),
  helper.accessor("name", {
    header: "Name",
    size: 180,
    padding: [0, 8],
    enableSorting: true,
  }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    padding: [0, 8],
    enableSorting: true,
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("title", {
    header: "Title",
    size: 180,
    padding: [0, 8],
    enableSorting: true,
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    align: "right",
    padding: [0, 8],
    enableSorting: true,
    cell: (info) => <Text value={`$${info.getValue().toLocaleString()}`} fontWeight="bold" />,
  }),
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
    align: "center",
    padding: [0, 8],
    enableSorting: true,
    cell: (info) => (
      <Badge
        value={info.getValue()}
        color="white"
        backgroundColor={info.getValue() === "Active" ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
];

// ── Styles ────────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 4,
  border: "1px solid var(--demo-border-2)",
  background: "var(--demo-card-bg)", color: "var(--demo-panel-fg)",
  cursor: "pointer",
  fontSize: 13,
};

const btnDisabled: React.CSSProperties = {
  ...btnBase,
  opacity: 0.4,
  cursor: "not-allowed",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  background: "var(--demo-panel-bg)",
  borderRadius: 6,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 4,
  border: "1px solid var(--demo-border-2)",
  fontSize: 13,
  width: 200,
};

// ── Component ─────────────────────────────────────────────────────

export function PaginationDemo() {
  const isDark = useDarkMode();
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filter states
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Local filter inputs
  const [deptFilter, setDeptFilter] = useState("");
  const [minSalary, setMinSalary] = useState("");

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
      setPagination((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      setSorting((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const handleColumnFiltersChange = useCallback(
    (updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
      setColumnFilters((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  // Apply department filter
  const applyDeptFilter = useCallback(() => {
    setColumnFilters((prev) => {
      const without = prev.filter((f) => f.id !== "department");
      if (!deptFilter.trim()) return without;
      return [...without, { id: "department", value: deptFilter.trim(), op: "contains" as const }];
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [deptFilter]);

  // Apply salary filter
  const applySalaryFilter = useCallback(() => {
    setColumnFilters((prev) => {
      const without = prev.filter((f) => f.id !== "salary");
      const val = Number(minSalary);
      if (!minSalary.trim() || isNaN(val)) return without;
      return [...without, { id: "salary", value: val, op: "gte" as const }];
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [minSalary]);

  // Clear all filters
  const clearAll = useCallback(() => {
    setGlobalFilter("");
    setColumnFilters([]);
    setDeptFilter("");
    setMinSalary("");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const table = useGridTable<Employee>({
    data: rawData,
    columns,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: handlePaginationChange,
  });

  const pageCount = table.getPageCount();
  const totalRows = table.getRowCount();
  const { ref, size } = useContainerSize(Math.min(pagination.pageSize * 36 + 40, 520));

  return (
    <>
      <h1>Pagination + Sort + Filter</h1>
      <p>
        Demonstrates <code>getPaginationRowModel</code> combined with <code>getSortedRowModel</code>{" "}
        and <code>getFilteredRowModel</code>. All processing (filter → sort → paginate) happens in
        WASM — full data is loaded once, page transitions only change <code>view_indices</code>{" "}
        without re-ingesting data.
      </p>

      {/* Global Search */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Global Search:</label>
          <input
            style={{ ...inputStyle, width: 280 }}
            type="text"
            placeholder="Search across all columns..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
          {globalFilter && (
            <span style={{ fontSize: 12, color: "var(--demo-muted)" }}>Matching rows: {totalRows}</span>
          )}
        </div>
      </div>

      {/* Column Filters */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--demo-muted)", display: "block", marginBottom: 4 }}>
              Department (contains)
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. Engineering"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyDeptFilter()}
              />
              <button style={btnBase} onClick={applyDeptFilter}>
                Apply
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--demo-muted)", display: "block", marginBottom: 4 }}>
              Min Salary (≥)
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                style={{ ...inputStyle, width: 120 }}
                type="number"
                placeholder="e.g. 100000"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySalaryFilter()}
              />
              <button style={btnBase} onClick={applySalaryFilter}>
                Apply
              </button>
            </div>
          </div>

          <button style={{ ...btnBase, background: "var(--demo-code-bg)", color: "var(--demo-code-fg)", color: "var(--demo-muted)" }} onClick={clearAll}>
            Clear All
          </button>
        </div>

        {/* Active filters display */}
        {(columnFilters.length > 0 || globalFilter) && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--demo-panel-fg)" }}>
            <strong>Active:</strong>{" "}
            {globalFilter && (
              <span
                style={{
                  display: "inline-block",
                  background: "#e3f2fd",
                  padding: "2px 8px",
                  borderRadius: 10,
                  marginRight: 4,
                }}
              >
                global: "{globalFilter}"
              </span>
            )}
            {columnFilters.map((f) => (
              <span
                key={f.id}
                style={{
                  display: "inline-block",
                  background: "#fff3e0",
                  padding: "2px 8px",
                  borderRadius: 10,
                  marginRight: 4,
                }}
              >
                {f.id} {(f as any).op ?? "eq"} {String(f.value)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            style={table.getCanPreviousPage() ? btnBase : btnDisabled}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
          >
            {"<<"}
          </button>
          <button
            style={table.getCanPreviousPage() ? btnBase : btnDisabled}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            {"<"} Prev
          </button>
          <button
            style={table.getCanNextPage() ? btnBase : btnDisabled}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next {">"}
          </button>
          <button
            style={table.getCanNextPage() ? btnBase : btnDisabled}
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(pageCount - 1)}
          >
            {">>"}
          </button>

          <span style={{ fontSize: 13, color: "var(--demo-muted)", marginLeft: 8 }}>
            Page <strong>{pagination.pageIndex + 1}</strong> of <strong>{pageCount}</strong>
          </span>

          <select
            value={pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            style={{ marginLeft: 8, padding: "4px 8px", fontSize: 13, borderRadius: 4 }}
          >
            {[5, 10, 20, 50].map((s) => (
              <option key={s} value={s}>
                Show {s}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: "var(--demo-muted-5)", marginLeft: 8 }}>
            ({totalRows} rows{columnFilters.length > 0 || globalFilter ? " after filter" : ""})
          </span>
        </div>

        {/* Sorting indicator */}
        {sorting.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--demo-panel-fg)" }}>
            <strong>Sort:</strong>{" "}
            {sorting.map((s) => (
              <span
                key={s.id}
                style={{
                  display: "inline-block",
                  background: "#e8f5e9",
                  padding: "2px 8px",
                  borderRadius: 10,
                  marginRight: 4,
                }}
              >
                {s.id} {s.desc ? "DESC" : "ASC"}
              </span>
            ))}
            <button
              style={{ ...btnBase, fontSize: 11, padding: "2px 8px", marginLeft: 4 }}
              onClick={() => setSorting([])}
            >
              Clear Sort
            </button>
          </div>
        )}
      </div>

      {/* Canvas Table */}
      <div
        ref={ref}
        style={{ width: "100%", height: Math.min(pagination.pageSize * 36 + 40, 520) }}
      >
        {size.width > 0 && (
          <Table table={table} width={size.width} height={size.height} overflowY="scroll" theme={isDark ? DARK_THEME : LIGHT_THEME}>
            <Thead>
              {table.getHeaderGroups().map((hg) => (
                <Tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <Th key={h.id} colSpan={h.colSpan}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </Th>
                  ))}
                </Tr>
              ))}
            </Thead>
            <Tbody>
              {table.getRowModel().rows.map((row) => (
                <Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* State display */}
      <div style={{ ...sectionStyle, marginTop: 20 }}>
        <strong>Current State:</strong>
        <pre style={{ margin: "4px 0 0", fontSize: 12 }}>
          {JSON.stringify({ pagination, sorting, columnFilters, globalFilter }, null, 2)}
        </pre>
      </div>

      {/* Tip */}
      <div style={{ ...sectionStyle, background: "#e8f5e9" }}>
        <strong>How it works (WASM pipeline):</strong>
        <ol style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
          <li>
            Full data loaded into WASM columnar store <strong>once</strong>
          </li>
          <li>
            Filter → Sort → <strong>Paginate</strong> all happen inside WASM{" "}
            <code>rebuild_view()</code>
          </li>
          <li>
            Page changes only update <code>view_indices</code> slice —{" "}
            <strong>no data re-ingestion</strong>
          </li>
          <li>Click column headers to sort, use inputs above to filter</li>
        </ol>
      </div>

    </>
  );
}
