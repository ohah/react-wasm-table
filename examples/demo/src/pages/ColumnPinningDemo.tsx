import { useState, useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  type ColumnPinningState,
  type ColumnOrderState,
  type SortingState,
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
    size: 80,
    align: "right",
    padding: [0, 8],
    enableSorting: true,
  }),
  helper.accessor("name", {
    header: "Name",
    size: 180,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("department", {
    header: "Department",
    size: 150,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 140,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("performanceScore", {
    header: "Score",
    size: 120,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.display({
    id: "region",
    header: "Region",
    size: 130,
  }),
  helper.display({
    id: "joinDate",
    header: "Join Date",
    size: 130,
  }),
];

const ALL_COLUMN_IDS = [
  "id",
  "name",
  "department",
  "salary",
  "performanceScore",
  "region",
  "joinDate",
];

const btnBase: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontSize: 11,
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  border: "1px solid #1976d2",
  background: "#1976d2",
  color: "#fff",
};

export function ColumnPinningDemo() {
  const data = useMemo(() => generateEmployees(1000) as Record<string, unknown>[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(ALL_COLUMN_IDS);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: ["id"],
    right: ["joinDate"],
  });

  const togglePin = (colId: string, position: "left" | "right") => {
    setColumnPinning((prev) => {
      const inLeft = prev.left.includes(colId);
      const inRight = prev.right.includes(colId);
      let left = prev.left.filter((id) => id !== colId);
      let right = prev.right.filter((id) => id !== colId);

      if (position === "left" && !inLeft) left = [...left, colId];
      else if (position === "right" && !inRight) right = [...right, colId];

      return { left, right };
    });
  };

  return (
    <>
      <h1>Column Pinning</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        Pin columns to the <strong>left</strong> or <strong>right</strong> edge. Drag headers to
        reorder columns. Pinned columns stay fixed while scrolling horizontally. The grid uses 7
        columns (930px total) in a 700px viewport to ensure horizontal scrolling.
      </p>

      {/* Pin controls */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#f9f9f9",
          borderRadius: 6,
        }}
      >
        <strong style={{ fontSize: 13 }}>Pin Controls</strong>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
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
                    Pin L
                  </button>
                  <button
                    style={isRight ? btnActive : btnBase}
                    onClick={() => togglePin(colId, "right")}
                  >
                    Pin R
                  </button>
                </div>
              </div>
            );
          })}
          <button
            style={{ ...btnBase, alignSelf: "flex-end" }}
            onClick={() => setColumnPinning({ left: [], right: [] })}
          >
            Unpin All
          </button>
        </div>
      </div>

      {/* Grid API */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8, color: "#666" }}>Grid API</h3>
        <Grid
          data={data}
          width={700}
          height={520}
          columns={columnDefs}
          sorting={sorting}
          onSortingChange={setSorting}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          columnPinning={columnPinning}
          onColumnPinningChange={setColumnPinning}
          enableColumnDnD
          overflowY="scroll"
        />
      </section>

      {/* State display */}
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
        {JSON.stringify({ columnOrder, columnPinning, sorting }, null, 2)}
      </pre>
    </>
  );
}
