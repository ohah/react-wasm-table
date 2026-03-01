import { useState, useCallback } from "react";
import {
  createColumnHelper,
  useGridTable,
  getPaginationRowModel,
  type PaginationState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";

// ── Data ──────────────────────────────────────────────────────────

type Employee = {
  id: number;
  name: string;
  department: string;
  title: string;
  salary: number;
  isActive: boolean;
};

const rawData = generateEmployees(200) as unknown as Employee[];

const helper = createColumnHelper<Employee>();

const columns = [
  helper.accessor("id", { header: "#", size: 60, align: "right" }),
  helper.accessor("name", { header: "Name", size: 180 }),
  helper.accessor("department", { header: "Department", size: 140 }),
  helper.accessor("title", { header: "Title", size: 180 }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right" }),
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
  }),
];

// ── Styles ────────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const btnDisabled: React.CSSProperties = {
  ...btnBase,
  opacity: 0.4,
  cursor: "not-allowed",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 12,
  background: "#f9f9f9",
  borderRadius: 6,
};

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  background: "#f5f5f5",
  fontSize: 13,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderBottom: "1px solid #eee",
  fontSize: 13,
};

// ── Component ─────────────────────────────────────────────────────

export function PaginationDemo() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
      setPagination((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const table = useGridTable<Employee>({
    data: rawData,
    columns,
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting: [], columnFilters: [], globalFilter: "", pagination },
    onPaginationChange: handlePaginationChange,
  });

  const model = table.getPaginationRowModel();
  const pageCount = table.getPageCount();

  const formatSalary = (n: number) => "$" + n.toLocaleString("en-US");

  return (
    <>
      <h1>Pagination Row Model</h1>
      <p>
        Demonstrates <code>getPaginationRowModel</code> with a 200-row dataset. The table shows only
        the current page while <code>rowCount</code> reflects the total for page calculations.
      </p>

      {/* Controls */}
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

          <span style={{ fontSize: 13, color: "#666", marginLeft: 8 }}>
            Page <strong>{pagination.pageIndex + 1}</strong> of <strong>{pageCount}</strong>
          </span>

          <select
            value={pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            style={{ marginLeft: 8, padding: "4px 8px", fontSize: 13, borderRadius: 4 }}
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: "#999", marginLeft: 8 }}>
            ({model.rowCount} total rows)
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 60, textAlign: "right" }}>#</th>
              <th style={{ ...thStyle, width: 180 }}>Name</th>
              <th style={{ ...thStyle, width: 140 }}>Department</th>
              <th style={{ ...thStyle, width: 180 }}>Title</th>
              <th style={{ ...thStyle, width: 120, textAlign: "right" }}>Salary</th>
              <th style={{ ...thStyle, width: 100 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.id}>
                <td style={{ ...tdStyle, textAlign: "right" }}>{row.original.id}</td>
                <td style={tdStyle}>{row.original.name}</td>
                <td style={tdStyle}>{row.original.department}</td>
                <td style={tdStyle}>{row.original.title}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {formatSalary(row.original.salary)}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 11,
                      background: row.original.isActive ? "#e8f5e9" : "#ffebee",
                      color: row.original.isActive ? "#2e7d32" : "#c62828",
                    }}
                  >
                    {row.original.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* State display */}
      <div style={sectionStyle}>
        <strong>Pagination State:</strong>
        <pre style={{ margin: "4px 0 0", fontSize: 12 }}>{JSON.stringify(pagination, null, 2)}</pre>
      </div>

      {/* Code snippet */}
      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {`const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: 0,
  pageSize: 10,
});

const table = useGridTable({
  data,
  columns,
  getPaginationRowModel: getPaginationRowModel(),
  state: { ..., pagination },
  onPaginationChange: setPagination,
});

const model = table.getPaginationRowModel();
// model.rows     → current page rows only
// model.rowCount → total row count (for page calc)

// Navigation helpers:
// table.getPageCount()       → total pages
// table.getCanPreviousPage() → boolean
// table.getCanNextPage()     → boolean
// table.previousPage()       → go back
// table.nextPage()           → go forward
// table.setPageIndex(n)      → jump to page
// table.setPageSize(n)       → change page size`}
      </pre>
    </>
  );
}
