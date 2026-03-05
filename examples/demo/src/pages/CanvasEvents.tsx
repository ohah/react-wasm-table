import { useState, useMemo, useCallback } from "react";
import {
  Grid,
  createColumnHelper,
  Link,
  Chip,
  Badge,
  Tag,
  Rating,
  Text,
  Flex,
  type GridCellEvent,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

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

export function CanvasEvents() {
  const isDark = useDarkMode();
  const data = useMemo(() => generateSmallData() as Row[], []);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (event: string, component: string, value: string, e: GridCellEvent) => {
      setLogs((prev) => [
        { id: ++logId, event, component, value, cell: `(${e.cell.row},${e.cell.col})` },
        ...prev.slice(0, 29),
      ]);
    },
    [],
  );

  // ── Example 1: Basic onClick on various components ──
  const basicColumns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 120,
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
        size: 130,
        padding: [0, 8],
        cell: (info) => (
          <Link
            value={info.getValue()}
            href={`#${info.getValue().toLowerCase()}`}
            onClick={(e) => {
              e.preventDefault(); // prevent default URL open
              addLog("onClick", "Link", info.getValue(), e);
            }}
          />
        ),
      }),
      helper.accessor("salary", {
        header: "Salary (Chip)",
        size: 130,
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

  // ── Example 2: Hover events (mouseEnter / mouseLeave) ──
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const hoverColumns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 140,
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
        size: 130,
        padding: [0, 8],
        cell: (info) => {
          const stars = Math.round(info.getValue() / 20);
          return (
            <Rating
              value={stars}
              max={5}
              color="#f59e0b"
              onMouseEnter={(e) => {
                setHoveredCell(`Rating ${stars}/5 (${e.cell.row},${e.cell.col})`);
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

  // ── Example 3: Combined events (onClick + onDoubleClick + onMouseDown) ──
  const combinedColumns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 140,
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
        size: 130,
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
        size: 140,
        padding: [0, 8],
        cell: (info) => (
          <Flex gap={4} alignItems="center">
            <Badge
              value={`$${info.getValue().toLocaleString()}`}
              backgroundColor={info.getValue() > 85000 ? "#c8e6c9" : "#ffecb3"}
              color="#333"
              onClick={(e) => addLog("onClick", "Badge(Flex)", String(info.getValue()), e)}
            />
          </Flex>
        ),
      }),
    ],
    [addLog],
  );

  return (
    <>
      <h1>Canvas: Component Events</h1>
      <p>
        Canvas components support HTMLElement-like event handlers: <code>onClick</code>,{" "}
        <code>onDoubleClick</code>, <code>onMouseDown</code>, <code>onMouseUp</code>,{" "}
        <code>onMouseEnter</code>, <code>onMouseLeave</code>. Use{" "}
        <code>event.preventDefault()</code> to suppress default actions (e.g. Link navigation).
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Left: Grids */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Example 1 */}
          <section>
            <h2 style={{ fontSize: 15, marginBottom: 6 }}>1. onClick</h2>
            <p style={{ fontSize: 13, color: "var(--demo-muted)", margin: "0 0 8px" }}>
              Click Text / Link / Chip. Link's <code>preventDefault()</code> blocks URL open.
            </p>
            <Grid
              data={data}
              columns={basicColumns}
              width={400}
              height={200}
              rowHeight={36}
              theme={isDark ? DARK_THEME : LIGHT_THEME}
            />
          </section>

          {/* Example 2 */}
          <section>
            <h2 style={{ fontSize: 15, marginBottom: 6 }}>2. onMouseEnter / onMouseLeave</h2>
            <p style={{ fontSize: 13, color: "var(--demo-muted)", margin: "0 0 8px" }}>
              Hover over Badge / Tag / Rating cells.{" "}
              {hoveredCell ? (
                <strong style={{ color: "#1976d2" }}>Hovered: {hoveredCell}</strong>
              ) : (
                <span style={{ color: "var(--demo-muted-5)" }}>Not hovering</span>
              )}
            </p>
            <Grid
              data={data}
              columns={hoverColumns}
              width={430}
              height={200}
              rowHeight={36}
              theme={isDark ? DARK_THEME : LIGHT_THEME}
            />
          </section>

          {/* Example 3 */}
          <section>
            <h2 style={{ fontSize: 15, marginBottom: 6 }}>
              3. Combined (click + dblclick + mousedown + mouseup)
            </h2>
            <p style={{ fontSize: 13, color: "var(--demo-muted)", margin: "0 0 8px" }}>
              All events fire in DOM order: mousedown &rarr; mouseup &rarr; click &rarr; dblclick.
            </p>
            <Grid
              data={data}
              columns={combinedColumns}
              width={430}
              height={200}
              rowHeight={36}
              theme={isDark ? DARK_THEME : LIGHT_THEME}
            />
          </section>
        </div>

        {/* Right: Event Log */}
        <section style={{ minWidth: 300, maxWidth: 400 }}>
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>
            Event Log{" "}
            <button
              onClick={() => setLogs([])}
              style={{
                fontSize: 12,
                padding: "2px 8px",
                border: "1px solid var(--demo-border-2)",
                borderRadius: 4,
                background: "var(--demo-card-bg)",
                color: "var(--demo-panel-fg)",
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
              border: "1px solid var(--demo-border)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
              background: "var(--demo-panel-bg)",
            }}
          >
            {logs.length === 0 && (
              <div style={{ padding: 16, color: "var(--demo-muted-5)", textAlign: "center" }}>
                Interact with the grids to see events here
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
                <span style={{ color: "var(--demo-muted)" }}>{log.component}</span>
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
