import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Link, type GridCellEvent } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid var(--demo-border-2)",
  borderRadius: 4,
  background: "var(--demo-card-bg)",
  color: "var(--demo-panel-fg)",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

interface LogEntry {
  id: number;
  event: string;
  value: string;
  cell: string;
}
let logId = 0;

export function CanvasLink() {
  const isDark = useDarkMode();
  const data = useMemo(() => generateSmallData() as Row[], []);
  const [color, setColor] = useState("#2563eb");
  const [underline, setUnderline] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((event: string, value: string, e: GridCellEvent) => {
    setLogs((prev) => [
      { id: ++logId, event, value, cell: `(${e.cell.row},${e.cell.col})` },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("dept", {
        header: "Link",
        size: 200,
        padding: [0, 8],
        cell: (info) => (
          <Link
            value={info.getValue()}
            href={`#${info.getValue().toLowerCase()}`}
            color={color}
            underline={underline}
            onClick={(e) => {
              e.preventDefault();
              addLog("onClick", info.getValue(), e);
            }}
            onMouseEnter={(e) => addLog("onMouseEnter", info.getValue(), e)}
            onMouseLeave={(e) => addLog("onMouseLeave", info.getValue(), e)}
          />
        ),
      }),
    ],
    [color, underline, addLog],
  );

  return (
    <>
      <h1>Canvas: Link</h1>
      <p>
        <code>Link</code> draws text with link color and optional underline. Supports{" "}
        <code>color</code>, <code>fontSize</code>, <code>underline</code>, <code>href</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>color:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {["#2563eb", "#e53935", "#2e7d32", "#7c3aed"].map((c) => (
              <button key={c} style={color === c ? btnActive : btnBase} onClick={() => setColor(c)}>
                <span style={{ color: c }}>Link</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>underline:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button style={underline ? btnActive : btnBase} onClick={() => setUnderline(true)}>
              On
            </button>
            <button style={!underline ? btnActive : btnBase} onClick={() => setUnderline(false)}>
              Off
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
          <Grid
            data={data}
            columns={columns}
            width={360}
            height={460}
            rowHeight={40}
            theme={isDark ? DARK_THEME : LIGHT_THEME}
          />
        </section>

        <section style={{ minWidth: 260, maxWidth: 360 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Event Log{" "}
            <button
              onClick={() => setLogs([])}
              style={{ ...btnBase, fontSize: 12, padding: "2px 8px", marginLeft: 8 }}
            >
              Clear
            </button>
          </h2>
          <p style={{ fontSize: 13, color: "var(--demo-muted)", margin: "0 0 8px" }}>
            Click or hover over Link cells. <code>onClick</code> calls <code>preventDefault()</code>{" "}
            to block URL open.
          </p>
          <div
            style={{
              height: 400,
              overflow: "auto",
              border: "1px solid var(--demo-border)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
              background: "var(--demo-panel-bg)",
            }}
          >
            {logs.length === 0 && (
              <div style={{ padding: 16, color: "var(--demo-muted-5)", textAlign: "center" }}>
                No events yet
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
                        : "#1565c0",
                    fontWeight: 600,
                    minWidth: 100,
                  }}
                >
                  {log.event}
                </span>
                <span style={{ color: "var(--demo-panel-fg)" }}>"{log.value}"</span>
                <span style={{ color: "var(--demo-muted-5)" }}>{log.cell}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
