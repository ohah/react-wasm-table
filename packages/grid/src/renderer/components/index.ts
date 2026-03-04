import type { CellRenderer, InstructionLike } from "./types";
import { textCellRenderer } from "./text";
import { badgeCellRenderer } from "./badge";
import { sparklineCellRenderer } from "./sparkline";
import { stubCellRenderer } from "./stub";
import { boxCellRenderer } from "./box";
import { flexCellRenderer } from "./flex";
import { stackCellRenderer } from "./stack";
import { colorCellRenderer } from "./color";
import { tagCellRenderer } from "./tag";
import { ratingCellRenderer } from "./rating";
import { chipCellRenderer } from "./chip";
import { linkCellRenderer } from "./link";
import { imageCellRenderer } from "./image";
import { switchCellRenderer } from "./switch";
import { checkboxCellRenderer } from "./checkbox";
import { radioCellRenderer } from "./radio";
import { labelCellRenderer } from "./label";
import { inputCellRenderer } from "./input";
import { progressBarCellRenderer } from "./progressbar";

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
 * Create a CellRendererRegistry pre-loaded with the 19 built-in renderers.
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
  registry.register(colorCellRenderer);
  registry.register(tagCellRenderer);
  registry.register(ratingCellRenderer);
  registry.register(chipCellRenderer);
  registry.register(linkCellRenderer);
  registry.register(imageCellRenderer);
  registry.register(switchCellRenderer);
  registry.register(checkboxCellRenderer);
  registry.register(radioCellRenderer);
  registry.register(labelCellRenderer);
  registry.register(inputCellRenderer);
  registry.register(progressBarCellRenderer);
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
export { colorCellRenderer } from "./color";
export { tagCellRenderer } from "./tag";
export { ratingCellRenderer } from "./rating";
export { chipCellRenderer } from "./chip";
export { linkCellRenderer } from "./link";
export { imageCellRenderer } from "./image";
export { switchCellRenderer } from "./switch";
export { checkboxCellRenderer } from "./checkbox";
export { radioCellRenderer } from "./radio";
export { labelCellRenderer } from "./label";
export { inputCellRenderer } from "./input";
export { progressBarCellRenderer } from "./progressbar";
