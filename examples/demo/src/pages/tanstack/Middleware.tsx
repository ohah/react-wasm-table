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
  type SortingState,
  type EventMiddleware,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
  helper.accessor("dept", {
    header: "Department",
    size: 140,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
];

interface LogEntry {
  id: number;
  source: string;
  channel: string;
  detail: string;
}

export function TanStackMiddleware() {
  const data = useMemo(() => generateSmallData(), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);
  const addLog = useCallback((source: string, channel: string, detail: string) => {
    setLog((prev) => [{ id: nextId.current++, source, channel, detail }, ...prev].slice(0, 80));
  }, []);

  const loggerMiddleware: EventMiddleware = (channel, _event, next) => {
    addLog("logger", channel, "passing through");
    next();
  };

  const [blockedChannels, setBlockedChannels] = useState<Set<string>>(new Set());
  const blockerMiddleware: EventMiddleware = (channel, _event, next) => {
    if (blockedChannels.has(channel)) return;
    next();
  };

  const eventMiddleware = useMemo<EventMiddleware[]>(
    () => [loggerMiddleware, blockerMiddleware],
    [blockedChannels],
  );

  const table = useReactTable({
    data: data as SmallRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>TanStack API: Event Middleware</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table with eventMiddleware (logger + optional blocker).
      </p>
      <div style={{ marginBottom: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={blockedChannels.has("header-click")}
            onChange={(e) =>
              setBlockedChannels((prev) => {
                const n = new Set(prev);
                if (e.target.checked) n.add("header-click");
                else n.delete("header-click");
                return n;
              })
            }
          />
          Block header-click
        </label>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Table table={table} width={560} height={340} eventMiddleware={eventMiddleware}>
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
        <div
          style={{
            flex: 1,
            maxHeight: 340,
            overflowY: "auto",
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: 8,
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          {log.map((entry) => (
            <div key={entry.id}>
              [{entry.source}] {entry.channel}: {entry.detail}
            </div>
          ))}
        </div>
      </div>
      <CodeSnippet>{`const loggerMiddleware: EventMiddleware = (channel, _event, next) => {
  addLog("logger", channel, "passing through");
  next();
};
const blockerMiddleware: EventMiddleware = (channel, _event, next) => {
  if (blockedChannels.has(channel)) return;
  next();
};

const eventMiddleware = useMemo(() => [loggerMiddleware, blockerMiddleware], [blockedChannels]);

<Table table={table} width={560} height={340} eventMiddleware={eventMiddleware} />`}</CodeSnippet>
    </>
  );
}
