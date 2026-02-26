import { isValidElement } from "react";
import type { RenderInstruction } from "./types";

/** Check if a value is a RenderInstruction (has a known type field). */
function isRenderInstruction(value: unknown): value is RenderInstruction {
  if (value == null || typeof value !== "object") return false;
  const type = (value as Record<string, unknown>).type;
  return type === "text" || type === "badge" || type === "flex" || type === "stub";
}

/**
 * Resolve a cell render result into a RenderInstruction.
 *
 * Handles:
 * 1. Already a RenderInstruction → passthrough
 * 2. ReactElement (e.g., <Badge />) → call the function component to get RenderInstruction
 * 3. string → TextInstruction
 * 4. anything else → TextInstruction via String()
 */
export function resolveInstruction(result: unknown): RenderInstruction {
  // 1. Already a RenderInstruction
  if (isRenderInstruction(result)) return result;

  // 2. ReactElement from JSX — call the component function
  if (isValidElement(result) && typeof result.type === "function") {
    const resolved = (result.type as (props: unknown) => RenderInstruction)(result.props);
    if (isRenderInstruction(resolved)) return resolved;
  }

  // 3. Plain string
  if (typeof result === "string") return { type: "text", value: result };

  // 4. Fallback
  return { type: "text", value: String(result ?? "") };
}
