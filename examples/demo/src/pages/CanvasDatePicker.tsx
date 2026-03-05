import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, DatePicker } from "@ohah/react-wasm-table";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

type Row = { id: number; label: string; date: string };

const helper = createColumnHelper<Row>();

export function CanvasDatePicker() {
  const isDark = useDarkMode();
  const [data, setData] = useState<Row[]>([
    { id: 1, label: "Start date", date: "2024-01-15" },
    { id: 2, label: "End date", date: "2024-06-30" },
    { id: 3, label: "Due date", date: "" },
    { id: 4, label: "Review date", date: "2024-12-01" },
  ]);

  const handleChange = useCallback(
    (rowIdx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setData((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, date: e.target.value } : r)));
    },
    [],
  );

  const columns = useMemo(
    () => [
      helper.accessor("label", { header: "Label", size: 140, padding: [0, 8] }),
      helper.accessor("date", {
        header: "DatePicker",
        size: 220,
        padding: [4, 8],
        cell: (info) => (
          <DatePicker
            value={info.getValue()}
            placeholder="Select date..."
            min="2024-01-01"
            max="2025-12-31"
            onChange={handleChange(info.row.index)}
          />
        ),
      }),
    ],
    [handleChange],
  );

  return (
    <>
      <h1>Canvas: DatePicker</h1>
      <p>
        <code>DatePicker</code> uses a DOM overlay <code>&lt;input type=&quot;date&quot;&gt;</code>.
        The canvas preview shows date text and a calendar icon.
      </p>

      <Grid data={data} columns={columns} width={460} height={200} rowHeight={40} theme={isDark ? DARK_THEME : LIGHT_THEME} />

      <h3 style={{ marginTop: 16 }}>Current values:</h3>
      <pre style={{ fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
