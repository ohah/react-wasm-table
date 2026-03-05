import type { RenderInstruction } from "./types";
import { resolveInstruction } from "./resolve-instruction";

/**
 * TanStack-compatible flexRender utility.
 *
 * Resolves a component/function/string into a RenderInstruction or string.
 * Works with:
 * - null/undefined → null
 * - string → string passthrough
 * - function(props) → calls the function, resolves the result
 */
export function flexRender<TProps extends object>(
  Comp: string | ((props: TProps) => unknown) | undefined | null,
  props: TProps,
): RenderInstruction | string | null {
  if (Comp == null) return null;
  if (typeof Comp === "string") return Comp;
  if (typeof Comp === "function") {
    const result = Comp(props);
    if (result == null) return null;
    if (typeof result === "string") return result;
    return resolveInstruction(result);
  }
  return null;
}
