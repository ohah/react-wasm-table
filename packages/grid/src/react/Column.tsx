import { useEffect } from "react";
import type { ColumnProps } from "../types";
import { useColumnRegistry } from "./hooks";

/**
 * Declarative column definition component.
 * Renders nothing — registers column config with the parent Grid via context.
 */
export function Column(props: ColumnProps): null {
  const registry = useColumnRegistry();
  const {
    id,
    width,
    minWidth,
    maxWidth,
    flexGrow,
    flexShrink,
    header,
    align,
    sortable,
    editor,
    children,
  } = props;

  useEffect(() => {
    registry.register(id, props);
    return () => {
      registry.unregister(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    registry,
    id,
    width,
    minWidth,
    maxWidth,
    flexGrow,
    flexShrink,
    header,
    align,
    sortable,
    editor,
    children,
  ]);

  return null;
}
