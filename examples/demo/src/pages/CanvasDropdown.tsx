import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Dropdown } from "@ohah/react-wasm-table";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

type Row = { id: number; label: string; status: string };

const helper = createColumnHelper<Row>();

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "archived", label: "Archived" },
];

export function CanvasDropdown() {
  const isDark = useDarkMode();
  const [data, setData] = useState<Row[]>([
    { id: 1, label: "Project Alpha", status: "active" },
    { id: 2, label: "Project Beta", status: "pending" },
    { id: 3, label: "Project Gamma", status: "" },
    { id: 4, label: "Project Delta", status: "archived" },
  ]);

  const updateStatus = useCallback((rowIdx: number, value: string) => {
    setData((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, status: value } : r)));
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("label", { header: "Project", size: 160, padding: [0, 8] }),
      helper.accessor("status", {
        header: "Dropdown (click to open)",
        size: 220,
        padding: [4, 8],
        cell: (info) => (
          <Dropdown
            value={info.getValue()}
            options={statusOptions}
            placeholder="Select status..."
            onChange={(value) => updateStatus(info.row.index, value)}
          >
            <Dropdown.Panel boxShadow="0px 4px 12px rgba(0,0,0,0.1)" borderRadius={8} />
            <Dropdown.Option hoverBackgroundColor="#e0f2fe" selectedColor="#0369a1" />
            <Dropdown.Checkmark color="#0369a1" />
          </Dropdown>
        ),
      }),
    ],
    [updateStatus],
  );

  return (
    <>
      <h1>Canvas: Dropdown</h1>
      <p>
        <code>Dropdown</code> is a <strong>canvas-only</strong> component with a dropdown panel.
        Unlike <code>Select</code> (DOM overlay), it renders the option list on canvas. Click to
        open, select an option, or click outside to close.
      </p>

      <Grid
        data={data}
        columns={columns}
        width={480}
        height={200}
        rowHeight={40}
        theme={isDark ? DARK_THEME : LIGHT_THEME}
      />

      <h3 style={{ marginTop: 16 }}>Current values:</h3>
      <pre style={{ fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
