import type {
  RenderInstruction,
  TextInstruction,
  BadgeInstruction,
  StubInstruction,
  FlexInstruction,
  Theme,
} from "../types";
import { drawTextCellFromBuffer, drawBadgeFromBuffer } from "./draw-primitives";

// ── Types ──────────────────────────────────────────────────────────────

/** Context passed to each cell renderer's draw method. */
export interface CellRenderContext {
  ctx: CanvasRenderingContext2D;
  buf: Float32Array;
  cellIdx: number;
  theme: Theme;
}

/** Instruction-like shape: at least a string `type` (allows custom instruction types). */
export type InstructionLike = RenderInstruction | { type: string };

/** A cell renderer that knows how to draw one instruction type onto canvas. */
export interface CellRenderer<T extends InstructionLike = RenderInstruction> {
  readonly type: T["type"];
  draw(instruction: T, context: CellRenderContext): void;
}

// ── Registry ───────────────────────────────────────────────────────────

/** Registry that maps instruction type strings to CellRenderer instances. */
export class CellRendererRegistry {
  private renderers = new Map<string, CellRenderer<any>>();

  /** Register a renderer. If same type already exists, it is overridden. */
  register(renderer: CellRenderer<any>): void {
    this.renderers.set(renderer.type, renderer);
  }

  /** Look up a renderer by instruction type. */
  get(type: string): CellRenderer<any> | undefined {
    return this.renderers.get(type);
  }

  /** Number of registered renderers. */
  get size(): number {
    return this.renderers.size;
  }
}

/**
 * Create a CellRendererRegistry pre-loaded with the 4 built-in renderers.
 * Optional `userRenderers` are merged on top — same type overrides built-in.
 */
export function createCellRendererRegistry(
  userRenderers?: CellRenderer<any>[],
): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  registry.register(textCellRenderer);
  registry.register(badgeCellRenderer);
  registry.register(stubCellRenderer);
  registry.register(flexCellRenderer);
  if (userRenderers) {
    for (const r of userRenderers) {
      registry.register(r);
    }
  }
  return registry;
}

// ── Built-in renderers ─────────────────────────────────────────────────

/** Renders a text cell. */
export const textCellRenderer: CellRenderer<TextInstruction> = {
  type: "text",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    drawTextCellFromBuffer(ctx, buf, cellIdx, instruction.value, {
      color: instruction.style?.color ?? theme.cellColor,
      fontWeight: instruction.style?.fontWeight ?? "normal",
      fontSize: instruction.style?.fontSize ?? theme.fontSize,
    });
  },
};

/** Renders a badge cell. */
export const badgeCellRenderer: CellRenderer<BadgeInstruction> = {
  type: "badge",
  draw(instruction, { ctx, buf, cellIdx }) {
    drawBadgeFromBuffer(ctx, buf, cellIdx, instruction.value, instruction.style);
  },
};

/** Renders a stub placeholder for not-yet-implemented components. */
export const stubCellRenderer: CellRenderer<StubInstruction> = {
  type: "stub",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    drawTextCellFromBuffer(ctx, buf, cellIdx, `[${instruction.component}]`, {
      color: "#999",
      fontWeight: "normal",
      fontSize: theme.fontSize,
    });
  },
};

/** Renders a flex container (first child fallback). */
export const flexCellRenderer: CellRenderer<FlexInstruction> = {
  type: "flex",
  draw(instruction, context) {
    if (instruction.children.length > 0) {
      const first = instruction.children[0];
      if (!first) return;
      if (first.type === "text") {
        textCellRenderer.draw(first, context);
      } else if (first.type === "badge") {
        badgeCellRenderer.draw(first, context);
      }
    }
  },
};
