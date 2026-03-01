import { useState, useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  readCellX,
  readCellY,
  readCellWidth,
  readCellHeight,
  readCellPaddingTop,
  readCellPaddingRight,
  readCellPaddingBottom,
  readCellPaddingLeft,
  type CellRenderer,
  type CellRenderContext,
  type SortingState,
} from "@ohah/react-wasm-table";

// ── Data ───────────────────────────────────────────────────────────────

interface TaskRow {
  name: string;
  status: string;
  progress: number;
  score: number;
}

function generateTasks(count: number): TaskRow[] {
  const statuses = ["Active", "Pending", "Done", "Error"];
  return Array.from({ length: count }, (_, i) => ({
    name: `Task ${i + 1}`,
    status: statuses[i % statuses.length]!,
    progress: Math.round(Math.random() * 100) / 100,
    score: Math.round(Math.random() * 100),
  }));
}

// ── Custom ProgressBar renderer ────────────────────────────────────────

interface ProgressInstruction {
  type: "progress";
  value: number; // 0..1
  color?: string;
}

const progressRenderer: CellRenderer<ProgressInstruction> = {
  type: "progress",
  draw(instruction: ProgressInstruction, { ctx, buf, cellIdx }: CellRenderContext) {
    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padT = readCellPaddingTop(buf, cellIdx);
    const padR = readCellPaddingRight(buf, cellIdx);
    const padB = readCellPaddingBottom(buf, cellIdx);
    const padL = readCellPaddingLeft(buf, cellIdx);

    const barH = 10;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const barY = y + padT + (innerH - barH) / 2;
    const barX = x + padL;

    // Background track
    ctx.fillStyle = "#e0e0e0";
    ctx.beginPath();
    ctx.roundRect(barX, barY, innerW, barH, 4);
    ctx.fill();

    // Filled portion
    const ratio = Math.max(0, Math.min(1, instruction.value));
    const fillW = innerW * ratio;
    if (fillW > 0) {
      const color =
        instruction.color ?? (ratio >= 0.7 ? "#4caf50" : ratio >= 0.4 ? "#ff9800" : "#f44336");
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 4);
      ctx.fill();
    }

    // Percentage text
    ctx.fillStyle = "#333";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(ratio * 100)}%`, barX + innerW, barY + barH / 2);
  },
};

// ── Custom badge override renderer (stars) ─────────────────────────────

interface StarBadgeInstruction {
  type: "badge";
  value: string;
  style?: { backgroundColor?: string; color?: string };
}

const starBadgeRenderer: CellRenderer<StarBadgeInstruction> = {
  type: "badge",
  draw(instruction: StarBadgeInstruction, { ctx, buf, cellIdx }: CellRenderContext) {
    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    const padT = readCellPaddingTop(buf, cellIdx);
    const padB = readCellPaddingBottom(buf, cellIdx);

    const bgColor = instruction.style?.backgroundColor ?? "#ffc107";
    const textColor = instruction.style?.color ?? "#333";

    // Star-shaped badge: draw a rounded pill with a star prefix
    ctx.font = "bold 12px system-ui, sans-serif";
    const text = `\u2605 ${instruction.value}`;
    const textWidth = ctx.measureText(text).width;
    const badgeWidth = textWidth + 16;
    const innerH = h - padT - padB;
    const badgeHeight = Math.min(innerH, 24);

    const badgeX = x + (w - badgeWidth) / 2;
    const badgeY = y + padT + (innerH - badgeHeight) / 2;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 12);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
  },
};

// ── Column definitions ─────────────────────────────────────────────────

const helper = createColumnHelper<TaskRow>();

export function CustomRendererDemo() {
  const data = useMemo(() => generateTasks(200), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [overrideBadge, setOverrideBadge] = useState(false);

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Task",
        size: 160,
        enableSorting: true,
        padding: [0, 8],
      }),
      helper.accessor("status", {
        header: "Status",
        size: 120,
        enableSorting: true,
        cell: (info) => ({
          type: "badge" as const,
          value: info.getValue(),
          style: {
            backgroundColor:
              info.getValue() === "Active"
                ? "#4caf50"
                : info.getValue() === "Error"
                  ? "#f44336"
                  : info.getValue() === "Done"
                    ? "#2196f3"
                    : "#ff9800",
            color: "#fff",
          },
        }),
      }),
      helper.accessor("progress", {
        header: "Progress",
        size: 200,
        enableSorting: true,
        padding: [0, 8],
        cell: (info) =>
          ({
            type: "progress",
            value: info.getValue(),
          }) as any,
      }),
      helper.accessor("score", {
        header: "Score",
        size: 100,
        enableSorting: true,
        align: "right",
        padding: [0, 8],
      }),
    ],
    [],
  );

  const cellRenderers = useMemo(() => {
    const renderers: (CellRenderer<ProgressInstruction> | CellRenderer<StarBadgeInstruction>)[] = [
      progressRenderer,
    ];
    if (overrideBadge) renderers.push(starBadgeRenderer);
    return renderers;
  }, [overrideBadge]);

  return (
    <>
      <h1>Custom Cell Renderer</h1>
      <p>
        Register custom <code>CellRenderer</code> instances via the <code>cellRenderers</code> prop.
        Built-in types (text, badge, stub, flex) can also be overridden.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={overrideBadge}
            onChange={(e) => setOverrideBadge(e.target.checked)}
          />
          Override built-in badge renderer (star badge)
        </label>
      </div>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
          marginBottom: 12,
        }}
      >
        {`// Custom ProgressBar renderer
const progressRenderer: CellRenderer = {
  type: "progress",
  draw(instruction, { ctx, buf, cellIdx }) {
    // Read layout from buffer
    const x = readCellX(buf, cellIdx);
    const y = readCellY(buf, cellIdx);
    const w = readCellWidth(buf, cellIdx);
    const h = readCellHeight(buf, cellIdx);
    // Draw progress bar using Canvas 2D API...
    ctx.fillStyle = "#4caf50";
    ctx.roundRect(x, y, w * instruction.value, h, 4);
    ctx.fill();
  },
};

// Usage
<Grid
  cellRenderers={[progressRenderer]}
  ...
/>`}
      </pre>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8, color: "#666" }}>Grid API</h3>
        <Grid
          data={data as any}
          width={600}
          height={400}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          cellRenderers={cellRenderers}
          padding={[0, 4]}
        />
      </section>

      <div style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
        <strong>How it works:</strong> The <code>cellRenderers</code> prop accepts an array of{" "}
        <code>CellRenderer</code> objects. Each has a <code>type</code> string and a{" "}
        <code>draw(instruction, context)</code> method. Custom types are merged with built-ins;
        registering the same type overrides the built-in renderer.
      </div>
    </>
  );
}
