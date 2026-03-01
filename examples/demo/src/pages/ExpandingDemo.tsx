import { useState, useMemo, useCallback } from "react";
import {
  createColumnHelper,
  useGridTable,
  getExpandedRowModel,
  type ExpandedState,
} from "@ohah/react-wasm-table";

// ── Tree data type ─────────────────────────────────────────────────

type Department = {
  name: string;
  headcount: number;
  budget: number;
  children?: Department[];
};

const treeData: Department[] = [
  {
    name: "Engineering",
    headcount: 45,
    budget: 5200000,
    children: [
      {
        name: "Frontend",
        headcount: 15,
        budget: 1800000,
        children: [
          { name: "Web Team", headcount: 8, budget: 960000 },
          { name: "Mobile Team", headcount: 7, budget: 840000 },
        ],
      },
      {
        name: "Backend",
        headcount: 18,
        budget: 2100000,
        children: [
          { name: "API Team", headcount: 10, budget: 1200000 },
          { name: "Infra Team", headcount: 8, budget: 900000 },
        ],
      },
      { name: "QA", headcount: 12, budget: 1300000 },
    ],
  },
  {
    name: "Product",
    headcount: 12,
    budget: 1500000,
    children: [
      { name: "Product Management", headcount: 5, budget: 650000 },
      { name: "UX Research", headcount: 4, budget: 500000 },
      { name: "Data Analytics", headcount: 3, budget: 350000 },
    ],
  },
  {
    name: "Design",
    headcount: 8,
    budget: 900000,
    children: [
      { name: "UI Design", headcount: 5, budget: 550000 },
      { name: "Brand Design", headcount: 3, budget: 350000 },
    ],
  },
  { name: "HR", headcount: 6, budget: 500000 },
  { name: "Finance", headcount: 5, budget: 450000 },
];

const helper = createColumnHelper<Department>();

const columns = [
  helper.accessor("name", { header: "Department", size: 250 }),
  helper.accessor("headcount", { header: "Headcount", size: 100, align: "right" }),
  helper.accessor("budget", { header: "Budget", size: 140, align: "right" }),
];

// ── Styles ─────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────

export function ExpandingDemo() {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const handleExpandedChange = useCallback(
    (updater: ExpandedState | ((prev: ExpandedState) => ExpandedState)) => {
      setExpanded((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const table = useGridTable<Department>({
    data: treeData,
    columns,
    getSubRows: (row) => row.children,
    getExpandedRowModel: getExpandedRowModel(),
    state: { sorting: [], columnFilters: [], globalFilter: "", expanded },
    onExpandedChange: handleExpandedChange,
  });

  const expandedModel = table.getExpandedRowModel();

  const formatBudget = (n: number) => "$" + n.toLocaleString("en-US");

  return (
    <>
      <h1>Expanding Row Model</h1>
      <p>
        Demonstrates <code>getExpandedRowModel</code> with tree data. Uses <code>getSubRows</code>{" "}
        to define hierarchy and <code>expanded</code> state to control which rows are visible.
      </p>

      {/* Controls */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            style={expanded === true ? btnActive : btnBase}
            onClick={() => table.toggleAllRowsExpanded()}
          >
            {expanded === true ? "Collapse All" : "Expand All"}
          </button>
          <button style={btnBase} onClick={() => table.resetExpanded()}>
            Reset
          </button>
          <span style={{ fontSize: 13, color: "#666", marginLeft: 8 }}>
            Visible rows: <strong>{expandedModel.rowCount}</strong>
          </span>
        </div>
      </div>

      {/* Tree table */}
      <div
        style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 280 }}>Department</th>
              <th style={{ ...thStyle, width: 100, textAlign: "right" }}>Headcount</th>
              <th style={{ ...thStyle, width: 140, textAlign: "right" }}>Budget</th>
            </tr>
          </thead>
          <tbody>
            {expandedModel.rows.map((row) => (
              <tr
                key={row.id}
                style={{
                  background: row.depth === 0 ? "#fff" : row.depth === 1 ? "#fafafa" : "#f5f5f5",
                }}
              >
                <td style={tdStyle}>
                  <span style={{ paddingLeft: row.depth * 20 }}>
                    {row.getCanExpand() ? (
                      <button
                        onClick={() => row.toggleExpanded()}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          padding: "0 4px",
                          fontSize: 14,
                          color: "#1976d2",
                        }}
                      >
                        {row.getIsExpanded() ? "▼" : "▶"}
                      </button>
                    ) : (
                      <span style={{ padding: "0 4px", fontSize: 14, color: "#ccc" }}>•</span>
                    )}
                    {row.original.name}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{row.original.headcount}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {formatBudget(row.original.budget)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* State display */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <strong>Expanded State:</strong>
          <pre style={{ margin: "4px 0 0", fontSize: 12 }}>{JSON.stringify(expanded, null, 2)}</pre>
        </div>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <strong>Row Model Info:</strong>
          <div style={{ marginTop: 4, fontSize: 13, color: "#555" }}>
            <div>Total visible rows: {expandedModel.rowCount}</div>
            <div>Expandable rows: {expandedModel.rows.filter((r) => r.getCanExpand()).length}</div>
            <div>Leaf rows: {expandedModel.rows.filter((r) => !r.getCanExpand()).length}</div>
            <div>Max depth: {Math.max(0, ...expandedModel.rows.map((r) => r.depth))}</div>
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
          marginTop: 16,
        }}
      >
        {`const [expanded, setExpanded] = useState<ExpandedState>({});

const table = useGridTable({
  data: treeData,
  columns,
  getSubRows: (row) => row.children,
  getExpandedRowModel: getExpandedRowModel(),
  state: { ..., expanded },
  onExpandedChange: setExpanded,
});

const model = table.getExpandedRowModel();
// model.rows → flat array of visible rows (with depth, subRows, etc.)

// Per-row API:
// row.depth        → nesting level (0 = root)
// row.subRows      → child Row objects
// row.getCanExpand() → has children?
// row.getIsExpanded() → currently expanded?
// row.toggleExpanded() → toggle expand/collapse
// row.getLeafRows()   → all leaf descendants`}
      </pre>
    </>
  );
}
