import { useState, useMemo } from "react";
import { Grid, Column, type CssOverflow } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

const options: CssOverflow[] = ["visible", "clip", "hidden", "scroll"];

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
  borderColor: "#1976d2",
};

export function Overflow() {
  const [overflowXValue, setOverflowXValue] = useState<CssOverflow>("visible");
  const [overflowYValue, setOverflowYValue] = useState<CssOverflow>("visible");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>overflow</h1>
      <p>
        Controls how Taffy handles overflow in the layout calculation. Note: this affects the{" "}
        <strong>layout engine</strong> behavior (automatic min size), not visual clipping (which the
        canvas handles separately).
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div>
          <strong>overflow-x:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {options.map((v) => (
              <button
                key={v}
                data-testid={`overflow-x-${v}`}
                style={overflowXValue === v ? btnActive : btnBase}
                onClick={() => setOverflowXValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>overflow-y:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {options.map((v) => (
              <button
                key={v}
                data-testid={`overflow-y-${v}`}
                style={overflowYValue === v ? btnActive : btnBase}
                onClick={() => setOverflowYValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid overflowX="${overflowXValue}" overflowY="${overflowYValue}" ...>
  ...
</Grid>`}
      </pre>

      <Grid
        data={data}
        width={800}
        height={400}
        overflowX={overflowXValue}
        overflowY={overflowYValue}
      >
        <Column id="name" width={180} header="Name" />
        <Column id="dept" width={120} header="Department" />
        <Column id="salary" width={100} header="Salary" align="right" />
        <Column id="score" width={80} header="Score" align="right" />
      </Grid>
    </>
  );
}
