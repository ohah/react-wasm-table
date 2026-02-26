import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssOverflow } from "@ohah/react-wasm-table";
import { generateSmallData, generateEmployees } from "../data";
import { CssGrid } from "../components/CssGrid";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const smallHelper = createColumnHelper<SmallRow>();

const smallColumns = [
  smallHelper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  smallHelper.accessor("dept", { header: "Department", size: 120, padding: [0, 8] }),
  smallHelper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
  smallHelper.accessor("score", { header: "Score", size: 80, align: "right", padding: [0, 8] }),
];

type Employee = {
  id: number;
  name: string;
  email: string;
  department: string;
  title: string;
  salary: number;
  startDate: string;
  isActive: boolean;
  performanceScore: number | null;
  teamSize: number;
};
const empHelper = createColumnHelper<Employee>();

const manyColumns = [
  empHelper.accessor("id", { header: "ID", size: 60, align: "right", padding: [0, 8] }),
  empHelper.accessor("name", { header: "Name", size: 160, padding: [0, 8] }),
  empHelper.accessor("email", { header: "Email", size: 260, padding: [0, 8] }),
  empHelper.accessor("department", { header: "Dept", size: 120, padding: [0, 8] }),
  empHelper.accessor("title", { header: "Title", size: 180, padding: [0, 8] }),
  empHelper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
  empHelper.accessor("startDate", { header: "Start Date", size: 120, padding: [0, 8] }),
  empHelper.accessor("teamSize", { header: "Team", size: 80, align: "right", padding: [0, 8] }),
];

const overflowOptions: CssOverflow[] = ["auto", "scroll", "hidden", "visible"];

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

export function Scrollbar() {
  const [overflowY, setOverflowY] = useState<CssOverflow>("auto");
  const smallData = useMemo(() => generateSmallData(), []);
  const largeData = useMemo(() => generateEmployees(500), []);

  return (
    <>
      <h1>Scrollbar</h1>
      <p>
        Native browser scrollbar rendered via an overlay DOM div with <code>overflow: scroll</code>.
        The scrollbar syncs bidirectionally with canvas wheel events.
      </p>

      {/* ── overflowY control ───────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <strong>overflowY:</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {overflowOptions.map((v) => (
            <button
              key={v}
              data-testid={`overflow-y-${v}`}
              style={overflowY === v ? btnActive : btnBase}
              onClick={() => setOverflowY(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. Vertical Scroll ──────────────────────────────── */}
      <h2>Vertical Scroll (500 rows)</h2>
      <p>
        <code>overflowY=&quot;{overflowY}&quot;</code> — many rows in a fixed-height viewport.
      </p>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid
            data={largeData}
            width={550}
            height={400}
            overflowY={overflowY}
            columns={smallColumns}
          />
        </div>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid
            data={largeData}
            width={550}
            height={400}
            overflowY={overflowY}
            columns={smallColumns}
          />
        </div>
      </div>

      {/* ── 2. No Scroll (few rows) ────────────────────────── */}
      <h2>No Scroll (8 rows, auto)</h2>
      <p>
        <code>overflowY=&quot;auto&quot;</code> with few rows — scrollbar hidden because content
        fits.
      </p>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid data={smallData} width={550} height={400} overflowY="auto" columns={smallColumns} />
        </div>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid
            data={smallData}
            width={550}
            height={400}
            overflowY="auto"
            columns={smallColumns}
          />
        </div>
      </div>

      {/* ── 3. Always Visible ───────────────────────────────── */}
      <h2>Always Visible (scroll)</h2>
      <p>
        <code>overflowY=&quot;scroll&quot;</code> — scrollbar always visible even when content fits.
      </p>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid
            data={smallData}
            width={550}
            height={400}
            overflowY="scroll"
            columns={smallColumns}
          />
        </div>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid
            data={smallData}
            width={550}
            height={400}
            overflowY="scroll"
            columns={smallColumns}
          />
        </div>
      </div>

      {/* ── 4. Many Columns (wide) ──────────────────────────── */}
      <h2>Many Columns (8 cols, 500 rows)</h2>
      <p>Wide content with many columns in a narrow viewport.</p>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid
            data={largeData}
            width={600}
            height={400}
            overflowY={overflowY}
            columns={manyColumns}
          />
        </div>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid
            data={largeData}
            width={600}
            height={400}
            overflowY={overflowY}
            columns={manyColumns}
          />
        </div>
      </div>
    </>
  );
}
