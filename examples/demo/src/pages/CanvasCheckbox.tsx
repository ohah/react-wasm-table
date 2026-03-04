import { useState, useMemo, useCallback } from "react";
import {
  Grid,
  createColumnHelper,
  Checkbox,
  Label,
  type GridCellEvent,
} from "@ohah/react-wasm-table";

type Row = { id: number; task: string; category: string; done: boolean };
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

interface LogEntry {
  id: number;
  event: string;
  value: string;
  cell: string;
}
let logId = 0;

const TASKS = [
  "Setup project structure",
  "Design database schema",
  "Implement user auth",
  "Write unit tests",
  "Create API endpoints",
  "Build landing page",
  "Add dark mode",
  "Optimize bundle size",
  "Setup CI/CD pipeline",
  "Write documentation",
  "Code review",
  "Fix mobile layout",
  "Add error boundaries",
  "Implement caching",
  "Setup monitoring",
  "Refactor state management",
  "Add accessibility",
  "Performance audit",
  "Security review",
  "Deploy to staging",
  "User acceptance testing",
  "Launch to production",
  "Post-launch monitoring",
  "Gather user feedback",
  "Plan next sprint",
];

const CATEGORIES = ["Dev", "Design", "QA", "DevOps", "PM"];

function generateTodoData(): Row[] {
  return TASKS.map((task, i) => ({
    id: i,
    task,
    category: CATEGORIES[i % CATEGORIES.length]!,
    done: i % 4 === 0,
  }));
}

export function CanvasCheckbox() {
  const [data, setData] = useState(generateTodoData);
  const [disabled, setDisabled] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((event: string, value: string, e: GridCellEvent) => {
    setLogs((prev) => [
      { id: ++logId, event, value, cell: `(${e.cell.row},${e.cell.col})` },
      ...prev.slice(0, 29),
    ]);
  }, []);

  const doneCount = data.filter((r) => r.done).length;

  const columns = useMemo(
    () => [
      helper.display({
        id: "check",
        header: "Task",
        size: 220,
        cell: (info) => {
          const checked = info.row.original.done;
          return (
            <Checkbox
              checked={checked}
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                if (disabled) return;
                addLog("onClick", String(!checked), e);
                const rowIndex = info.row.index;
                setData((prev) =>
                  prev.map((r, i) => (i === rowIndex ? { ...r, done: !r.done } : r)),
                );
              }}
              onTouchStart={(e) => addLog("onTouchStart", String(checked), e)}
              onTouchEnd={(e) => addLog("onTouchEnd", String(checked), e)}
              onMouseEnter={(e) => addLog("onMouseEnter", String(checked), e)}
              onMouseLeave={(e) => addLog("onMouseLeave", String(checked), e)}
            >
              <Label value={info.row.original.task} />
            </Checkbox>
          );
        },
      }),
      helper.accessor("category", { header: "Category", size: 80, padding: [0, 8] }),
    ],
    [disabled, addLog],
  );

  return (
    <>
      <h1>Canvas: Checkbox</h1>
      <p>
        <code>Checkbox</code> self-draws a checkbox indicator on canvas. Use{" "}
        <code>Label</code> as children for associated text. Scroll down to see all{" "}
        {data.length} rows. Touch events (<code>onTouchStart</code>,{" "}
        <code>onTouchEnd</code>) are supported for mobile.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>disabled:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[false, true].map((v) => (
              <button
                key={String(v)}
                style={disabled === v ? btnActive : btnBase}
                onClick={() => setDisabled(v)}
              >
                {String(v)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Progress:</strong>
          <span>
            {doneCount}/{data.length} done
          </span>
          <button style={btnBase} onClick={() => setData(generateTodoData)}>
            Reset
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Todo List ({data.length} rows — scroll to see all)
          </h2>
          <Grid
            data={data}
            columns={columns}
            width={350}
            height={400}
            rowHeight={36}
            overflowY="auto"
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
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
            Click or tap checkboxes. Touch events are logged on mobile.
          </p>
          <div
            style={{
              height: 340,
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
                    color: log.event.includes("Touch")
                      ? "#7b1fa2"
                      : log.event.includes("Enter")
                        ? "#2e7d32"
                        : log.event.includes("Leave")
                          ? "#c62828"
                          : "#1565c0",
                    fontWeight: 600,
                    minWidth: 110,
                  }}
                >
                  {log.event}
                </span>
                <span style={{ color: "#333" }}>{log.value}</span>
                <span style={{ color: "#999" }}>{log.cell}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
