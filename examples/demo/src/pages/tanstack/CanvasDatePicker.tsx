import { useState, useMemo, useCallback } from "react";
import {
  Table,
  useReactTable,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  createColumnHelper,
  DatePicker,
} from "@ohah/react-wasm-table";
import { useContainerSize } from "../../useContainerSize";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../../useDarkMode";

type Row = { id: number; label: string; date: string };

const helper = createColumnHelper<Row>();

export function TanStackCanvasDatePicker() {
  const isDark = useDarkMode();
  const [data, setData] = useState<Row[]>([
    { id: 1, label: "Sprint start", date: "2024-01-15" },
    { id: 2, label: "Sprint end", date: "2024-01-29" },
    { id: 3, label: "Release", date: "" },
    { id: 4, label: "Retrospective", date: "2024-02-01" },
    { id: 5, label: "Planning", date: "2024-02-05" },
    { id: 6, label: "Demo", date: "" },
  ]);
  const { ref, width } = useContainerSize();

  const handleChange = useCallback(
    (rowIdx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setData((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, date: e.target.value } : r)));
    },
    [],
  );

  const columns = useMemo(
    () => [
      helper.accessor("label", { header: "Event", size: 140, padding: [0, 8] }),
      helper.accessor("date", {
        header: "Date",
        size: 200,
        padding: [4, 8],
        cell: (info) => (
          <DatePicker
            value={info.getValue()}
            placeholder="Pick a date..."
            onChange={handleChange(info.row.index)}
          />
        ),
      }),
    ],
    [handleChange],
  );

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <>
      <h1>TanStack: Canvas DatePicker</h1>
      <p>
        <code>DatePicker</code> via TanStack <code>useReactTable</code> + <code>Table</code> API.
        DOM overlay <code>&lt;input type=&quot;date&quot;&gt;</code> with canvas preview.
      </p>

      <div ref={ref}>
        <Table table={table} width={Math.min(width || 440, 500)} height={280} rowHeight={40} theme={isDark ? DARK_THEME : LIGHT_THEME} />
      </div>

      <h3 style={{ marginTop: 16 }}>Current values:</h3>
      <pre style={{ fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
