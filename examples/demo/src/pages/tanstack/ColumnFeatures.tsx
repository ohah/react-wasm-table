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
  type ColumnOrderState,
  type ColumnVisibilityState,
  type ColumnSizingState,
  type ColumnPinningState,
  type ColumnFiltersState,
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
    size: 60,
    align: "right",
    padding: [0, 8],
    enableHiding: false,
  }),
  helper.accessor("name", { header: "Name", size: 160, enableSorting: true, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Department",
    size: 130,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 110,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("performanceScore", {
    header: "Score",
    size: 90,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

const ALL_COLUMN_IDS = ["id", "name", "department", "salary", "performanceScore"];

const btnBase: React.CSSProperties = {
  padding: "3px 10px",
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
  padding: 12,
  background: "#f9f9f9",
  borderRadius: 6,
};

export function TanStackColumnFeatures() {
  const data = useMemo(() => generateEmployees(500) as Record<string, unknown>[], []);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(ALL_COLUMN_IDS);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const applyFilters = useCallback(() => {
    const filters: ColumnFiltersState = [];
    if (nameFilter) filters.push({ id: "name", value: nameFilter, op: "contains" });
    if (deptFilter) filters.push({ id: "department", value: deptFilter, op: "eq" });
    setColumnFilters(filters);
  }, [nameFilter, deptFilter]);

  const clearFilters = useCallback(() => {
    setNameFilter("");
    setDeptFilter("");
    setColumnFilters([]);
  }, []);

  const toggleVisibility = (colId: string) => {
    setColumnVisibility((prev) => ({ ...prev, [colId]: prev[colId] === false ? true : false }));
  };

  const togglePin = (colId: string, position: "left" | "right") => {
    setColumnPinning((prev) => {
      const inLeft = prev.left.includes(colId);
      const inRight = prev.right.includes(colId);
      let left = prev.left.filter((id) => id !== colId);
      let right = prev.right.filter((id) => id !== colId);
      if (position === "left" && !inLeft) left = [...left, colId];
      else if (position === "right" && !inRight) right = [...right, colId];
      return { left, right };
    });
  };

  const columns = useMemo(
    () => (columnOrder.length ? reorderColumnsBy(columnDefs, columnOrder) : columnDefs),
    [columnOrder],
  );
  const table = useReactTable({
    data: data as Employee[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnOrder, columnVisibility, columnSizing, columnPinning, columnFilters },
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onColumnFiltersChange: setColumnFilters,
  });

  const inputStyle: React.CSSProperties = {
    padding: "3px 6px",
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 12,
    width: 100,
  };

  return (
    <>
      <h1>Column Features</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. Order, visibility, sizing, pinning, filtering.
      </p>

      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Visibility</strong>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {ALL_COLUMN_IDS.map((colId) => (
            <button
              key={colId}
              style={columnVisibility[colId] !== false ? btnActive : btnBase}
              onClick={() => toggleVisibility(colId)}
            >
              {colId}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Pinning</strong>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          {ALL_COLUMN_IDS.map((colId) => {
            const isLeft = columnPinning.left.includes(colId);
            const isRight = columnPinning.right.includes(colId);
            return (
              <div key={colId} style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{colId}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    style={isLeft ? btnActive : btnBase}
                    onClick={() => togglePin(colId, "left")}
                  >
                    L
                  </button>
                  <button
                    style={isRight ? btnActive : btnBase}
                    onClick={() => togglePin(colId, "right")}
                  >
                    R
                  </button>
                </div>
              </div>
            );
          })}
          <button
            style={{ ...btnBase, alignSelf: "flex-end" }}
            onClick={() => setColumnPinning({ left: [], right: [] })}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Filters</strong>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 12 }}>
            Name{" "}
            <input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="contains"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            Dept{" "}
            <input
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              placeholder="eq"
              style={inputStyle}
            />
          </label>
          <button style={btnActive} onClick={applyFilters}>
            Apply
          </button>
          <button style={btnBase} onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      <Table
        table={table}
        width={600}
        height={360}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
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

      <CodeSnippet>{`const [columnOrder, setColumnOrder] = useState([]);
const [columnVisibility, setColumnVisibility] = useState({});
const [columnSizing, setColumnSizing] = useState({});
const [columnPinning, setColumnPinning] = useState({ left: [], right: [] });
const [columnFilters, setColumnFilters] = useState([]);

const table = useReactTable({
  data,
  columns: reorderColumnsBy(columnDefs, columnOrder),
  getCoreRowModel: getCoreRowModel(),
  state: { columnOrder, columnVisibility, columnSizing, columnPinning, columnFilters },
  onColumnOrderChange: setColumnOrder,
  onColumnVisibilityChange: setColumnVisibility,
  onColumnSizingChange: setColumnSizing,
  onColumnPinningChange: setColumnPinning,
  onColumnFiltersChange: setColumnFilters,
});

<Table table={table} width={560} height={340} enableColumnDnD>
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
      <pre
        style={{
          marginTop: 16,
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 11,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(
          { columnOrder, columnVisibility, columnSizing, columnPinning, columnFilters },
          null,
          2,
        )}
      </pre>
    </>
  );
}
