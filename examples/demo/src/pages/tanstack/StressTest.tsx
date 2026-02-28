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
  type SortingState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";
import { useContainerSize } from "../../useContainerSize";
import { CodeSnippet } from "../../components/CodeSnippet";

const ROW_COUNT = 1_000_000;
type Employee = Record<string, unknown>;

const helper = createColumnHelper<Employee>();
const columns = [
  helper.accessor("id", {
    header: "ID",
    size: 70,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
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
  helper.accessor("isActive", {
    header: "Active",
    size: 80,
    enableSorting: true,
    align: "center",
    padding: [0, 8],
  }),
];

export function TanStackStressTest() {
  const data = useMemo(() => generateEmployees(ROW_COUNT), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [containerRef, size] = useContainerSize({ width: 600, height: 500 });

  const table = useReactTable({
    data: data as Employee[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const width = size?.width ?? 600;
  const height = size?.height ?? 500;

  return (
    <>
      <h1>TanStack API: Stress Test (1M rows)</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table with {ROW_COUNT.toLocaleString()} rows. useContainerSize for
        responsive size.
      </p>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          maxWidth: 800,
          height: 520,
          border: "1px solid #e0e0e0",
          borderRadius: 4,
        }}
      >
        <Table table={table} width={width} height={height}>
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
      <CodeSnippet>{`const ROW_COUNT = 1_000_000;
const data = useMemo(() => generateEmployees(ROW_COUNT), []);
const [containerRef, size] = useContainerSize({ width: 600, height: 500 });

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  state: { sorting },
  onSortingChange: setSorting,
});

<Table table={table} width={size?.width ?? 600} height={size?.height ?? 500}>
  <Thead>...</Thead>
  <Tbody>{table.getRowModel().rows.map(row => ...)}</Tbody>
</Table>`}</CodeSnippet>
    </>
  );
}
