import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Chip, type GridCellEvent } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

const presets: { label: string; color: string; backgroundColor: string }[] = [
  { label: "Blue", color: "#fff", backgroundColor: "#1976d2" },
  { label: "Green", color: "#fff", backgroundColor: "#2e7d32" },
  { label: "Orange", color: "#fff", backgroundColor: "#e65100" },
  { label: "Gray", color: "#333", backgroundColor: "#e0e0e0" },
];

interface LogEntry {
  id: number;
  event: string;
  value: string;
  cell: string;
}
let logId = 0;

export function CanvasChip() {
  const data = useMemo(() => generateSmallData() as Row[], []);
  const [presetIndex, setPresetIndex] = useState(0);
  const [closable, setClosable] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const preset = presets[presetIndex]!;

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
        header: "Chip",
        size: 200,
        padding: [0, 12],
        cell: (info) => (
          <Chip
            value={info.getValue()}
            color={preset.color}
            backgroundColor={preset.backgroundColor}
            closable={closable}
            onClick={(e) => addLog("onClick", info.getValue(), e)}
            onDoubleClick={(e) => addLog("onDoubleClick", info.getValue(), e)}
            onMouseEnter={(e) => addLog("onMouseEnter", info.getValue(), e)}
            onMouseLeave={(e) => addLog("onMouseLeave", info.getValue(), e)}
          />
        ),
      }),
    ],
    [preset, closable, addLog],
  );

  return (
    <>
      <h1>Canvas: Chip</h1>
      <p>
        <code>Chip</code> draws a filled pill with optional close button. Supports{" "}
        <code>color</code>, <code>backgroundColor</code>, <code>borderRadius</code>,{" "}
        <code>closable</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>Preset:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {presets.map((p, i) => (
              <button
                key={p.label}
                style={presetIndex === i ? btnActive : btnBase}
                onClick={() => setPresetIndex(i)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>closable:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button style={!closable ? btnActive : btnBase} onClick={() => setClosable(false)}>
              Off
            </button>
            <button style={closable ? btnActive : btnBase} onClick={() => setClosable(true)}>
              On
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
          <Grid data={data} columns={columns} width={360} height={460} rowHeight={40} />
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
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
            Click, double-click, or hover over Chip cells to see events.
          </p>
          <div
            style={{
              height: 400,
              overflow: "auto",
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
              background: "#fafafa",
            }}
          >
            {logs.length === 0 && (
              <div style={{ padding: 16, color: "#999", textAlign: "center" }}>No events yet</div>
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
                          : "#1565c0",
                    fontWeight: 600,
                    minWidth: 100,
                  }}
                >
                  {log.event}
                </span>
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
