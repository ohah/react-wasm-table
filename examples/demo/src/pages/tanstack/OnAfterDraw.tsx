import { useState, useMemo, useCallback } from "react";
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
  type SortingState,
  type AfterDrawContext,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";
import { CodeSnippet } from "../../components/CodeSnippet";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
  helper.accessor("dept", {
    header: "Department",
    size: 140,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
];

type OverlayMode = "watermark" | "row-highlight" | "crosshair" | "none";

function drawWatermark({ ctx, width, height }: AfterDrawContext) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText("DRAFT", 0, 0);
  ctx.restore();
}

function drawRowHighlight(
  { ctx, width, headerHeight, rowHeight, scrollTop }: AfterDrawContext,
  targetRow: number,
) {
  const y = headerHeight + targetRow * rowHeight - scrollTop;
  if (y + rowHeight < headerHeight || y > headerHeight + 600) return;
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#ff9800";
  ctx.fillRect(0, y, width, rowHeight);
  ctx.restore();
}

function drawCrosshair({ ctx, width, height }: AfterDrawContext) {
  const cx = width / 2;
  const cy = height / 2;
  ctx.save();
  ctx.strokeStyle = "rgba(244, 67, 54, 0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.stroke();
  ctx.restore();
}

export function TanStackOnAfterDraw() {
  const data = useMemo(() => generateSmallData() as SmallRow[], []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mode, setMode] = useState<OverlayMode>("watermark");
  const [highlightRow, setHighlightRow] = useState(3);
  const [drawCount, setDrawCount] = useState(0);

  const onAfterDraw = useCallback(
    (ctx: AfterDrawContext) => {
      setDrawCount((c) => c + 1);
      if (mode === "watermark") drawWatermark(ctx);
      else if (mode === "row-highlight") drawRowHighlight(ctx, highlightRow);
      else if (mode === "crosshair") drawCrosshair(ctx);
    },
    [mode, highlightRow],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const modes: { value: OverlayMode; label: string }[] = [
    { value: "watermark", label: "Watermark" },
    { value: "row-highlight", label: "Row Highlight" },
    { value: "crosshair", label: "Crosshair" },
    { value: "none", label: "None" },
  ];

  return (
    <>
      <h1>TanStack API: onAfterDraw</h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        useReactTable + Table. onAfterDraw callback for custom canvas overlays (watermark, row
        highlight, crosshair).
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, alignItems: "center" }}>
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            style={{
              padding: "4px 12px",
              border: "1px solid #ccc",
              borderRadius: 4,
              background: mode === m.value ? "#1976d2" : "#fff",
              color: mode === m.value ? "#fff" : "#333",
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        ))}
        {mode === "row-highlight" && (
          <label>
            Row:{" "}
            <input
              type="number"
              value={highlightRow}
              onChange={(e) => setHighlightRow(Number(e.target.value))}
              min={0}
              max={data.length - 1}
              style={{ width: 50, marginLeft: 4 }}
            />
          </label>
        )}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <Table
          table={table}
          width={560}
          height={380}
          onAfterDraw={mode !== "none" ? onAfterDraw : undefined}
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
        <div style={{ padding: 12, background: "#f9f9f9", borderRadius: 4, fontSize: 13 }}>
          <strong>Draw count:</strong> {drawCount}
        </div>
      </div>
      <CodeSnippet>{`const onAfterDraw = useCallback(
  (ctx: AfterDrawContext) => {
    setDrawCount((c) => c + 1);
    if (mode === "watermark") drawWatermark(ctx);
    else if (mode === "row-highlight") drawRowHighlight(ctx, highlightRow);
    else if (mode === "crosshair") drawCrosshair(ctx);
  },
  [mode, highlightRow],
);

<Table table={table} width={560} height={380} onAfterDraw={mode !== "none" ? onAfterDraw : undefined} />`}</CodeSnippet>
    </>
  );
}
