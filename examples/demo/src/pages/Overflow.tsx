import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type CssOverflow } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid } from "../components/CssGrid";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const options: CssOverflow[] = ["visible", "clip", "hidden", "scroll", "auto"];

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
        {`<Grid overflowX="${overflowXValue}" overflowY="${overflowYValue}" columns={columns} ...>`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid
            data={data}
            width={800}
            height={400}
            overflowX={overflowXValue}
            overflowY={overflowYValue}
            columns={columns}
          />
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid
            data={data}
            width={800}
            height={400}
            overflowX={overflowXValue}
            overflowY={overflowYValue}
            columns={columns}
          />
        </div>
      </div>
    </>
  );
}
