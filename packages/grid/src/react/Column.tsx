import type { ColumnProps } from "../types";

/**
 * Declarative column definition component.
 * Renders nothing — registers column config with the parent Grid via context.
 */
export function Column(_props: ColumnProps): null {
  // TODO: register column with useColumnRegistry() on mount/update,
  // unregister on unmount.
  return null;
}
