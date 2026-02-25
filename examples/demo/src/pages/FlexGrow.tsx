import { useState, useMemo } from "react";
import { Grid, Column } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

export function FlexGrow() {
  const [grow1, setGrow1] = useState(0);
  const [grow2, setGrow2] = useState(1);
  const [shrink, setShrink] = useState(1);
  const [basis, setBasis] = useState("auto");
  const data = useMemo(() => generateSmallData(), []);

  return (
    <>
      <h1>flex-grow / flex-shrink / flex-basis</h1>
      <p>Controls how columns grow or shrink to fill available space.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <label>
          <strong>Col 1 flexGrow:</strong>{" "}
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={grow1}
            onChange={(e) => setGrow1(Number(e.target.value))}
          />{" "}
          {grow1}
        </label>
        <label>
          <strong>Col 2 flexGrow:</strong>{" "}
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={grow2}
            onChange={(e) => setGrow2(Number(e.target.value))}
          />{" "}
          {grow2}
        </label>
        <label>
          <strong>Col 3 flexShrink:</strong>{" "}
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={shrink}
            onChange={(e) => setShrink(Number(e.target.value))}
          />{" "}
          {shrink}
        </label>
        <label>
          <strong>Col 2 flexBasis:</strong>{" "}
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            style={{ fontSize: 14, padding: "4px 8px" }}
          >
            <option value="auto">auto</option>
            <option value="0">0</option>
            <option value="100">100px</option>
            <option value="200">200px</option>
            <option value="50%">50%</option>
          </select>
        </label>
      </div>

      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13 }}>
{`<Grid width={800} ...>
  <Column id="name" width={150} flexGrow={${grow1}} />
  <Column id="dept" flexGrow={${grow2}} flexBasis="${basis}" />
  <Column id="salary" width={300} flexShrink={${shrink}} />
</Grid>`}
      </pre>

      <Grid data={data} width={800} height={400}>
        <Column id="name" width={150} header="Name" flexGrow={grow1} />
        <Column
          id="dept"
          header="Department"
          flexGrow={grow2}
          flexBasis={basis === "auto" ? "auto" : basis.includes("%") ? (basis as `${number}%`) : Number(basis)}
        />
        <Column id="salary" width={300} header="Salary" align="right" flexShrink={shrink} />
      </Grid>
    </>
  );
}
