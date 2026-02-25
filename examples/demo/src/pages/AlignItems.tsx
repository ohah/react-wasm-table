import { useState, useMemo } from "react";
import { Grid, Column, type CssAlignItems } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid, CssColumn } from "../components/CssGrid";

const containerOptions: CssAlignItems[] = [
  "start",
  "end",
  "flex-start",
  "flex-end",
  "center",
  "baseline",
  "stretch",
];

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

export function AlignItems() {
  const [alignItemsValue, setAlignItemsValue] = useState<CssAlignItems>("stretch");
  const [alignSelfValue, setAlignSelfValue] = useState<CssAlignItems | "">("");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>align-items / align-self</h1>
      <p>
        Controls cross-axis alignment of columns. align-self overrides align-items for a specific
        column.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div>
          <strong>align-items (container):</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {containerOptions.map((v) => (
              <button
                key={v}
                data-testid={`align-items-${v}`}
                style={alignItemsValue === v ? btnActive : btnBase}
                onClick={() => setAlignItemsValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>align-self (col 2 "Department"):</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <button
              data-testid="align-self-inherit"
              style={alignSelfValue === "" ? btnActive : btnBase}
              onClick={() => setAlignSelfValue("")}
            >
              (inherit)
            </button>
            {containerOptions.map((v) => (
              <button
                key={v}
                data-testid={`align-self-${v}`}
                style={alignSelfValue === v ? btnActive : btnBase}
                onClick={() => setAlignSelfValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid alignItems="${alignItemsValue}" rowHeight={60} ...>
  <Column id="name" width={180} />
  <Column id="dept" width={120}${alignSelfValue ? ` alignSelf="${alignSelfValue}"` : ""} />
  <Column id="salary" width={100} />
</Grid>`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid data={data} width={800} height={400} rowHeight={60} alignItems={alignItemsValue}>
            <Column id="name" width={180} header="Name" />
            <Column
              id="dept"
              width={120}
              header="Department"
              alignSelf={alignSelfValue || undefined}
            />
            <Column id="salary" width={100} header="Salary" align="right" />
            <Column id="score" width={80} header="Score" align="right" />
          </Grid>
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid
            data={data}
            width={800}
            height={400}
            rowHeight={60}
            alignItems={alignItemsValue}
          >
            <CssColumn id="name" width={180} header="Name" />
            <CssColumn
              id="dept"
              width={120}
              header="Department"
              alignSelf={alignSelfValue || undefined}
            />
            <CssColumn id="salary" width={100} header="Salary" align="right" />
            <CssColumn id="score" width={80} header="Score" align="right" />
          </CssGrid>
        </div>
      </div>
    </>
  );
}
