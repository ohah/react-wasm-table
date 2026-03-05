import { useState } from "react";
import {
  Grid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  flexRender,
  createColumnHelper,
  useGridTable,
  Text,
  Badge,
  type Theme,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";
import { useContainerSize } from "../useContainerSize";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

// ── Data ──────────────────────────────────────────────────────────

type Employee = {
  id: number;
  name: string;
  department: string;
  title: string;
  salary: number;
  isActive: boolean;
};

const rawData = generateEmployees(100) as unknown as Employee[];

const helper = createColumnHelper<Employee>();

// ── Styles ────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  background: "var(--demo-panel-bg)",
  borderRadius: 6,
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 4,
  border: "1px solid var(--demo-border-2)",
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--demo-muted)",
  marginRight: 6,
  fontWeight: 600,
};

// ── Theme presets ─────────────────────────────────────────────────

const themePresets: Record<string, Partial<Theme>> = {
  "No borders (default)": {},
  "Thin solid": {
    borderWidth: 0.5,
    borderStyle: "solid",
    borderColor: "#000",
  },
  "Thick borders": {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#333",
  },
  "Light gray": {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--demo-border)",
  },
  "Blue accent": {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#bbdefb",
  },
};

// ── Grid API Example ──────────────────────────────────────────────

const gridColumns = [
  helper.accessor("id", { header: "#", size: 60, align: "right", padding: [0, 8] }),
  helper.accessor("name", { header: "Name", size: 160, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    padding: [0, 8],
    // Column-level border override: red border for this column
    borderColor: "#e53935",
  }),
  helper.accessor("title", { header: "Title", size: 180, padding: [0, 8] }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    align: "right",
    padding: [0, 8],
    cell: (info) => <Text value={`$${info.getValue().toLocaleString()}`} fontWeight="bold" />,
  }),
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
    align: "center",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={info.getValue()}
        color="white"
        backgroundColor={info.getValue() === "Active" ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
];

// ── Table API Example columns ─────────────────────────────────────

const tableColumns = [
  helper.accessor("id", { header: "#", size: 60, align: "right", padding: [0, 8] }),
  helper.accessor("name", { header: "Name", size: 160, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    align: "right",
    padding: [0, 8],
    cell: (info) => <Text value={`$${info.getValue().toLocaleString()}`} fontWeight="bold" />,
  }),
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
    align: "center",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={info.getValue()}
        color="white"
        backgroundColor={info.getValue() === "Active" ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
];

// ── Component ─────────────────────────────────────────────────────

export function BorderStyleDemo() {
  const isDark = useDarkMode();
  const [selectedPreset, setSelectedPreset] = useState("No borders (default)");
  const { ref: gridRef, size: gridSize } = useContainerSize(400);
  const { ref: tableRef, size: tableSize } = useContainerSize(300);

  const themeOverrides = themePresets[selectedPreset] ?? {};

  const table = useGridTable<Employee>({
    data: rawData.slice(0, 20),
    columns: tableColumns,
  });

  return (
    <>
      <h1>Border Style</h1>
      <p>
        Customize grid borders via <code>theme.borderWidth</code>, <code>theme.borderStyle</code>,{" "}
        <code>theme.borderColor</code> at the global level, <code>borderColor</code>/
        <code>borderStyle</code> per column, and <code>style</code> prop on <code>&lt;Td&gt;</code>/
        <code>&lt;Tr&gt;</code> for per-cell overrides.
      </p>

      {/* Theme preset selector */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <span style={labelStyle}>Theme preset:</span>
            <select
              style={selectStyle}
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
            >
              {Object.keys(themePresets).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, color: "var(--demo-muted-4)" }}>
            borderWidth: {themeOverrides.borderWidth ?? 0.5}, borderStyle:{" "}
            {themeOverrides.borderStyle ?? "solid"}, borderColor:{" "}
            {themeOverrides.borderColor ?? "#000"}
          </div>
        </div>
      </div>

      {/* Example 1: Grid API with theme + column-level border */}
      <h2 style={{ fontSize: 16, marginTop: 24 }}>1. Grid API — Theme + Column-level border</h2>
      <p style={{ fontSize: 13, color: "var(--demo-muted)" }}>
        The "Department" column has <code>borderColor: "#e53935"</code> (red). Other columns follow
        the theme preset.
      </p>
      <div ref={gridRef} style={{ width: "100%", height: 400 }}>
        {gridSize.width > 0 && (
          <Grid
            data={rawData as Record<string, unknown>[]}
            columns={gridColumns}
            width={gridSize.width}
            height={gridSize.height}
            theme={{ ...(isDark ? DARK_THEME : LIGHT_THEME), ...themeOverrides }}
            overflowY="scroll"
          />
        )}
      </div>

      {/* Example 2: Table API with per-cell border via Td style */}
      <h2 style={{ fontSize: 16, marginTop: 32 }}>2. Table API — Per-cell border via Td style</h2>
      <p style={{ fontSize: 13, color: "var(--demo-muted)" }}>
        Uses{" "}
        <code>&lt;Td style=&#123;&#123; borderBottom: "2px solid #1976d2" &#125;&#125;&gt;</code> on
        salary cells, and <code>&lt;Tr style=&#123;&#123; border: "none" &#125;&#125;&gt;</code> on
        even rows to hide borders.
      </p>
      <div ref={tableRef} style={{ width: "100%", height: 300 }}>
        {tableSize.width > 0 && (
          <Table table={table} width={tableSize.width} height={tableSize.height}>
            <Thead>
              {table.getHeaderGroups().map((hg) => (
                <Tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <Th key={h.id} colSpan={h.colSpan}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </Th>
                  ))}
                </Tr>
              ))}
            </Thead>
            <Tbody>
              {table.getRowModel().rows.map((row, rowIdx) => (
                <Tr key={row.id} style={rowIdx % 2 === 0 ? { border: "none" } : undefined}>
                  {row.getVisibleCells().map((cell) => {
                    const isSalary = cell.column.id === "salary";
                    return (
                      <Td
                        key={cell.id}
                        style={isSalary ? { borderBottom: "2px solid #1976d2" } : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

    </>
  );
}
