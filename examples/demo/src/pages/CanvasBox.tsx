import { useMemo } from "react";
import { Grid, createColumnHelper, Box } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

export function CanvasBox() {
  const data = useMemo(() => generateSmallData() as Row[], []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("dept", {
        header: "Box (stub)",
        size: 160,
        padding: [0, 12],
        cell: () => <Box padding={8} />,
      }),
    ],
    [],
  );

  return (
    <>
      <h1>Canvas: Box</h1>
      <p>
        <code>Box</code> is a stub: the component is defined and accepts <code>padding</code>,{" "}
        <code>style</code>, etc., but the renderer currently shows a placeholder. When implemented,
        it will act as a generic container (padding, margin, border) on canvas.
      </p>

      <Grid data={data} columns={columns} width={320} height={320} rowHeight={40} />
    </>
  );
}
