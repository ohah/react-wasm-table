import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Color, type GridCellEvent } from "@ohah/react-wasm-table";
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

const colors = ["#e53935", "#1e88e5", "#43a047", "#fb8c00", "#8e24aa", "#00897b"];

interface LogEntry {
  id: number;
  event: string;
  value: string;
  cell: string;
}
let logId = 0;

export function CanvasColor() {
  const isDark = useDarkMode();
  const data = useMemo(() => generateSmallData() as Row[], []);
  const [borderRadius, setBorderRadius] = useState(0);
  const [borderWidth, setBorderWidth] = useState(0);
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
        header: "Color",
        size: 120,
        cell: (info) => {
          const hash = info.getValue().charCodeAt(0) % colors.length;
          const c = colors[hash]!;
          return (
            <Color
              value={c}
              borderRadius={borderRadius}
              borderWidth={borderWidth}
              borderColor={borderWidth > 0 ? "#333" : undefined}
              onClick={(e) => addLog("onClick", c, e)}
              onMouseEnter={(e) => addLog("onMouseEnter", c, e)}
              onMouseLeave={(e) => addLog("onMouseLeave", c, e)}
            />
          );
        },
      }),
    ],
    [borderRadius, borderWidth, addLog],
  );

  return (
    <>
      <h1>Canvas: Color</h1>
      <p>
        <code>Color</code> draws a centered square color swatch. Supports <code>borderRadius</code>,{" "}
        <code>borderWidth</code>, <code>borderColor</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>borderRadius:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[0, 4, 8, 16].map((n) => (
              <button
                key={n}
                style={borderRadius === n ? btnActive : btnBase}
                onClick={() => setBorderRadius(n)}
              >
                {n}px
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>borderWidth:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                style={borderWidth === n ? btnActive : btnBase}
                onClick={() => setBorderWidth(n)}
              >
                {n}px
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
          <Grid
            data={data}
            columns={columns}
            width={280}
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
            Click or hover over Color cells to see events.
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
                <span style={{ color: "var(--demo-panel-fg)" }}>{log.value}</span>
                <span style={{ color: "var(--demo-muted-5)" }}>{log.cell}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
