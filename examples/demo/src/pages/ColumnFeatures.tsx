import { useState, useMemo, useCallback } from "react";
import {
  Grid,
  createColumnHelper,
  type ColumnOrderState,
  type ColumnVisibilityState,
  type ColumnSizingState,
  type ColumnPinningState,
  type ColumnFiltersState,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";

type Employee = {
  id: number;
  name: string;
  department: string;
  salary: number;
  performanceScore: number | null;
};

const helper = createColumnHelper<Employee>();

const columnDefs = [
  helper.accessor("id", {
    header: "ID",
    size: 60,
    align: "right",
    padding: [0, 8],
    enableHiding: false, // ID column cannot be hidden
  }),
  helper.accessor("name", {
    header: "Name",
    size: 160,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("department", {
    header: "Department",
    size: 130,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 110,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("performanceScore", {
    header: "Score",
    size: 90,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

const ALL_COLUMN_IDS = ["id", "name", "department", "salary", "performanceScore"];

const btnBase: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
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

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
};

export function ColumnFeatures() {
  const data = useMemo(() => generateEmployees(500) as Record<string, unknown>[], []);

  // ── Ordering ──
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(ALL_COLUMN_IDS);

  // ── Visibility ──
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // ── Sizing ──
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // ── Pinning ──
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });

  // ── Per-column Filtering ──
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const applyFilters = useCallback(() => {
    const filters: ColumnFiltersState = [];
    if (nameFilter) filters.push({ id: "name", value: nameFilter, op: "contains" });
    if (deptFilter) filters.push({ id: "department", value: deptFilter, op: "eq" });
    setColumnFilters(filters);
  }, [nameFilter, deptFilter]);

  const clearFilters = useCallback(() => {
    setNameFilter("");
    setDeptFilter("");
    setColumnFilters([]);
  }, []);

  // ── Helpers ──
  const toggleVisibility = (colId: string) => {
    setColumnVisibility((prev) => ({ ...prev, [colId]: prev[colId] === false ? true : false }));
  };

  const togglePin = (colId: string, position: "left" | "right") => {
    setColumnPinning((prev) => {
      const inLeft = prev.left.includes(colId);
      const inRight = prev.right.includes(colId);
      let left = prev.left.filter((id) => id !== colId);
      let right = prev.right.filter((id) => id !== colId);

      if (position === "left" && !inLeft) left = [...left, colId];
      else if (position === "right" && !inRight) right = [...right, colId];
      // else: was already pinned there → unpin (already filtered out)

      return { left, right };
    });
  };

  const inputStyle: React.CSSProperties = {
    padding: "3px 6px",
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 12,
    width: 100,
  };

  return (
    <>
      <h1>Column Features</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        Demonstrates per-column <strong>ordering</strong>, <strong>visibility</strong>,{" "}
        <strong>sizing</strong> (+ drag resize), <strong>pinning</strong>, and{" "}
        <strong>filtering</strong> state APIs. Drag a header border to resize columns. See the{" "}
        <strong>Column Pinning</strong> demo for frozen column rendering.
      </p>

      {/* ── Ordering ── */}
      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Column Order</strong>
        <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
          (drag-free reorder via buttons)
        </span>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          {columnOrder.map((colId, idx) => (
            <div
              key={colId}
              style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 12 }}
            >
              <button
                style={btnBase}
                disabled={idx === 0}
                onClick={() =>
                  setColumnOrder((prev) => {
                    const next = [...prev];
                    [next[idx - 1]!, next[idx]!] = [next[idx]!, next[idx - 1]!];
                    return next;
                  })
                }
              >
                ←
              </button>
              <span style={{ padding: "0 4px", fontWeight: 600 }}>{colId}</span>
              <button
                style={btnBase}
                disabled={idx === columnOrder.length - 1}
                onClick={() =>
                  setColumnOrder((prev) => {
                    const next = [...prev];
                    [next[idx]!, next[idx + 1]!] = [next[idx + 1]!, next[idx]!];
                    return next;
                  })
                }
              >
                →
              </button>
            </div>
          ))}
          <button style={btnBase} onClick={() => setColumnOrder(ALL_COLUMN_IDS)}>
            Reset
          </button>
        </div>
      </div>

      {/* ── Visibility ── */}
      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Visibility</strong>
        <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
          (ID column has enableHiding: false)
        </span>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {ALL_COLUMN_IDS.map((colId) => (
            <label key={colId} style={labelStyle}>
              <input
                type="checkbox"
                checked={columnVisibility[colId] !== false}
                disabled={colId === "id"}
                onChange={() => toggleVisibility(colId)}
              />
              {colId}
            </label>
          ))}
        </div>
      </div>

      {/* ── Sizing ── */}
      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Sizing Override</strong>
        <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
          (change column widths via state)
        </span>
        <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
          {ALL_COLUMN_IDS.map((colId) => (
            <label key={colId} style={{ ...labelStyle, flexDirection: "column", gap: 2 }}>
              <span>{colId}</span>
              <input
                type="number"
                value={columnSizing[colId] ?? ""}
                placeholder="default"
                onChange={(e) => {
                  const val = e.target.value;
                  setColumnSizing((prev) => {
                    if (!val) {
                      const { [colId]: _, ...rest } = prev;
                      return rest;
                    }
                    return { ...prev, [colId]: Number(val) };
                  });
                }}
                style={inputStyle}
              />
            </label>
          ))}
          <button style={btnBase} onClick={() => setColumnSizing({})}>
            Reset
          </button>
        </div>
      </div>

      {/* ── Pinning ── */}
      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Pinning</strong>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {ALL_COLUMN_IDS.map((colId) => {
            const isLeft = columnPinning.left.includes(colId);
            const isRight = columnPinning.right.includes(colId);
            return (
              <div key={colId} style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{colId}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    style={isLeft ? btnActive : btnBase}
                    onClick={() => togglePin(colId, "left")}
                  >
                    L
                  </button>
                  <button
                    style={isRight ? btnActive : btnBase}
                    onClick={() => togglePin(colId, "right")}
                  >
                    R
                  </button>
                </div>
              </div>
            );
          })}
          <button
            style={{ ...btnBase, alignSelf: "flex-end" }}
            onClick={() => setColumnPinning({ left: [], right: [] })}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Per-column Filtering ── */}
      <div style={sectionStyle}>
        <strong style={{ fontSize: 13 }}>Per-column Filtering</strong>
        <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "flex-end" }}>
          <label style={{ ...labelStyle, flexDirection: "column", gap: 2, alignItems: "start" }}>
            Name (contains)
            <input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="e.g. Alice"
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, flexDirection: "column", gap: 2, alignItems: "start" }}>
            Department
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ ...inputStyle, width: 120 }}
            >
              <option value="">All</option>
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
            </select>
          </label>
          <button style={btnActive} onClick={applyFilters}>
            Apply
          </button>
          <button style={btnBase} onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {/* ── Grid API ── */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8, color: "#666" }}>Grid API</h3>
        <Grid
          data={data}
          width={600}
          height={500}
          columns={columnDefs}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          columnPinning={columnPinning}
          onColumnPinningChange={setColumnPinning}
          overflowY="scroll"
        />
      </section>

      {/* ── State display ── */}
      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 11,
          overflowX: "auto",
          marginTop: 16,
        }}
      >
        {JSON.stringify(
          {
            columnOrder,
            columnVisibility,
            columnSizing,
            columnPinning,
            columnFilters,
          },
          null,
          2,
        )}
      </pre>

      {/* ── Code snippet ── */}
      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
          marginTop: 12,
        }}
      >
        {`const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(["id", "name", ...]);
const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });

<Grid
  columnOrder={columnOrder}
  onColumnOrderChange={setColumnOrder}
  columnVisibility={columnVisibility}
  onColumnVisibilityChange={setColumnVisibility}
  columnSizing={columnSizing}
  onColumnSizingChange={setColumnSizing}  // also called on drag resize
  columnPinning={columnPinning}
  onColumnPinningChange={setColumnPinning}
/>`}
      </pre>
    </>
  );
}
