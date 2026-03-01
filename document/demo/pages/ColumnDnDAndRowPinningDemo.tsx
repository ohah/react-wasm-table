import { useState, useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  type ColumnOrderState,
  type ColumnPinningState,
  type RowPinningState,
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
    size: 70,
    align: "right",
    padding: [0, 8],
    enableSorting: true,
  }),
  helper.accessor("name", {
    header: "Name",
    size: 160,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("performanceScore", {
    header: "Score",
    size: 100,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

const ALL_COLUMN_IDS = ["id", "name", "department", "salary", "performanceScore"];

const btnBase: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 4,
  border: "1px solid var(--demo-border-2)",
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
  padding: 14,
  background: "var(--demo-panel-bg)",
  borderRadius: 8,
};

export function ColumnDnDAndRowPinningDemo() {
  const data = useMemo(
    () => generateEmployees(200) as (Record<string, unknown> & { id: number })[],
    [],
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(ALL_COLUMN_IDS);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: [],
    right: [],
  });
  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    top: [],
    bottom: [],
  });

  const getRowId = (row: Record<string, unknown>, index: number) => String(row.id ?? index);

  const toggleRowPin = (rowId: string, position: "top" | "bottom") => {
    setRowPinning((prev) => {
      const inTop = prev.top.includes(rowId);
      const inBottom = prev.bottom.includes(rowId);
      let top = prev.top.filter((id) => id !== rowId);
      let bottom = prev.bottom.filter((id) => id !== rowId);
      if (position === "top" && !inTop) top = [...top, rowId];
      else if (position === "bottom" && !inBottom) bottom = [...bottom, rowId];
      return { top, bottom };
    });
  };

  const firstRowId = data.length > 0 ? getRowId(data[0]!, 0) : null;
  const lastRowId = data.length > 0 ? getRowId(data[data.length - 1]!, data.length - 1) : null;

  return (
    <>
      <h1>Column DnD & Row Pinning</h1>
      <p style={{ fontSize: 14, color: "var(--demo-muted-2)", marginBottom: 20 }}>
        <strong>Column DnD:</strong> Drag headers to reorder columns. <strong>Row Pinning:</strong>{" "}
        Pin specific rows to the top or bottom (state API only; rendering to be applied).
      </p>

      {/* Column DnD */}
      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Column DnD Reorder</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--demo-muted)" }}>
          Drag a header with the mouse; a ghost follows the cursor and a blue vertical line shows
          the drop position. Releasing updates the column order.
        </p>
        <div style={{ marginBottom: 8, fontSize: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={columnOrder.length > 0}
              readOnly
              style={{ marginRight: 6 }}
            />
            enableColumnDnD enabled
          </label>
        </div>
      </div>

      {/* Row Pinning */}
      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Row Pinning (state)</h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--demo-muted)" }}>
          Pin rows to the top or bottom. Specify row IDs via getRowId and control with rowPinning
          state.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {firstRowId && (
            <>
              <button
                style={rowPinning.top.includes(firstRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(firstRowId, "top")}
              >
                First row → Pin to top
              </button>
              <button
                style={rowPinning.bottom.includes(firstRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(firstRowId, "bottom")}
              >
                First row → Pin to bottom
              </button>
            </>
          )}
          {lastRowId && lastRowId !== firstRowId && (
            <>
              <button
                style={rowPinning.top.includes(lastRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(lastRowId, "top")}
              >
                Last row → Pin to top
              </button>
              <button
                style={rowPinning.bottom.includes(lastRowId) ? btnActive : btnBase}
                onClick={() => toggleRowPin(lastRowId, "bottom")}
              >
                Last row → Pin to bottom
              </button>
            </>
          )}
          <button style={btnBase} onClick={() => setRowPinning({ top: [], bottom: [] })}>
            Unpin all
          </button>
        </div>
      </div>

      {/* Grid API */}
      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Grid API</h2>
        <Grid
          data={data}
          width={700}
          height={380}
          columns={columnDefs}
          sorting={sorting}
          onSortingChange={setSorting}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          columnPinning={columnPinning}
          onColumnPinningChange={setColumnPinning}
          rowPinning={rowPinning}
          onRowPinningChange={setRowPinning}
          getRowId={getRowId}
          enableColumnDnD
          overflowY="scroll"
        />
      </div>

      {/* State */}
      <div style={sectionStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>State</h2>
        <pre
          style={{
            margin: 0,
            background: "var(--demo-code-bg)",
          color: "var(--demo-code-fg)",
            padding: 12,
            borderRadius: 4,
            fontSize: 11,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(
            {
              columnOrder,
              columnPinning,
              rowPinning,
              sorting,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </>
  );
}
