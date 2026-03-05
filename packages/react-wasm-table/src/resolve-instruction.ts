import { isValidElement } from "react";
import type { RenderInstruction } from "./types";

/**
 * Check if a value looks like a RenderInstruction (plain object with a string `type` field).
 * Excludes React elements which also have a `type` field.
 */
function isRenderInstruction(value: unknown): value is RenderInstruction {
  if (value == null || typeof value !== "object") return false;
  if (isValidElement(value)) return false;
  return typeof (value as Record<string, unknown>).type === "string";
}

/**
 * Resolve a cell render result into a RenderInstruction.
 *
 * Handles:
 * 1. Already a RenderInstruction (built-in or custom type) → passthrough
 * 2. ReactElement (e.g., <Badge />) → call the function component to get RenderInstruction
 * 3. string → TextInstruction
 * 4. anything else → TextInstruction via String()
 */
export function resolveInstruction(result: unknown): RenderInstruction {
  // 1. Already a RenderInstruction (includes custom types like "progress")
  if (isRenderInstruction(result)) return result;

  // 2. ReactElement from JSX — call the component function
  if (isValidElement(result) && typeof result.type === "function") {
    const renderFn = result.type as unknown as (props: unknown) => RenderInstruction;
    const resolved = renderFn(result.props);
    if (isRenderInstruction(resolved)) return resolved;
  }

  // 3. Plain string
  if (typeof result === "string") return { type: "text", value: result };

  // 4. Fallback
  return { type: "text", value: String(result ?? "") };
}
