import { useState, useMemo } from "react";
import { Grid, createColumnHelper, type NormalizedRange } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

export function Selection() {
  const [gridEnabled, setGridEnabled] = useState(true);
  const [salaryEnabled, setSalaryEnabled] = useState(true);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
  const data = useMemo(() => generateSmallData(), []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
      helper.accessor("dept", { header: "Department", size: 140, padding: [0, 8] }),
      helper.accessor("salary", {
        header: "Salary",
        size: 120,
        align: "right",
        padding: [0, 8],
        enableSelection: salaryEnabled,
      }),
      helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
    ],
    [salaryEnabled],
  );

  return (
    <>
      <h1>enableSelection</h1>
      <p>
        Control cell selection at the <strong>Grid level</strong> or{" "}
        <strong>per-column level</strong>. Useful when columns contain custom inputs/buttons that
        shouldn't trigger selection.
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 24, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={gridEnabled}
            onChange={(e) => setGridEnabled(e.target.checked)}
          />
          <strong>Grid enableSelection</strong>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={salaryEnabled}
            onChange={(e) => setSalaryEnabled(e.target.checked)}
          />
          <strong>Salary column enableSelection</strong>
        </label>
      </div>

      <pre style={{ background: "var(--demo-code-bg)", color: "var(--demo-code-fg)", padding: 12, borderRadius: 4, fontSize: 13 }}>
        {`<Grid enableSelection={${gridEnabled}} ...>\n`}
        {`  helper.accessor("salary", { enableSelection: ${salaryEnabled} })`}
      </pre>

      <div style={{ marginBottom: 12 }}>
        <section style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, marginBottom: 6 }}>Grid API</h4>
          <Grid
            data={data}
            width={800}
            height={340}
            columns={columns}
            enableSelection={gridEnabled}
            selection={selection}
            onSelectionChange={setSelection}
          />
        </section>
      </div>

      <div
        style={{
          padding: 12,
          background: "var(--demo-panel-bg)",
          borderRadius: 4,
          fontSize: 13,
          color: "var(--demo-muted-2)",
        }}
      >
        <strong>Selection state: </strong>
        {selection
          ? `row ${selection.minRow}–${selection.maxRow}, col ${selection.minCol}–${selection.maxCol}`
          : "none"}
      </div>

      <div style={{ marginTop: 24, fontSize: 13, color: "var(--demo-muted-3)", lineHeight: 1.8 }}>
        <p>
          <strong>Grid-level off:</strong> Disables all selection (mouse, keyboard, rendering).
        </p>
        <p>
          <strong>Per-column off:</strong> Blocks selection <em>starting</em> from that column.
          Drags from other columns can still cross through it.
        </p>
      </div>
    </>
  );
}
