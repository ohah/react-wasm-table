import { useState, useMemo } from "react";
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { CssGrid } from "../components/CssGrid";

type SmallRow = { name: string; dept: string; salary: number; score: number };

export function Padding() {
  const [cellPad, setCellPad] = useState(0);
  const [containerPad, setContainerPad] = useState(0);
  const data = useMemo(() => generateSmallData(), []);

  const helper = createColumnHelper<SmallRow>();
  const columns = [
    helper.accessor("name", { header: "Name", size: 180, padding: cellPad }),
    helper.accessor("dept", { header: "Department", size: 120, padding: cellPad }),
    helper.accessor("salary", { header: "Salary", size: 100, align: "right", padding: cellPad }),
    helper.accessor("score", { header: "Score", size: 80, align: "right", padding: cellPad }),
  ];

  return (
    <>
      <h1>padding</h1>
      <p>
        Padding on <strong>columns</strong> (flex children) affects the inner content area of each
        cell. Padding on the <strong>Grid</strong> (container) adds space around all columns.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <label>
          <strong>Column padding:</strong>{" "}
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={cellPad}
            onChange={(e) => setCellPad(Number(e.target.value))}
          />{" "}
          {cellPad}px
        </label>
        <label>
          <strong>Container padding:</strong>{" "}
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={containerPad}
            onChange={(e) => setContainerPad(Number(e.target.value))}
          />{" "}
          {containerPad}px
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`helper.accessor("name", { size: 180, padding: ${cellPad} })
helper.accessor("dept", { size: 120, padding: ${cellPad} })

<Grid padding={${containerPad}} columns={columns} />`}
      </pre>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>Canvas (WASM/Taffy)</h3>
          <Grid data={data} width={800} height={400} padding={containerPad} columns={columns} />
        </div>
        <div style={{ width: 1, background: "#e0e0e0", alignSelf: "stretch", margin: "0 16px" }} />
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#666" }}>CSS (Browser)</h3>
          <CssGrid data={data} width={800} height={400} padding={containerPad} columns={columns} />
        </div>
      </div>
    </>
  );
}
