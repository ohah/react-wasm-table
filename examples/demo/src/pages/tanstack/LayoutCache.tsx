import { useState, useMemo, useRef } from "react";
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
  type CssFlexDirection,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type Row = { name: string; department: string; salary: number; isActive?: boolean };
const helper = createColumnHelper<Row>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
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
];

export function TanStackLayoutCache() {
  const data = useMemo(() => generateEmployees(10_000), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const engineRef = useRef<any>(null);
  const [flexDirection, setFlexDirection] = useState<CssFlexDirection>("row");
  const [gap, setGap] = useState(0);

  const table = useReactTable({
    data: data as Row[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>TanStack API: Layout Cache</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. engineRef, flexDirection, gap. Clear layout cache via
        engineRef.current?.invalidateLayout().
      </p>
      <div style={{ marginBottom: 12, display: "flex", gap: 16, alignItems: "center" }}>
        <label>
          flexDirection:
          <select
            value={flexDirection}
            onChange={(e) => setFlexDirection(e.target.value as CssFlexDirection)}
            style={{ marginLeft: 8 }}
          >
            <option value="row">row</option>
            <option value="column">column</option>
          </select>
        </label>
        <label>
          gap:{" "}
          <input
            type="number"
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            style={{ width: 60, marginLeft: 8 }}
          />
        </label>
        <button
          onClick={() => engineRef.current?.invalidateLayout?.()}
          style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          Invalidate layout
        </button>
      </div>
      <Table
        table={table}
        width={560}
        height={400}
        engineRef={engineRef}
        flexDirection={flexDirection}
        gap={gap}
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
      <CodeSnippet>{`const engineRef = useRef(null);
const [flexDirection, setFlexDirection] = useState<CssFlexDirection>("row");
const [gap, setGap] = useState(0);

const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), state: { sorting }, onSortingChange: setSorting });

<Table
  table={table}
  width={560}
  height={400}
  engineRef={engineRef}
  flexDirection={flexDirection}
  gap={gap}
/>

// Clear cache: engineRef.current?.invalidateLayout()`}</CodeSnippet>
    </>
  );
}
