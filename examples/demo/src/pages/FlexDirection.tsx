import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssFlexDirection } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid, CssColumn } from "../components/CssGrid";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const options: CssFlexDirection[] = ["row", "column", "row-reverse", "column-reverse"];

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

const columns = [
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", size: 120, padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 80, align: "right", padding: [0, 8] }),
];

export function FlexDirection() {
  const [direction, setDirection] = useState<CssFlexDirection>("row");
  const data = useMemo(() => generateSmallData(), []);
  const h = direction === "row" || direction === "row-reverse" ? 400 : 600;

  return (
    <>
      <h1>flex-direction</h1>
      <p>Controls the direction of the main axis for column layout.</p>

      <div style={{ marginBottom: 16 }}>
        <strong>flex-direction:</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {options.map((v) => (
            <button
              key={v}
              data-testid={`direction-${v}`}
              style={direction === v ? btnActive : btnBase}
              onClick={() => setDirection(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {`<Grid flexDirection="${direction}" columns={columns} ...>`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid data={data} width={800} height={h} flexDirection={direction} columns={columns} />
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid data={data} width={800} height={h} flexDirection={direction}>
            <CssColumn id="name" width={180} header="Name" />
            <CssColumn id="dept" width={120} header="Department" />
            <CssColumn id="salary" width={100} header="Salary" align="right" />
            <CssColumn id="score" width={80} header="Score" align="right" />
          </CssGrid>
        </div>
      </div>
    </>
  );
}
