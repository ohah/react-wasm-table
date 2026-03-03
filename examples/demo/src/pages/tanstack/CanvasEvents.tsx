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
  Link,
  Chip,
  Badge,
  Tag,
  Rating,
  Text,
  type SortingState,
  type GridCellEvent,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

interface LogEntry {
  id: number;
  event: string;
  component: string;
  value: string;
  cell: string;
}

let logId = 0;

export function TanStackCanvasEvents() {
  const data = useMemo(() => generateSmallData() as Row[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const addLog = useCallback(
    (event: string, component: string, value: string, e: GridCellEvent) => {
      setLogs((prev) => [
        { id: ++logId, event, component, value, cell: `(${e.cell.row},${e.cell.col})` },
        ...prev.slice(0, 29),
      ]);
    },
    [],
  );

  // ── Table 1: onClick + preventDefault on Link ──
  const clickColumns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 120,
        enableSorting: true,
        padding: [0, 8],
        cell: (info) => (
          <Text
            value={info.getValue()}
            fontWeight="bold"
            onClick={(e) => addLog("onClick", "Text", info.getValue(), e)}
          />
        ),
      }),
      helper.accessor("dept", {
        header: "Dept (Link)",
        size: 140,
        padding: [0, 8],
        cell: (info) => (
          <Link
            value={info.getValue()}
            href={`#${info.getValue().toLowerCase()}`}
            onClick={(e) => {
              e.preventDefault();
              addLog("onClick", "Link", info.getValue(), e);
            }}
          />
        ),
      }),
      helper.accessor("salary", {
        header: "Salary (Chip)",
        size: 140,
        padding: [0, 8],
        cell: (info) => (
          <Chip
            value={`$${info.getValue().toLocaleString()}`}
            backgroundColor="#e3f2fd"
            color="#1565c0"
            onClick={(e) => addLog("onClick", "Chip", String(info.getValue()), e)}
          />
        ),
      }),
    ],
    [addLog],
  );

  const clickTable = useReactTable<Row>({
    data,
    columns: clickColumns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  // ── Table 2: onMouseEnter / onMouseLeave ──
  const hoverColumns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name (Badge)",
        size: 150,
        padding: [0, 8],
        cell: (info) => (
          <Badge
            value={info.getValue()}
            backgroundColor="#f5f5f5"
            color="#333"
            onMouseEnter={(e) => {
              setHoveredCell(`${info.getValue()} (${e.cell.row},${e.cell.col})`);
              addLog("onMouseEnter", "Badge", info.getValue(), e);
            }}
            onMouseLeave={(e) => {
              setHoveredCell(null);
              addLog("onMouseLeave", "Badge", info.getValue(), e);
            }}
          />
        ),
      }),
      helper.accessor("dept", {
        header: "Dept (Tag)",
        size: 140,
        padding: [0, 8],
        cell: (info) => (
          <Tag
            value={info.getValue()}
            color="#7c3aed"
            borderColor="#7c3aed"
            onMouseEnter={(e) => {
              setHoveredCell(`${info.getValue()} (${e.cell.row},${e.cell.col})`);
              addLog("onMouseEnter", "Tag", info.getValue(), e);
            }}
            onMouseLeave={(e) => {
              setHoveredCell(null);
              addLog("onMouseLeave", "Tag", info.getValue(), e);
            }}
          />
        ),
      }),
      helper.accessor("score", {
        header: "Score (Rating)",
        size: 120,
        padding: [0, 8],
        cell: (info) => {
          const stars = Math.round(info.getValue() / 20);
          return (
            <Rating
              value={stars}
              max={5}
              color="#f59e0b"
              onMouseEnter={(e) => {
                setHoveredCell(`Rating ${stars}/5`);
                addLog("onMouseEnter", "Rating", `${stars}/5`, e);
              }}
              onMouseLeave={(e) => {
                setHoveredCell(null);
                addLog("onMouseLeave", "Rating", `${stars}/5`, e);
              }}
            />
          );
        },
      }),
    ],
    [addLog],
  );

  const hoverTable = useReactTable<Row>({
    data,
    columns: hoverColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Table 3: Combined events ──
  const combinedColumns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 150,
        padding: [0, 8],
        cell: (info) => (
          <Text
            value={info.getValue()}
            onClick={(e) => addLog("onClick", "Text", info.getValue(), e)}
            onDoubleClick={(e) => addLog("onDoubleClick", "Text", info.getValue(), e)}
            onMouseDown={(e) => addLog("onMouseDown", "Text", info.getValue(), e)}
            onMouseUp={(e) => addLog("onMouseUp", "Text", info.getValue(), e)}
          />
        ),
      }),
      helper.accessor("dept", {
        header: "Dept",
        size: 140,
        padding: [0, 8],
        cell: (info) => (
          <Chip
            value={info.getValue()}
            backgroundColor="#e8f5e9"
            color="#2e7d32"
            onClick={(e) => addLog("onClick", "Chip", info.getValue(), e)}
            onDoubleClick={(e) => addLog("onDoubleClick", "Chip", info.getValue(), e)}
          />
        ),
      }),
      helper.accessor("salary", {
        header: "Salary",
        size: 130,
        padding: [0, 8],
        cell: (info) => (
          <Badge
            value={`$${info.getValue().toLocaleString()}`}
            backgroundColor={info.getValue() > 85000 ? "#c8e6c9" : "#ffecb3"}
            color="#333"
            onClick={(e) => addLog("onClick", "Badge", String(info.getValue()), e)}
            onDoubleClick={(e) => addLog("onDoubleClick", "Badge", String(info.getValue()), e)}
          />
        ),
      }),
    ],
    [addLog],
  );

  const combinedTable = useReactTable<Row>({
    data,
    columns: combinedColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  /** Render a TanStack Table component */
  const renderTable = (table: ReturnType<typeof useReactTable<Row>>, w: number, h: number) => (
    <Table table={table} width={w} height={h}>
      <Thead>
        {table.getHeaderGroups().map((hg) => (
          <Tr key={hg.id}>
            {hg.headers.map((header) => (
              <Th key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
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
  );

  return (
    <>
      <h1>TanStack: Canvas Component Events</h1>
      <p>
        Same <code>CanvasEventHandlers</code> work inside TanStack <code>{"<Table>"}</code>. Column{" "}
        <code>cell</code> functions return canvas components with event handlers that fire
        per-component, before the grid-level <code>onCellClick</code>.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Table 1 */}
          <section>
            <h2 style={{ fontSize: 15, marginBottom: 6 }}>1. onClick + preventDefault</h2>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
              Link's <code>onClick</code> calls <code>preventDefault()</code> to block URL open.
              Sortable Name column still works.
            </p>
            {renderTable(clickTable, 420, 200)}
          </section>

          {/* Table 2 */}
          <section>
            <h2 style={{ fontSize: 15, marginBottom: 6 }}>2. onMouseEnter / onMouseLeave</h2>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
              Hover over cells.{" "}
              {hoveredCell ? (
                <strong style={{ color: "#1976d2" }}>Hovered: {hoveredCell}</strong>
              ) : (
                <span style={{ color: "#999" }}>Not hovering</span>
              )}
            </p>
            {renderTable(hoverTable, 430, 200)}
          </section>

          {/* Table 3 */}
          <section>
            <h2 style={{ fontSize: 15, marginBottom: 6 }}>
              3. Combined (click + dblclick + mousedown + mouseup)
            </h2>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
              All events fire in DOM order.
            </p>
            {renderTable(combinedTable, 440, 200)}
          </section>
        </div>

        {/* Event Log */}
        <section style={{ minWidth: 300, maxWidth: 400 }}>
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>
            Event Log{" "}
            <button
              onClick={() => setLogs([])}
              style={{
                fontSize: 12,
                padding: "2px 8px",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: "pointer",
                marginLeft: 8,
              }}
            >
              Clear
            </button>
          </h2>
          <div
            style={{
              height: 540,
              overflow: "auto",
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
              background: "#fafafa",
            }}
          >
            {logs.length === 0 && (
              <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
                Interact with the tables to see events here
              </div>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: "4px 10px",
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    color: log.event.includes("Enter")
                      ? "#2e7d32"
                      : log.event.includes("Leave")
                        ? "#c62828"
                        : log.event.includes("Double")
                          ? "#7c3aed"
                          : log.event.includes("Down") || log.event.includes("Up")
                            ? "#e65100"
                            : "#1565c0",
                    fontWeight: 600,
                    minWidth: 110,
                  }}
                >
                  {log.event}
                </span>
                <span style={{ color: "#666" }}>{log.component}</span>
                <span style={{ color: "#333" }}>"{log.value}"</span>
                <span style={{ color: "#999" }}>{log.cell}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
