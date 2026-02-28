import { useState, useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  headerLayer,
  dataLayer,
  gridLinesLayer,
  selectionLayer,
  type GridLayer,
  type LayerContext,
  type SortingState,
  readCellRow,
  readCellY,
} from "@ohah/react-wasm-table";

// ── Data ────────────────────────────────────────────────────────────────

interface RowData {
  name: string;
  department: string;
  revenue: number;
  status: string;
}

function generateData(count: number): RowData[] {
  const departments = ["Engineering", "Sales", "Marketing", "Support"];
  const statuses = ["Active", "Pending", "Done"];
  return Array.from({ length: count }, (_, i) => ({
    name: `Employee ${i + 1}`,
    department: departments[i % departments.length]!,
    revenue: Math.round(Math.random() * 100000) / 100,
    status: statuses[i % statuses.length]!,
  }));
}

const helper = createColumnHelper<RowData>();

const columns = [
  helper.accessor("name", { header: "Name", size: 160, enableSorting: true, padding: [0, 8] }),
  helper.accessor("department", { header: "Dept", size: 120, enableSorting: true }),
  helper.accessor("revenue", {
    header: "Revenue",
    size: 120,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("status", { header: "Status", size: 100, enableSorting: true }),
];

// ── Custom layers ───────────────────────────────────────────────────────

function watermarkLayer(): GridLayer {
  return {
    name: "watermark",
    space: "viewport",
    draw(context: LayerContext) {
      const { ctx, width, height } = context;
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText("CONFIDENTIAL", 0, 0);
      ctx.restore();
    },
  };
}

function rowHighlightLayer(highlightRow: number): GridLayer {
  return {
    name: "rowHighlight",
    space: "content",
    draw(context: LayerContext) {
      const { ctx, layoutBuf, headerCount, totalCellCount, contentLeft, contentWidth, rowHeight } =
        context;
      if (totalCellCount <= headerCount) return;

      // Find cells belonging to the target row
      for (let i = headerCount; i < totalCellCount; i++) {
        const row = readCellRow(layoutBuf, i);
        if (row === highlightRow) {
          const y = readCellY(layoutBuf, i);
          ctx.fillStyle = "rgba(255, 235, 59, 0.3)";
          ctx.fillRect(contentLeft, y, contentWidth - contentLeft, rowHeight);
          return; // only need to highlight once per row
        }
      }
    },
  };
}

// ── Layer toggle state ──────────────────────────────────────────────────

interface LayerToggle {
  key: string;
  label: string;
  enabled: boolean;
}

const DEFAULT_TOGGLES: LayerToggle[] = [
  { key: "header", label: "Header", enabled: true },
  { key: "data", label: "Data Rows", enabled: true },
  { key: "gridLines", label: "Grid Lines", enabled: true },
  { key: "rowHighlight", label: "Row Highlight (row 2)", enabled: true },
  { key: "selection", label: "Selection", enabled: true },
  { key: "watermark", label: "Watermark (viewport)", enabled: true },
];

export function LayerDemo() {
  const data = useMemo(() => generateData(200), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);

  const toggle = (key: string) => {
    setToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));
  };

  const enabledSet = useMemo(
    () => new Set(toggles.filter((t) => t.enabled).map((t) => t.key)),
    [toggles],
  );

  const activeLayers: GridLayer[] = useMemo(() => {
    const layers: GridLayer[] = [];
    if (enabledSet.has("header")) layers.push(headerLayer());
    if (enabledSet.has("data")) layers.push(dataLayer());
    if (enabledSet.has("gridLines")) layers.push(gridLinesLayer());
    if (enabledSet.has("rowHighlight")) layers.push(rowHighlightLayer(2));
    if (enabledSet.has("selection")) layers.push(selectionLayer());
    if (enabledSet.has("watermark")) layers.push(watermarkLayer());
    return layers;
  }, [enabledSet]);

  return (
    <>
      <h1>Layer System</h1>
      <p>
        The render pipeline is composed of <code>GridLayer</code> objects. Each layer has a{" "}
        <code>name</code>, a <code>space</code> (<code>"content"</code> for scroll-translated or{" "}
        <code>"viewport"</code> for screen coords), and a <code>draw()</code> method.
      </p>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Controls */}
        <div style={{ minWidth: 200 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Toggle Layers</h3>
          {toggles.map((t) => (
            <label
              key={t.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              <input type="checkbox" checked={t.enabled} onChange={() => toggle(t.key)} />
              {t.label}
            </label>
          ))}

          <h3 style={{ margin: "16px 0 8px", fontSize: 14 }}>Active Layer Stack</h3>
          <div style={{ fontSize: 12, fontFamily: "monospace" }}>
            {activeLayers.map((l, i) => (
              <div key={i} style={{ padding: "2px 0" }}>
                {i + 1}. <strong>{l.name}</strong>{" "}
                <span
                  style={{
                    display: "inline-block",
                    padding: "1px 6px",
                    borderRadius: 3,
                    fontSize: 10,
                    backgroundColor: l.space === "content" ? "#e3f2fd" : "#fce4ec",
                    color: l.space === "content" ? "#1565c0" : "#c62828",
                  }}
                >
                  {l.space}
                </span>
              </div>
            ))}
            {activeLayers.length === 0 && <div style={{ color: "#999" }}>(empty)</div>}
          </div>
        </div>

        {/* Grid */}
        <Grid
          data={data as any}
          width={600}
          height={400}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          layers={activeLayers}
          padding={[0, 4]}
        />
      </div>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
          marginTop: 16,
        }}
      >
        {`import { headerLayer, dataLayer, gridLinesLayer, selectionLayer } from "@ohah/react-wasm-table";

// Custom watermark layer (viewport space — no scroll translate)
const watermark: GridLayer = {
  name: "watermark",
  space: "viewport",
  draw({ ctx, width, height }) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.font = "bold 48px system-ui";
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText("CONFIDENTIAL", 0, 0);
    ctx.restore();
  },
};

<Grid
  layers={[
    headerLayer(),
    dataLayer(),
    gridLinesLayer(),
    watermark,         // injected between gridLines and selection
    selectionLayer(),
  ]}
  ...
/>`}
      </pre>
    </>
  );
}
