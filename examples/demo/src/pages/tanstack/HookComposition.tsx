import { useState, useMemo, useCallback, useRef } from "react";
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
  type NormalizedRange,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type Employee = {
  id: number;
  name: string;
  department: string;
  salary: number;
  isActive: boolean;
};

const helper = createColumnHelper<Employee>();

const columns = [
  helper.accessor("id", {
    header: "ID",
    size: 60,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("name", { header: "Name", size: 170, enableSorting: true, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Department",
    size: 130,
    enableSorting: true,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
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
  helper.accessor("isActive", {
    header: "Active",
    size: 80,
    enableSorting: true,
    align: "center",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={info.getValue() ? "Yes" : "No"}
        color="white"
        backgroundColor={info.getValue() ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
];

interface EventEntry {
  id: number;
  time: string;
  type: string;
  detail: string;
}

export function TanStackHookComposition() {
  const data = useMemo(() => generateEmployees(5000) as Record<string, unknown>[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const nextId = useRef(0);

  const logEvent = useCallback((type: string, detail: string) => {
    const now = new Date();
    const time = `${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
    setEvents((prev) => [{ id: nextId.current++, time, type, detail }, ...prev].slice(0, 30));
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>Hook Composition</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. Sorting, selection, event callbacks.
      </p>
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <Table
            table={table}
            width={580}
            height={450}
            selection={selection}
            onSelectionChange={setSelection}
            onCellClick={() => logEvent("onCellClick", "cell")}
            onHeaderClick={() => logEvent("onHeaderClick", "header")}
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
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              padding: 12,
              background: "#f9f9f9",
              borderRadius: 4,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            <strong>Sorting:</strong>{" "}
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
              marginBottom: 12,
            }}
          >
            <strong>Selection:</strong> {selection ? JSON.stringify(selection) : "null"}
          </div>
          <div
            style={{
              padding: 12,
              background: "#f9f9f9",
              borderRadius: 4,
              fontSize: 12,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            <strong>Events</strong>
            {events.map((e) => (
              <div key={e.id} style={{ marginTop: 4 }}>
                {e.time} {e.type} — {e.detail}
              </div>
            ))}
          </div>
        </div>
      </div>
      <CodeSnippet>{`const [sorting, setSorting] = useState<SortingState>([]);
const [selection, setSelection] = useState<NormalizedRange | null>(null);

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  state: { sorting },
  onSortingChange: setSorting,
});

<Table
  table={table}
  width={560}
  height={340}
  selection={selection}
  onSelectionChange={setSelection}
  onCellClick={() => logEvent("onCellClick", "cell")}
  onHeaderClick={() => logEvent("onHeaderClick", "header")}
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
</Table>`}</CodeSnippet>
    </>
  );
}
