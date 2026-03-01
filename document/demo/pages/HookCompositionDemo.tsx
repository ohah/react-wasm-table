import { useState, useMemo, useCallback, useRef } from "react";
import {
  Grid,
  createColumnHelper,
  Text,
  Badge,
  type SortingState,
  type NormalizedRange,
  type GridCellEvent,
  type GridHeaderEvent,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";

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
  helper.accessor("name", {
    header: "Name",
    size: 170,
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

export function HookCompositionDemo() {
  const data = useMemo(() => generateEmployees(5000) as Record<string, unknown>[], []);

  // Sorting
  const [sorting, setSorting] = useState<SortingState>([]);

  // Selection
  const [selection, setSelection] = useState<NormalizedRange | null>(null);

  // Event log
  const [events, setEvents] = useState<EventEntry[]>([]);
  const nextId = useRef(0);

  const logEvent = useCallback((type: string, detail: string) => {
    const now = new Date();
    const time = `${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
    setEvents((prev) => {
      const entry: EventEntry = { id: nextId.current++, time, type, detail };
      const next = [entry, ...prev];
      return next.length > 30 ? next.slice(0, 30) : next;
    });
  }, []);

  // Callbacks
  const onCellClick = useCallback(
    (event: GridCellEvent) => {
      logEvent("cellClick", `(${event.cell.row}, ${event.cell.col})`);
    },
    [logEvent],
  );

  const onHeaderClick = useCallback(
    (event: GridHeaderEvent) => {
      logEvent("headerClick", `col ${event.colIndex}`);
    },
    [logEvent],
  );

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      setSorting(next);
      logEvent(
        "sortChange",
        next.length > 0 ? `${next[0]!.id} ${next[0]!.desc ? "desc" : "asc"}` : "cleared",
      );
    },
    [logEvent],
  );

  const handleSelectionChange = useCallback(
    (next: NormalizedRange | null) => {
      setSelection(next);
      if (next) {
        const rows = next.maxRow - next.minRow + 1;
        const cols = next.maxCol - next.minCol + 1;
        logEvent(
          "selectionChange",
          `${rows}x${cols} (r${next.minRow}-${next.maxRow}, c${next.minCol}-${next.maxCol})`,
        );
      } else {
        logEvent("selectionChange", "cleared");
      }
    },
    [logEvent],
  );

  // Computed stats
  const selectionSummary = useMemo(() => {
    if (!selection) return null;
    const rows = data.slice(selection.minRow, selection.maxRow + 1) as Record<string, unknown>[];
    const salaries = rows.map((r) => (r.salary as number) ?? 0);
    return {
      count: rows.length,
      totalSalary: salaries.reduce((a, b) => a + b, 0),
      avgSalary: Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length),
      minSalary: Math.min(...salaries),
      maxSalary: Math.max(...salaries),
    };
  }, [selection, data]);

  return (
    <>
      <h1>Hook Composition</h1>
      <p>
        All hooks compose through Grid props. Sorting, selection, and event callbacks work together,
        with external state displayed in real-time panels.
      </p>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>Grid API</h4>
            <Grid
              data={data}
              width={580}
              height={450}
              columns={columns}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              selection={selection}
              onSelectionChange={handleSelectionChange}
              onCellClick={onCellClick}
              onHeaderClick={onHeaderClick}
              overflowY="scroll"
            />
          </section>
        </div>

        {/* Side panels */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
          {/* Sorting state */}
          <Panel title="Sorting State">
            {sorting.length > 0 ? (
              sorting.map((s) => (
                <div key={s.id}>
                  <code>{s.id}</code>{" "}
                  <span style={{ color: s.desc ? "#d32f2f" : "#2e7d32" }}>
                    {s.desc ? "descending" : "ascending"}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: "var(--demo-muted-5)" }}>No sorting applied</span>
            )}
          </Panel>

          {/* Selection state */}
          <Panel title="Selection Summary">
            {selectionSummary ? (
              <>
                <div>
                  <strong>{selectionSummary.count}</strong> rows selected
                </div>
                <div>
                  Salary: avg <strong>${selectionSummary.avgSalary.toLocaleString()}</strong>
                  {" | "}min ${selectionSummary.minSalary.toLocaleString()}
                  {" | "}max ${selectionSummary.maxSalary.toLocaleString()}
                </div>
                <div>Total: ${selectionSummary.totalSalary.toLocaleString()}</div>
              </>
            ) : (
              <span style={{ color: "var(--demo-muted-5)" }}>No selection — click and drag cells</span>
            )}
          </Panel>

          {/* Event log */}
          <Panel title="Event Log" flex>
            {events.length === 0 && <span style={{ color: "var(--demo-muted-5)" }}>Interact with grid...</span>}
            {events.map((e) => (
              <div key={e.id} style={{ marginBottom: 1 }}>
                <span style={{ color: "var(--demo-muted-4)" }}>{e.time}</span>{" "}
                <span style={{ color: "#4ec9b0" }}>{e.type}</span> <span>{e.detail}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Panel({
  title,
  children,
  flex,
}: {
  title: string;
  children: React.ReactNode;
  flex?: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        background: "var(--demo-panel-bg)",
        borderRadius: 6,
        border: "1px solid #eee",
        fontSize: 13,
        lineHeight: 1.6,
        ...(flex ? { flex: 1, overflowY: "auto" } : {}),
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#333" }}>{title}</div>
      {children}
    </div>
  );
}
