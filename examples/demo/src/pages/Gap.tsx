import { useState, useMemo } from "react";
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid } from "../components/CssGrid";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", size: 120, padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 80, align: "right", padding: [0, 8] }),
];

export function Gap() {
  const [gapValue, setGapValue] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>gap</h1>
      <p>Sets the spacing between columns (flex items). Equivalent to CSS column-gap.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>gap:</strong>{" "}
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={gapValue}
            onChange={(e) => setGapValue(Number(e.target.value))}
          />{" "}
          {gapValue}px
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid gap={${gapValue}} columns={columns} ...>`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid data={data} width={800} height={400} gap={gapValue} columns={columns} />
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid data={data} width={800} height={400} gap={gapValue} columns={columns} />
        </div>
      </div>
    </>
  );
}
