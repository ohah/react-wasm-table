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
  Text,
  Badge,
  type SortingState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";
import { useContainerSize } from "../../useContainerSize";

const ROW_COUNT = 1_000_000; // 50k × 20 for stress test

type Employee = {
  id: number;
  name: string;
  email: string;
  department: string;
  title: string;
  salary: number;
  startDate: string;
  isActive: boolean;
  performanceScore: number | null;
  teamSize: number;
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
  helper.accessor("email", {
    header: "Email",
    size: 260,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("department", {
    header: "Department",
    size: 130,
    enableSorting: true,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("title", {
    header: "Title",
    size: 180,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 110,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
    cell: (info) => (
      <Text
        value={`$${info.getValue().toLocaleString()}`}
        fontWeight="bold"
        color={info.getValue() > 100000 ? "#2e7d32" : "#333"}
      />
    ),
  }),
  helper.accessor("startDate", {
    header: "Start Date",
    size: 110,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("isActive", {
    header: "Active",
    size: 80,
    enableSorting: true,
    align: "center",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={info.getValue() ? "Active" : "Inactive"}
        color="white"
        backgroundColor={info.getValue() ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
  helper.accessor("performanceScore", {
    header: "Score",
    size: 80,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
    cell: (info) => {
      const val = info.getValue();
      if (val == null) return <Text value="—" color="#999" />;
      return (
        <Text
          value={String(val)}
          fontWeight="bold"
          color={val >= 80 ? "#2e7d32" : val >= 60 ? "#ed6c02" : "#d32f2f"}
        />
      );
    },
  }),
  helper.accessor("teamSize", {
    header: "Team",
    size: 80,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

export function TanStackStressTest() {
  const data = useMemo(() => generateEmployees(ROW_COUNT), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { ref, size } = useContainerSize(600);

  const table = useReactTable({
    data: data as Employee[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>Stress Test — 1M rows</h1>
      <p>
        Same grid as Home, with {data.length.toLocaleString()} rows (50k × 20). Initial data
        generation may take a few seconds.
        {sorting.length > 0 && (
          <span style={{ marginLeft: 8, color: "#666" }}>
            | Sorted by: {sorting[0]!.id} ({sorting[0]!.desc ? "desc" : "asc"})
          </span>
        )}
      </p>
      <div ref={ref} style={{ width: "100%", height: 600 }}>
        {size.width > 0 && (
          <>
            <section style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, marginBottom: 6 }}>TanStack API</h4>
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
            </section>
          </>
        )}
      </div>
    </>
  );
}
