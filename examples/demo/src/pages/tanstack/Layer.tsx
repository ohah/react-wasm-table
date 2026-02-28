import { useState, useMemo } from "react";
import {
  Table,
  useReactTable,
  flexRender,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  createColumnHelper,
  headerLayer,
  dataLayer,
  gridLinesLayer,
  selectionLayer,
  type GridLayer,
  type LayerContext,
  type SortingState,
  type NormalizedRange,
  readCellRow,
  readCellY,
} from "@ohah/react-wasm-table";
import { CodeSnippet } from "../../components/CodeSnippet";

type RowData = { name: string; department: string; revenue: number; status: string };
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
      for (let i = headerCount; i < totalCellCount; i++) {
        const row = readCellRow(layoutBuf, i);
        if (row === highlightRow) {
          const y = readCellY(layoutBuf, i);
          ctx.fillStyle = "rgba(255, 235, 59, 0.3)";
          ctx.fillRect(contentLeft, y, contentWidth - contentLeft, rowHeight);
          return;
        }
      }
    },
  };
}

const DEFAULT_TOGGLES = [
  { key: "header", label: "Header", enabled: true },
  { key: "data", label: "Data", enabled: true },
  { key: "gridLines", label: "Grid Lines", enabled: true },
  { key: "rowHighlight", label: "Row Highlight", enabled: true },
  { key: "selection", label: "Selection", enabled: true },
  { key: "watermark", label: "Watermark", enabled: true },
];

export function TanStackLayer() {
  const data = useMemo(() => generateData(200), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);
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

  const table = useReactTable({
    data: data as RowData[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>TanStack API: Layer System</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table with layers prop (header, data, gridLines, rowHighlight, selection,
        watermark).
      </p>
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ minWidth: 180 }}>
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
        </div>
        <Table
          table={table}
          width={560}
          height={400}
          layers={activeLayers}
          selection={selection}
          onSelectionChange={setSelection}
        >
          <Thead>
            {table.getHeaderGroups().map((hg) => (
              <Tr key={hg.id}>
                {hg.headers.map((h) => (
                  <Th key={h.id} colSpan={h.colSpan}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
      <CodeSnippet>{`const activeLayers: GridLayer[] = useMemo(() => {
  const layers = [];
  if (enabledSet.has("header")) layers.push(headerLayer());
  if (enabledSet.has("data")) layers.push(dataLayer());
  if (enabledSet.has("gridLines")) layers.push(gridLinesLayer());
  if (enabledSet.has("rowHighlight")) layers.push(rowHighlightLayer(2));
  if (enabledSet.has("selection")) layers.push(selectionLayer());
  if (enabledSet.has("watermark")) layers.push(watermarkLayer());
  return layers;
}, [enabledSet]);

<Table table={table} width={560} height={400} layers={activeLayers} selection={selection} onSelectionChange={setSelection} />`}</CodeSnippet>
    </>
  );
}
