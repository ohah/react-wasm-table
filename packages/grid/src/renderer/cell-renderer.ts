import type { CellRenderer, InstructionLike } from "./cell-renderer-types";
import { textCellRenderer } from "./cell-renderers/text";
import { badgeCellRenderer } from "./cell-renderers/badge";
import { stubCellRenderer } from "./cell-renderers/stub";
import { boxCellRenderer } from "./cell-renderers/box";
import { flexCellRenderer } from "./cell-renderers/flex";
import { stackCellRenderer } from "./cell-renderers/stack";

// Re-export types for public API
export type { CellRenderContext, CellRenderer, InstructionLike } from "./cell-renderer-types";

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
 * Create a CellRendererRegistry pre-loaded with the 6 built-in renderers.
 * Optional `userRenderers` are merged on top — same type overrides built-in.
 */
export function createCellRendererRegistry(
  userRenderers?: CellRenderer<any>[],
): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  registry.register(textCellRenderer);
  registry.register(badgeCellRenderer);
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
export { textCellRenderer } from "./cell-renderers/text";
export { badgeCellRenderer } from "./cell-renderers/badge";
export { stubCellRenderer } from "./cell-renderers/stub";
export { boxCellRenderer } from "./cell-renderers/box";
export { flexCellRenderer } from "./cell-renderers/flex";
export { stackCellRenderer } from "./cell-renderers/stack";
