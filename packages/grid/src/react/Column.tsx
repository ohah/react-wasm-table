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
    flexBasis,
    height,
    minHeight,
    maxHeight,
    alignSelf,
    position,
    inset,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    // Grid child props
    gridRow,
    gridColumn,
    justifySelf,
    header,
    align,
    sortable,
    editor,
    // Box model
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    margin,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    borderWidth,
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    boxSizing,
    aspectRatio,
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
    flexBasis,
    height,
    minHeight,
    maxHeight,
    alignSelf,
    position,
    inset,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    gridRow,
    gridColumn,
    justifySelf,
    header,
    align,
    sortable,
    editor,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    margin,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    borderWidth,
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    boxSizing,
    aspectRatio,
  ]);

  return null;
}
