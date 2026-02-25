import { useState, useMemo } from "react";
import { Grid, Column, type CssFlexDirection } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

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
  borderColor: "#1976d2",
};

export function FlexDirection() {
  const [direction, setDirection] = useState<CssFlexDirection>("row");
  const data = useMemo(() => generateSmallData(), []);

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
        {`<Grid flexDirection="${direction}" ...>
  <Column id="name" width={180} />
  <Column id="dept" width={120} />
  <Column id="salary" width={100} />
</Grid>`}
      </pre>

      <Grid
        data={data}
        width={800}
        height={direction === "row" || direction === "row-reverse" ? 400 : 600}
        flexDirection={direction}
      >
        <Column id="name" width={180} header="Name" />
        <Column id="dept" width={120} header="Department" />
        <Column id="salary" width={100} header="Salary" align="right" />
        <Column id="score" width={80} header="Score" align="right" />
      </Grid>
    </>
  );
}
