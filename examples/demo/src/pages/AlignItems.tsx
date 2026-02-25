import { useState, useMemo } from "react";
import { Grid, Column, type CssAlignItems } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const containerOptions: CssAlignItems[] = [
  "start",
  "end",
  "flex-start",
  "flex-end",
  "center",
  "baseline",
  "stretch",
];

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
        <label>
          <strong>align-items (container):</strong>{" "}
          <select
            value={alignItemsValue}
            onChange={(e) => setAlignItemsValue(e.target.value as CssAlignItems)}
            style={{ fontSize: 14, padding: "4px 8px" }}
          >
            {containerOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <strong>align-self (col 2 "Department"):</strong>{" "}
          <select
            value={alignSelfValue}
            onChange={(e) => setAlignSelfValue(e.target.value as CssAlignItems | "")}
            style={{ fontSize: 14, padding: "4px 8px" }}
          >
            <option value="">(inherit)</option>
            {containerOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid alignItems="${alignItemsValue}" rowHeight={60} ...>
  <Column id="name" width={180} />
  <Column id="dept" width={120}${alignSelfValue ? ` alignSelf="${alignSelfValue}"` : ""} />
  <Column id="salary" width={100} />
</Grid>`}
      </pre>

      <Grid data={data} width={800} height={400} rowHeight={60} alignItems={alignItemsValue}>
        <Column id="name" width={180} header="Name" />
        <Column id="dept" width={120} header="Department" alignSelf={alignSelfValue || undefined} />
        <Column id="salary" width={100} header="Salary" align="right" />
        <Column id="score" width={80} header="Score" align="right" />
      </Grid>
    </>
  );
}
