import { useState, useMemo, useCallback } from "react";
import {
  Table,
  useReactTable,
  flexRender,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  createColumnHelper,
  type SortingState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";

type Employee = {
  id: number;
  name: string;
  department: string;
  salary: number;
  performanceScore: number | null;
};

const helper = createColumnHelper<Employee>();

const columns = [
  helper.accessor("id", {
    header: "ID",
    size: 70,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("name", {
    header: "Name",
    size: 180,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("performanceScore", {
    header: "Score",
    size: 100,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

export function TanStackUseSorting() {
  const data = useMemo(() => generateEmployees(1000) as Employee[], []);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [sortHistory, setSortHistory] = useState<SortingState[]>([]);

  const handleSortingChange = useCallback((next: SortingState) => {
    setSorting(next);
    setSortHistory((prev) => {
      const updated = [...prev, next];
      return updated.length > 10 ? updated.slice(-10) : updated;
    });
  }, []);

  const [maxColumns, setMaxColumns] = useState(0);
  const onBeforeSortChange = useCallback(
    (next: SortingState) => {
      if (maxColumns > 0 && next.length > maxColumns) return false;
    },
    [maxColumns],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  const tableUncontrolled = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <h1>useSorting Hook</h1>
      <p>
        Demonstrates controlled sorting with <code>sorting</code> + <code>onSortingChange</code> and
        the <code>onBeforeSortChange</code> guard callback.
      </p>

      <h2>Controlled Sorting + History</h2>
      <p style={{ fontSize: 13, color: "#666" }}>
        Click column headers to sort. The sort state is controlled externally and every change is
        tracked in the history.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              Sort guard (max columns):
              <select
                value={maxColumns}
                onChange={(e) => setMaxColumns(Number(e.target.value))}
                style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #ccc" }}
              >
                <option value={0}>No limit</option>
                <option value={1}>Max 1</option>
                <option value={2}>Max 2</option>
              </select>
            </label>
            <button
              onClick={() => {
                setSorting([]);
                setSortHistory([]);
              }}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Reset
            </button>
          </div>

          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>TanStack API</h4>
            <Table
              table={table}
              width={640}
              height={520}
              onBeforeSortChange={onBeforeSortChange}
              overflowY="scroll"
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
          </section>
        </div>
      </div>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {`const [sorting, setSorting] = useState<SortingState>([]);\n\n`}
        {`<Table\n`}
        {`  table={table}\n`}
        {`  onSortingChange={setSorting}\n`}
        {maxColumns > 0
          ? `  onBeforeSortChange={(next) => {\n    if (next.length > ${maxColumns}) return false;\n  }}\n`
          : ""}
        {`>\n  <Thead>...</Thead>\n  <Tbody>...</Tbody>\n</Table>`}
      </pre>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        <div
          style={{
            padding: 12,
            background: "#f9f9f9",
            borderRadius: 4,
            fontSize: 13,
            flex: 1,
          }}
        >
          <strong>Current sorting:</strong>{" "}
          {sorting.length > 0
            ? sorting.map((s) => `${s.id} (${s.desc ? "desc" : "asc"})`).join(", ")
            : "none"}
        </div>

        <div
          style={{
            padding: 12,
            background: "#f9f9f9",
            borderRadius: 4,
            fontSize: 13,
            flex: 1,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          <strong>Sort history ({sortHistory.length}):</strong>
          {sortHistory.length === 0 && <span style={{ color: "#999" }}> empty</span>}
          {sortHistory.map((entry, i) => (
            <div key={i} style={{ color: "#555", marginTop: 2 }}>
              {i + 1}.{" "}
              {entry.length > 0
                ? entry.map((s) => `${s.id} ${s.desc ? "↓" : "↑"}`).join(", ")
                : "(cleared)"}
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Uncontrolled Sorting</h2>
      <p style={{ fontSize: 13, color: "#666" }}>
        Without <code>sorting</code> / <code>onSortingChange</code> props, the Table manages sort
        state internally. Click headers to test.
      </p>
      <section style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 14, marginBottom: 6 }}>TanStack API</h4>
        <Table table={tableUncontrolled} width={640} height={440} overflowY="scroll">
          <Thead>
            {tableUncontrolled.getHeaderGroups().map((hg) => (
              <Tr key={hg.id}>
                {hg.headers.map((h) => (
                  <Th key={h.id} colSpan={h.colSpan}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {tableUncontrolled.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </section>
    </>
  );
}
