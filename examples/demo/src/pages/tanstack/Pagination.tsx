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
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  Text,
  Badge,
  type PaginationState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";
import { useContainerSize } from "../../useContainerSize";

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
  helper.accessor("id", { header: "#", size: 60, align: "right", padding: [0, 8] }),
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("title", { header: "Title", size: 180, padding: [0, 8] }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    align: "right",
    padding: [0, 8],
    cell: (info) => <Text value={`$${info.getValue().toLocaleString()}`} fontWeight="bold" />,
  }),
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
    align: "center",
    padding: [0, 8],
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

// ── Component ─────────────────────────────────────────────────────

export function TanStackPagination() {
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

  const table = useReactTable<Employee>({
    data: rawData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: handlePaginationChange,
  });

  const model = table.getPaginationRowModel();
  const pageCount = table.getPageCount();
  const { ref, size } = useContainerSize(Math.min(pagination.pageSize * 36 + 40, 520));

  return (
    <>
      <h1>Pagination Row Model</h1>
      <p>
        Demonstrates <code>getPaginationRowModel</code> with a 200-row dataset. The canvas grid
        shows only the current page while <code>rowCount</code> reflects the total for page
        calculations.
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
            {[5, 10, 20, 50].map((s) => (
              <option key={s} value={s}>
                Show {s}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: "#999", marginLeft: 8 }}>
            ({model.rowCount} total rows)
          </span>
        </div>
      </div>

      {/* Canvas Table */}
      <div
        ref={ref}
        style={{ width: "100%", height: Math.min(pagination.pageSize * 36 + 40, 520) }}
      >
        {size.width > 0 && (
          <Table
            table={table}
            width={size.width}
            height={size.height}
            overflowY="scroll"
            overflowX="scroll"
          >
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

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  state: { pagination },
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
