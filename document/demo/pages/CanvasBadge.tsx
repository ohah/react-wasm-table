import { useState, useMemo } from "react";
import { Grid, createColumnHelper, Badge } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

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

const presets: { label: string; color: string; backgroundColor: string }[] = [
  { label: "Green", color: "#2e7d32", backgroundColor: "#e8f5e9" },
  { label: "Blue", color: "#1565c0", backgroundColor: "#e3f2fd" },
  { label: "Orange", color: "#e65100", backgroundColor: "#fff3e0" },
  { label: "Gray", color: "#424242", backgroundColor: "#f5f5f5" },
];

export function CanvasBadge() {
  const data = useMemo(() => generateSmallData() as Row[], []);
  const [presetIndex, setPresetIndex] = useState(0);
  const [borderRadius, setBorderRadius] = useState(6);
  const preset = presets[presetIndex]!;

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("dept", {
        header: "Badge",
        size: 200,
        padding: [0, 12],
        cell: (info) => (
          <Badge
            value={info.getValue()}
            color={preset.color}
            backgroundColor={preset.backgroundColor}
            borderRadius={borderRadius}
          />
        ),
      }),
    ],
    [preset, borderRadius],
  );

  return (
    <>
      <h1>Canvas: Badge</h1>
      <p>
        <code>Badge</code> draws a pill/chip. Supports <code>style</code> and individual props{" "}
        <code>color</code>, <code>backgroundColor</code>, <code>borderRadius</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>Preset:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {presets.map((p, i) => (
              <button
                key={p.label}
                style={presetIndex === i ? btnActive : btnBase}
                onClick={() => setPresetIndex(i)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>borderRadius:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[0, 4, 6, 12].map((n) => (
              <button
                key={n}
                style={borderRadius === n ? btnActive : btnBase}
                onClick={() => setBorderRadius(n)}
              >
                {n}px
              </button>
            ))}
          </div>
        </div>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
        <Grid data={data} columns={columns} width={360} height={320} rowHeight={40} />
      </section>
    </>
  );
}
