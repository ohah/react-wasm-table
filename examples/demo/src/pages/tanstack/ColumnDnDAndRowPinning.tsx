import { useState, useMemo } from "react";
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
  type ColumnOrderState,
  type ColumnPinningState,
  type RowPinningState,
  type SortingState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";
import { reorderColumnsBy } from "../../components/DemoTableTanStack";
import { CodeSnippet } from "../../components/CodeSnippet";

type Employee = {
  id: number;
  name: string;
  department: string;
  salary: number;
  performanceScore: number | null;
};

const helper = createColumnHelper<Employee>();

const columnDefs = [
  helper.accessor("id", {
    header: "ID",
    size: 70,
    align: "right",
    padding: [0, 8],
    enableSorting: true,
  }),
  helper.accessor("name", { header: "Name", size: 160, enableSorting: true, padding: [0, 8] }),
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

const ALL_COLUMN_IDS = ["id", "name", "department", "salary", "performanceScore"];

const btnBase: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  border: "1px solid #1976d2",
  background: "#1976d2",
  color: "#fff",
};
const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 14,
  background: "#f9f9f9",
  borderRadius: 8,
};

export function TanStackColumnDnDAndRowPinning() {
  const data = useMemo(
    () => generateEmployees(200) as (Record<string, unknown> & { id: number })[],
    [],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(ALL_COLUMN_IDS);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });
  const [rowPinning, setRowPinning] = useState<RowPinningState>({ top: [], bottom: [] });

  const getRowId = (row: Record<string, unknown>, index: number) => String(row.id ?? index);

  const toggleRowPin = (rowId: string, position: "top" | "bottom") => {
    setRowPinning((prev) => {
      const inTop = prev.top.includes(rowId);
      const inBottom = prev.bottom.includes(rowId);
      let top = prev.top.filter((id) => id !== rowId);
      let bottom = prev.bottom.filter((id) => id !== rowId);
      if (position === "top" && !inTop) top = [...top, rowId];
      else if (position === "bottom" && !inBottom) bottom = [...bottom, rowId];
      return { top, bottom };
    });
  };

  const firstRowId = data.length > 0 ? getRowId(data[0]!, 0) : null;
  const lastRowId = data.length > 0 ? getRowId(data[data.length - 1]!, data.length - 1) : null;

  const columns = useMemo(
    () => (columnOrder.length ? reorderColumnsBy(columnDefs, columnOrder) : columnDefs),
    [columnOrder],
  );
  const table = useReactTable({
    data: data as Employee[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting, columnOrder, columnPinning, rowPinning },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onRowPinningChange: setRowPinning,
    getRowId,
  });

  return (
    <>
      <h1>Column DnD & Row Pinning</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 20 }}>
        <strong>Column DnD:</strong> Drag headers to reorder columns. <strong>Row Pinning:</strong>{" "}
        Pin specific rows to the top or bottom (state API only; rendering to be applied).
      </p>

      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Column DnD Reorder</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#666" }}>
          Drag a header with the mouse; a ghost follows the cursor and a blue vertical line shows
          the drop position. Releasing updates the column order.
        </p>
        <div style={{ marginBottom: 8, fontSize: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={columnOrder.length > 0}
              readOnly
              style={{ marginRight: 6 }}
            />
            enableColumnDnD enabled
          </label>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Row Pinning (state)</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#666" }}>
          Pin rows to the top or bottom. Specify row IDs via getRowId and control with rowPinning
          state.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {firstRowId && (
            <>
              <button
                style={rowPinning.top.includes(firstRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(firstRowId, "top")}
              >
                First row → Pin to top
              </button>
              <button
                style={rowPinning.bottom.includes(firstRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(firstRowId, "bottom")}
              >
                First row → Pin to bottom
              </button>
            </>
          )}
          {lastRowId && lastRowId !== firstRowId && (
            <>
              <button
                style={rowPinning.top.includes(lastRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(lastRowId, "top")}
              >
                Last row → Pin to top
              </button>
              <button
                style={rowPinning.bottom.includes(lastRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(lastRowId, "bottom")}
              >
                Last row → Pin to bottom
              </button>
            </>
          )}
          <button style={btnBase} onClick={() => setRowPinning({ top: [], bottom: [] })}>
            Unpin all
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>TanStack API</h2>
        <Table
          table={table}
          width={700}
          height={500}
          enableColumnDnD
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          getRowId={getRowId}
          rowPinning={rowPinning}
          onRowPinningChange={setRowPinning}
          overflowY="scroll"
        >
          <Thead>
            {table.getHeaderGroups().map((hg) => (
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
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>State</h2>
        <pre
          style={{
            margin: 0,
            background: "#f5f5f5",
            padding: 12,
            borderRadius: 4,
            fontSize: 11,
            overflowX: "auto",
          }}
        >
          {JSON.stringify({ columnOrder, columnPinning, rowPinning, sorting }, null, 2)}
        </pre>
      </div>
      <CodeSnippet>{`const [columnOrder, setColumnOrder] = useState([]);
const [columnPinning, setColumnPinning] = useState({ left: [], right: [] });
const [rowPinning, setRowPinning] = useState({ top: [], bottom: [] });

const table = useReactTable({
  data,
  columns: reorderColumnsBy(columnDefs, columnOrder),
  getCoreRowModel: getCoreRowModel(),
  getRowId: (row) => String(row.id),
  state: { columnOrder, columnPinning, rowPinning },
  onColumnOrderChange: setColumnOrder,
  onColumnPinningChange: setColumnPinning,
  onRowPinningChange: setRowPinning,
});

<Table table={table} width={560} height={480} enableColumnDnD rowPinning={rowPinning} getRowId={getRowId}>
  <Thead>
    {table.getHeaderGroups().map((hg) => (
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
    {table.getRowModel().rows.map((row) => (
      <Tr key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
        ))}
      </Tr>
    ))}
  </Tbody>
</Table>`}</CodeSnippet>
    </>
  );
}
