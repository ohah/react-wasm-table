import { useState, useMemo, useCallback } from "react";
import {
  Table,
  useReactTable,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  createColumnHelper,
  Dropdown,
} from "@ohah/react-wasm-table";
import { useContainerSize } from "../../useContainerSize";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../../useDarkMode";

type Row = { id: number; name: string; status: string };

const helper = createColumnHelper<Row>();

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "archived", label: "Archived" },
];

const INITIAL_DATA: Row[] = [
  { id: 1, name: "Task Alpha", status: "active" },
  { id: 2, name: "Task Beta", status: "pending" },
  { id: 3, name: "Task Gamma", status: "" },
  { id: 4, name: "Task Delta", status: "archived" },
  { id: 5, name: "Task Epsilon", status: "inactive" },
  { id: 6, name: "Task Zeta", status: "active" },
];

interface LogEntry {
  id: number;
  event: string;
  value: string;
  cell: string;
}
let logId = 0;

export function TanStackCanvasDropdown() {
  const isDark = useDarkMode();
  const [data, setData] = useState(INITIAL_DATA);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { ref, width } = useContainerSize();

  const updateStatus = useCallback((rowIdx: number, value: string) => {
    const label = statusOptions.find((o) => o.value === value)?.label ?? value;
    setLogs((p) => [
      { id: ++logId, event: "onChange", value: label, cell: `row ${rowIdx}` },
      ...p.slice(0, 19),
    ]);
    setData((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, status: value } : r)));
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Task", size: 140, padding: [0, 8] }),
      helper.accessor("status", {
        header: "Status (click to open)",
        size: 200,
        padding: [4, 8],
        cell: (info) => (
          <Dropdown
            value={info.getValue()}
            options={statusOptions}
            placeholder="Select..."
            onChange={(value) => updateStatus(info.row.index, value)}
          >
            <Dropdown.Panel boxShadow="0px 4px 12px rgba(0,0,0,0.1)" borderRadius={8} />
            <Dropdown.Option hoverBackgroundColor="#e0f2fe" selectedColor="#0369a1" />
            <Dropdown.Checkmark color="#0369a1" />
          </Dropdown>
        ),
      }),
    ],
    [updateStatus],
  );

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const btnBase: React.CSSProperties = {
    padding: "2px 8px",
    border: "1px solid var(--demo-border-2)",
    borderRadius: 4,
    background: "var(--demo-card-bg)",
    color: "var(--demo-panel-fg)",
    cursor: "pointer",
    fontSize: 12,
  };

  return (
    <>
      <h1>TanStack: Canvas Dropdown</h1>
      <p>
        <code>Dropdown</code> via TanStack <code>useReactTable</code>. Canvas-only component — no
        DOM overlay. Click to open the dropdown panel and select an option.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div ref={ref} style={{ flex: 1, minWidth: 360 }}>
          <Table
            table={table}
            width={Math.min(width || 440, 500)}
            height={280}
            rowHeight={40}
            theme={isDark ? DARK_THEME : LIGHT_THEME}
          />
        </div>

        <section style={{ minWidth: 240, maxWidth: 320 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Event Log{" "}
            <button onClick={() => setLogs([])} style={btnBase}>
              Clear
            </button>
          </h2>
          <div
            style={{
              height: 240,
              overflow: "auto",
              border: "1px solid var(--demo-border-2)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
              background: "var(--demo-card-bg)",
            }}
          >
            {logs.length === 0 && (
              <div
                style={{ padding: 16, color: "var(--demo-muted-fg, #999)", textAlign: "center" }}
              >
                No events yet
              </div>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: "4px 10px",
                  borderBottom: "1px solid var(--demo-border-1)",
                  display: "flex",
                  gap: 8,
                }}
              >
                <span style={{ color: "#1565c0", fontWeight: 600, minWidth: 60 }}>{log.event}</span>
                <span style={{ color: "var(--demo-panel-fg)" }}>{log.value}</span>
                <span style={{ color: "var(--demo-muted-fg, #999)" }}>{log.cell}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
