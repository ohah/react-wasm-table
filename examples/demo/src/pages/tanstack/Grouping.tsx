import { useState, useCallback } from "react";
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getGroupedRowModel,
  type GroupingState,
  type AggregationFn,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";

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
  helper.accessor("name", { header: "Name", size: 180 }),
  helper.accessor("department", { header: "Department", size: 140 }),
  helper.accessor("title", { header: "Title", size: 180 }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right" }),
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
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
  border: "1px solid #ccc",
  background: "#fff",
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
  background: "#f9f9f9",
  borderRadius: 6,
};

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  background: "#f5f5f5",
  fontSize: 13,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderBottom: "1px solid #eee",
  fontSize: 13,
};

// ── Component ─────────────────────────────────────────────────────

export function TanStackGrouping() {
  const [grouping, setGrouping] = useState<GroupingState>(["department"]);

  const handleGroupingChange = useCallback(
    (updater: GroupingState | ((prev: GroupingState) => GroupingState)) => {
      setGrouping((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const table = useReactTable<Employee>({
    data: rawData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    aggregationFns,
    state: { grouping },
    onGroupingChange: handleGroupingChange,
  });

  const model = table.getGroupedRowModel();

  const toggleGroupColumn = (colId: string) => {
    setGrouping((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId],
    );
  };

  const formatSalary = (n: number | unknown) =>
    typeof n === "number" ? "$" + n.toLocaleString("en-US") : "";

  return (
    <>
      <h1>Grouped Row Model</h1>
      <p>
        Demonstrates <code>getGroupedRowModel</code> with aggregation. Click column buttons to
        toggle grouping. Group rows show aggregated values (average salary, employee count).
      </p>

      {/* Controls */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>Group by:</div>
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
          <span style={{ fontSize: 13, color: "#666", marginLeft: 8 }}>
            Groups: <strong>{model.rowCount}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 250 }}>Name / Group</th>
              <th style={{ ...thStyle, width: 140 }}>Department</th>
              <th style={{ ...thStyle, width: 180 }}>Title</th>
              <th style={{ ...thStyle, width: 120, textAlign: "right" }}>Salary</th>
              <th style={{ ...thStyle, width: 100 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => {
              const isGroup = row.id.startsWith("group:");

              if (isGroup) {
                return (
                  <tr key={row.id} style={{ background: "#e3f2fd" }}>
                    <td
                      style={{ ...tdStyle, fontWeight: 600, paddingLeft: 12 + row.depth * 20 }}
                      colSpan={5}
                    >
                      <span style={{ color: "#1976d2", marginRight: 4 }}>
                        {row.getIsExpanded() ? "▼" : "▶"}
                      </span>
                      {String(row.getValue(grouping[row.depth] ?? "") ?? "")}
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: "#666",
                          fontWeight: 400,
                        }}
                      >
                        {row.getValue("name") as string}
                        {row.getValue("salary") != null &&
                          ` | Avg salary: ${formatSalary(row.getValue("salary"))}`}
                      </span>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.id}>
                  <td style={{ ...tdStyle, paddingLeft: 12 + row.depth * 20 }}>
                    {row.original.name}
                  </td>
                  <td style={tdStyle}>{row.original.department}</td>
                  <td style={tdStyle}>{row.original.title}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {formatSalary(row.original.salary)}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 11,
                        background: row.original.isActive ? "#e8f5e9" : "#ffebee",
                        color: row.original.isActive ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {row.original.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* State display */}
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <strong>Grouping State:</strong>
          <pre style={{ margin: "4px 0 0", fontSize: 12 }}>{JSON.stringify(grouping, null, 2)}</pre>
        </div>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <strong>Model Info:</strong>
          <div style={{ marginTop: 4, fontSize: 13, color: "#555" }}>
            <div>Top-level groups: {model.rowCount}</div>
            <div>
              Total leaf rows:{" "}
              {model.rows.reduce((sum, r) => sum + (r.getLeafRows?.()?.length ?? 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Code snippet */}
      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {`const [grouping, setGrouping] = useState<GroupingState>(["department"]);

const aggregationFns = {
  salary: (colId, leafRows) => {
    let sum = 0;
    for (const r of leafRows) sum += r.getValue("salary");
    return Math.round(sum / leafRows.length);
  },
  name: (colId, leafRows) => \`\${leafRows.length} employees\`,
};

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getGroupedRowModel: getGroupedRowModel(),
  aggregationFns,
  state: { grouping },
  onGroupingChange: setGrouping,
});

const model = table.getGroupedRowModel();
// model.rows → group rows with subRows containing leaves
// row.id          → "group:columnId:value"
// row.getValue()  → aggregated value or group key
// row.subRows     → child rows (next group level or leaf rows)
// row.getLeafRows() → all leaf descendants`}
      </pre>
    </>
  );
}
