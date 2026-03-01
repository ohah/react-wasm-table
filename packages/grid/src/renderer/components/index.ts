import type { CellRenderer, InstructionLike } from "./types";
import { textCellRenderer } from "./text";
import { badgeCellRenderer } from "./badge";
import { sparklineCellRenderer } from "./sparkline";
import { stubCellRenderer } from "./stub";
import { boxCellRenderer } from "./box";
import { flexCellRenderer } from "./flex";
import { stackCellRenderer } from "./stack";

// Re-export types for public API
export type { CellRenderContext, CellRenderer, InstructionLike } from "./types";

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
 * Create a CellRendererRegistry pre-loaded with the 7 built-in renderers.
 * Optional `userRenderers` are merged on top — same type overrides built-in.
 */
export function createCellRendererRegistry(
  userRenderers?: CellRenderer<any>[],
): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  registry.register(textCellRenderer);
  registry.register(badgeCellRenderer);
  registry.register(sparklineCellRenderer);
  registry.register(stubCellRenderer);
  registry.register(boxCellRenderer);
  registry.register(flexCellRenderer);
  registry.register(stackCellRenderer);
  if (userRenderers) {
    for (const r of userRenderers) {
      registry.register(r);
    }
  }
  return registry;
}

// Re-export built-in renderers for tests and custom registry composition
export { textCellRenderer } from "./text";
export { badgeCellRenderer } from "./badge";
export { stubCellRenderer } from "./stub";
export { boxCellRenderer } from "./box";
export { flexCellRenderer } from "./flex";
export { stackCellRenderer } from "./stack";
export { sparklineCellRenderer } from "./sparkline";
