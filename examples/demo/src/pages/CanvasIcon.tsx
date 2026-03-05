import { useMemo } from "react";
import { Grid, createColumnHelper, Icon, Text, Stack } from "@ohah/react-wasm-table";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

// Material Design SVG paths (viewBox 24)
const ICONS = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  settings:
    "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  person:
    "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  close:
    "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  search:
    "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
} as const;

type IconName = keyof typeof ICONS;

type Row = {
  id: number;
  name: string;
  icon: IconName;
  description: string;
};

const helper = createColumnHelper<Row>();

function generateData(): Row[] {
  const iconEntries = Object.entries(ICONS) as [IconName, string][];
  return Array.from({ length: 50 }, (_, i) => {
    const [name] = iconEntries[i % iconEntries.length]!;
    return {
      id: i,
      name,
      icon: name,
      description: `Icon: ${name} (row ${i + 1})`,
    };
  });
}

const COLORS = ["#333", "#e53935", "#1976d2", "#388e3c", "#f57c00", "#7b1fa2"];
const SIZES = [16, 20, 24, 32];

export function CanvasIcon() {
  const isDark = useDarkMode();
  const data = useMemo(generateData, []);

  const columns = useMemo(
    () => [
      helper.accessor("id", { header: "#", size: 50, padding: [0, 8] }),
      helper.accessor("name", { header: "Name", size: 100, padding: [0, 8] }),
      helper.display({
        id: "icon",
        header: "Icon (default)",
        size: 80,
        cell: (info) => <Icon path={ICONS[info.row.original.icon]} />,
      }),
      helper.display({
        id: "iconSmall",
        header: "Small (16px)",
        size: 80,
        cell: (info) => <Icon path={ICONS[info.row.original.icon]} size={16} />,
      }),
      helper.display({
        id: "iconLarge",
        header: "Large (32px)",
        size: 80,
        cell: (info) => <Icon path={ICONS[info.row.original.icon]} size={32} />,
      }),
      helper.display({
        id: "iconColor",
        header: "Colored",
        size: 80,
        cell: (info) => (
          <Icon
            path={ICONS[info.row.original.icon]}
            color={COLORS[info.row.index % COLORS.length]}
            size={SIZES[info.row.index % SIZES.length]}
          />
        ),
      }),
      helper.display({
        id: "iconWithLabel",
        header: "Icon + Label",
        size: 160,
        cell: (info) => (
          <Stack gap={6}>
            <Icon path={ICONS[info.row.original.icon]} size={16} color="#1976d2" />
            <Text value={info.row.original.name} fontSize={13} />
          </Stack>
        ),
      }),
      helper.accessor("description", {
        header: "Description",
        size: 180,
        padding: [0, 8],
      }),
    ],
    [],
  );

  return (
    <>
      <h1>Canvas: Icon</h1>
      <p>
        <code>Icon</code> renders SVG path data on canvas using <code>Path2D</code>. Pass an SVG{" "}
        <code>path</code> (d attribute), optional <code>size</code>, <code>color</code>, and{" "}
        <code>viewBox</code>.
      </p>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Icon Grid ({data.length} rows)</h2>
        <Grid
          data={data}
          columns={columns}
          width={820}
          height={400}
          rowHeight={40}
          overflowX="auto"
          overflowY="auto"
          theme={isDark ? DARK_THEME : LIGHT_THEME}
        />
      </section>
    </>
  );
}
