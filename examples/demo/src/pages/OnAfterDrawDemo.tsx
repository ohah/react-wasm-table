import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, type AfterDrawContext } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

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
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("score", {
    header: "Score",
    size: 100,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

type OverlayMode = "watermark" | "row-highlight" | "crosshair" | "none";

export function OnAfterDrawDemo() {
  const data = useMemo(() => generateSmallData(), []);
  const [mode, setMode] = useState<OverlayMode>("watermark");
  const [highlightRow, setHighlightRow] = useState(3);
  const [drawCount, setDrawCount] = useState(0);

  const onAfterDraw = useCallback(
    (ctx: AfterDrawContext) => {
      setDrawCount((c) => c + 1);

      if (mode === "watermark") {
        drawWatermark(ctx);
      } else if (mode === "row-highlight") {
        drawRowHighlight(ctx, highlightRow);
      } else if (mode === "crosshair") {
        drawCrosshair(ctx);
      }
    },
    [mode, highlightRow],
  );

  const modes: { value: OverlayMode; label: string }[] = [
    { value: "watermark", label: "Watermark" },
    { value: "row-highlight", label: "Row Highlight" },
    { value: "crosshair", label: "Crosshair" },
    { value: "none", label: "None" },
  ];

  return (
    <>
      <h1>onAfterDraw (Step 0-4)</h1>
      <p>
        Draw custom overlays on the canvas after each frame. The callback receives an{" "}
        <code>AfterDrawContext</code> with the 2D context, dimensions, and scroll offsets. This is
        the entry point for Phase 3 Layer System.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <div>
          <strong>Overlay mode:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
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
          </div>
        </div>

        {mode === "row-highlight" && (
          <div>
            <strong>Row:</strong>
            <input
              type="number"
              value={highlightRow}
              onChange={(e) => setHighlightRow(Number(e.target.value))}
              min={0}
              max={data.length - 1}
              style={{ marginLeft: 6, width: 60, padding: "4px 8px" }}
            />
          </div>
        )}
      </div>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {mode === "none"
          ? `<Grid data={data} columns={columns} width={640} height={400} />`
          : `<Grid\n  data={data}\n  columns={columns}\n  width={640}\n  height={400}\n  onAfterDraw={(ctx) => {\n    // ctx: { ctx, width, height, scrollTop, scrollLeft, headerHeight, rowHeight }\n    ${mode === "watermark" ? 'ctx.ctx.fillText("DRAFT", ctx.width / 2, ctx.height / 2);' : mode === "row-highlight" ? `ctx.ctx.fillRect(0, y, ctx.width, ctx.rowHeight);` : "ctx.ctx.moveTo(cx, 0); ctx.ctx.lineTo(cx, h);"}\n  }}\n/>`}
      </pre>

      <div style={{ display: "flex", gap: 16 }}>
        <Grid
          data={data}
          width={640}
          height={400}
          columns={columns}
          onAfterDraw={mode !== "none" ? onAfterDraw : undefined}
          overflowY="scroll"
        />

        <div
          style={{
            padding: 12,
            background: "#f9f9f9",
            borderRadius: 6,
            border: "1px solid #eee",
            fontSize: 13,
            lineHeight: 1.8,
            minWidth: 200,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#333" }}>AfterDrawContext</div>
          <div>
            <code>ctx</code>: CanvasRenderingContext2D
          </div>
          <div>
            <code>width</code>: 640
          </div>
          <div>
            <code>height</code>: 400
          </div>
          <div>
            <code>headerHeight</code>: 40
          </div>
          <div>
            <code>rowHeight</code>: 36
          </div>
          <div>
            <code>scrollTop / scrollLeft</code>: scroll offsets
          </div>
          <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #ddd" }} />
          <div>
            <strong>Draw count:</strong> {drawCount}
          </div>
        </div>
      </div>
    </>
  );
}

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
