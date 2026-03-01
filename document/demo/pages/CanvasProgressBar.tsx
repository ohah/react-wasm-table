import { useMemo } from "react";
import { Grid, createColumnHelper, Text, ProgressBar } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

export function CanvasProgressBar() {
  const data = useMemo(() => generateSmallData() as Row[], []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("score", {
        header: "Score",
        size: 120,
        padding: [0, 8],
        cell: (info) => <Text value={`${info.getValue()}%`} fontSize={12} color="#333" />,
      }),
      helper.accessor("score", {
        header: "ProgressBar (stub)",
        size: 200,
        padding: [0, 12],
        cell: (info) => <ProgressBar value={info.getValue()} max={100} color="#2196f3" />,
      }),
    ],
    [],
  );

  return (
    <>
      <h1>Canvas: ProgressBar</h1>
      <p>
        <code>ProgressBar</code> is a stub: the component is defined and accepts <code>value</code>,{" "}
        <code>max</code>, <code>color</code>, but the renderer currently shows a placeholder. When
        implemented, it will draw a progress bar on canvas.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
        <Grid data={data} columns={columns} width={480} height={320} rowHeight={40} />
      </section>
    </>
  );
}
