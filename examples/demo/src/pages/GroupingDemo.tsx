import { useState, useCallback } from "react";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";
import {
  Grid,
  createColumnHelper,
  useGridTable,
  getGroupedRowModel,
  Text,
  Badge,
  type GroupingState,
  type AggregationFn,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";

// ── Data ──────────────────────────────────────────────────────────

type Employee = {
  id: number;
  name: string;
  department: string;
  title: string;
  salary: number;
  isActive: boolean;
};

const rawData = generateEmployees(100) as unknown as Employee[];

const helper = createColumnHelper<Employee>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("title", { header: "Title", size: 180, padding: [0, 8] }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
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
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
    align: "center",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={info.getValue()}
        color="white"
        backgroundColor={info.getValue() === "Active" ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
];

const GROUPABLE_COLUMNS = ["department", "title", "status"];

// ── Aggregation functions ─────────────────────────────────────────

const aggregationFns: Record<string, AggregationFn<Employee>> = {
  salary: (_colId, leafRows) => {
    let sum = 0;
    for (const r of leafRows) sum += r.getValue("salary") as number;
    return Math.round(sum / leafRows.length);
  },
  name: (_colId, leafRows) => `${leafRows.length} employees`,
};

// ── Styles ────────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 4,
  border: "1px solid var(--demo-border-2)",
  background: "var(--demo-card-bg)", color: "var(--demo-panel-fg)",
  cursor: "pointer",
  fontSize: 13,
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  border: "1px solid #1976d2",
  background: "#1976d2",
  color: "#fff",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 12,
  background: "var(--demo-panel-bg)",
  borderRadius: 6,
};

// ── Component ─────────────────────────────────────────────────────

export function GroupingDemo() {
  const isDark = useDarkMode();
  const [grouping, setGrouping] = useState<GroupingState>(["department"]);

  const handleGroupingChange = useCallback(
    (updater: GroupingState | ((prev: GroupingState) => GroupingState)) => {
      setGrouping((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const table = useGridTable<Employee>({
    data: rawData,
    columns,
    getGroupedRowModel: getGroupedRowModel(),
    aggregationFns,
    state: { sorting: [], columnFilters: [], globalFilter: "", grouping },
    onGroupingChange: handleGroupingChange,
  });

  const model = table.getGroupedRowModel();

  const toggleGroupColumn = (colId: string) => {
    setGrouping((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId],
    );
  };

  return (
    <>
      <h1>Grouped Row Model</h1>
      <p>
        Demonstrates <code>getGroupedRowModel</code> with aggregation. Click column buttons to
        toggle grouping. Group rows show aggregated values (average salary, employee count).
      </p>

      {/* Controls */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: 8, fontSize: 12, color: "var(--demo-muted)" }}>Group by:</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {GROUPABLE_COLUMNS.map((colId) => (
            <button
              key={colId}
              style={grouping.includes(colId) ? btnActive : btnBase}
              onClick={() => toggleGroupColumn(colId)}
            >
              {colId}
              {grouping.includes(colId) && (
                <span style={{ marginLeft: 4, fontSize: 10 }}>({grouping.indexOf(colId) + 1})</span>
              )}
            </button>
          ))}
          <button style={btnBase} onClick={() => table.resetGrouping()}>
            Clear
          </button>
          <span style={{ fontSize: 13, color: "var(--demo-muted)", marginLeft: 8 }}>
            Groups: <strong>{model.rowCount}</strong>
          </span>
        </div>
      </div>

      {/* Canvas Grid — shows raw data; grouped model info displayed below */}
      <Grid
        data={rawData as unknown as Record<string, unknown>[]}
        columns={columns}
        width={800}
        height={400}
        overflowY="scroll"
        theme={isDark ? DARK_THEME : LIGHT_THEME}
      />

      {/* State display */}
      <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <strong>Grouping State:</strong>
          <pre style={{ margin: "4px 0 0", fontSize: 12 }}>{JSON.stringify(grouping, null, 2)}</pre>
        </div>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <strong>Model Info:</strong>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--demo-muted-2)" }}>
            <div>Top-level groups: {model.rowCount}</div>
            <div>
              Total leaf rows:{" "}
              {model.rows.reduce((sum, r) => sum + (r.getLeafRows?.()?.length ?? 0), 0)}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
