import { useMemo, useState, useCallback } from "react";
import { Grid, createColumnHelper, Text, ProgressBar } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

export function CanvasProgressBar() {
  const isDark = useDarkMode();
  const data = useMemo(() => generateSmallData() as Row[], []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("score", {
        header: "Score",
        size: 80,
        padding: [0, 8],
        cell: (info) => <Text value={`${info.getValue()}%`} fontSize={12} color="#333" />,
      }),
      helper.accessor("score", {
        header: "Default",
        size: 160,
        padding: [0, 12],
        cell: (info) => <ProgressBar value={info.getValue()} max={100} />,
      }),
      helper.accessor("score", {
        header: "Custom Color",
        size: 160,
        padding: [0, 12],
        cell: (info) => (
          <ProgressBar
            value={info.getValue()}
            max={100}
            color="#4caf50"
            backgroundColor="#c8e6c9"
          />
        ),
      }),
      helper.accessor("score", {
        header: "Tall + Round",
        size: 160,
        padding: [0, 12],
        cell: (info) => (
          <ProgressBar
            value={info.getValue()}
            max={100}
            height={14}
            borderRadius={7}
            color="#ff9800"
          />
        ),
      }),
      helper.accessor("score", {
        header: "With Label",
        size: 180,
        padding: [0, 12],
        cell: (info) => (
          <ProgressBar
            value={info.getValue()}
            max={100}
            showLabel
            color="#9c27b0"
            backgroundColor="#e1bee7"
          />
        ),
      }),
    ],
    [],
  );

  // ── Editable demo ──
  const [editableData, setEditableData] = useState(() => generateSmallData() as Row[]);

  const handleChange = useCallback((rowIndex: number, value: number) => {
    setEditableData((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], score: value };
      return next;
    });
  }, []);

  const editableColumns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 140, padding: [0, 8] }),
      helper.accessor("score", {
        header: "Score",
        size: 80,
        padding: [0, 8],
        cell: (info) => <Text value={`${info.getValue()}%`} fontSize={12} color="#333" />,
      }),
      helper.accessor("score", {
        header: "Editable",
        size: 200,
        padding: [0, 12],
        cell: (info) => (
          <ProgressBar
            value={info.getValue()}
            max={100}
            showLabel
            color="#2196f3"
            onChange={(v) => handleChange(info.row.index, v)}
          />
        ),
      }),
      helper.accessor("score", {
        header: "Editable (Green)",
        size: 200,
        padding: [0, 12],
        cell: (info) => (
          <ProgressBar
            value={info.getValue()}
            max={100}
            showLabel
            color="#4caf50"
            backgroundColor="#c8e6c9"
            height={12}
            borderRadius={6}
            onChange={(v) => handleChange(info.row.index, v)}
          />
        ),
      }),
    ],
    [handleChange],
  );

  return (
    <>
      <h1>Canvas: ProgressBar</h1>
      <p>
        <code>ProgressBar</code> draws a horizontal progress bar on canvas. Supports custom colors,
        height, border radius, and an optional percentage label.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Style Variations</h2>
        <Grid data={data} columns={columns} width={900} height={460} rowHeight={40} theme={isDark ? DARK_THEME : LIGHT_THEME} />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Editable</h2>
        <p style={{ marginBottom: 8, color: "var(--demo-muted)" }}>
          Click or drag the progress bars below to change values interactively.
        </p>
        <Grid
          data={editableData}
          columns={editableColumns}
          width={640}
          height={460}
          rowHeight={40}
          theme={isDark ? DARK_THEME : LIGHT_THEME}
        />
      </section>
    </>
  );
}
