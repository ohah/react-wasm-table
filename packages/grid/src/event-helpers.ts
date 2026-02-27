import type {
  CellCoord,
  GridCellEvent,
  GridHeaderEvent,
  GridKeyboardEvent,
  GridScrollEvent,
  GridCanvasEvent,
  GridCanvasEventType,
  HitTestResult,
} from "./types";

/** Viewport + content coordinates computed from a mouse event. */
export interface ContentCoords {
  contentX: number;
  contentY: number;
  viewportX: number;
  viewportY: number;
}

function createBase() {
  const obj = {
    defaultPrevented: false,
    preventDefault() {
      obj.defaultPrevented = true;
    },
  };
  return obj;
}

function assignMouse(target: Record<string, unknown>, native: MouseEvent, coords: ContentCoords) {
  target.nativeEvent = native;
  target.contentX = coords.contentX;
  target.contentY = coords.contentY;
  target.viewportX = coords.viewportX;
  target.viewportY = coords.viewportY;
  target.shiftKey = native.shiftKey;
  target.ctrlKey = native.ctrlKey;
  target.metaKey = native.metaKey;
  target.altKey = native.altKey;
}

export function createGridCellEvent(
  native: MouseEvent,
  cell: CellCoord,
  coords: ContentCoords,
): GridCellEvent {
  const base = createBase();
  assignMouse(base as unknown as Record<string, unknown>, native, coords);
  (base as unknown as Record<string, unknown>).cell = cell;
  return base as unknown as GridCellEvent;
}

export function createGridHeaderEvent(
  native: MouseEvent,
  colIndex: number,
  coords: ContentCoords,
): GridHeaderEvent {
  const base = createBase();
  assignMouse(base as unknown as Record<string, unknown>, native, coords);
  (base as unknown as Record<string, unknown>).colIndex = colIndex;
  return base as unknown as GridHeaderEvent;
}

export function createGridKeyboardEvent(native: KeyboardEvent): GridKeyboardEvent {
  const base = createBase();
  return Object.assign(base, {
    nativeEvent: native,
    key: native.key,
    code: native.code,
    shiftKey: native.shiftKey,
    ctrlKey: native.ctrlKey,
    metaKey: native.metaKey,
    altKey: native.altKey,
  }) as unknown as GridKeyboardEvent;
}

export function createGridScrollEvent(
  deltaY: number,
  deltaX: number,
  native: WheelEvent | null,
): GridScrollEvent {
  const base = createBase();
  return Object.assign(base, {
    deltaY,
    deltaX,
    nativeEvent: native,
  }) as unknown as GridScrollEvent;
}

export function createGridCanvasEvent(
  type: GridCanvasEventType,
  native: MouseEvent,
  hitTest: HitTestResult,
  coords: ContentCoords,
): GridCanvasEvent {
  const base = createBase();
  assignMouse(base as unknown as Record<string, unknown>, native, coords);
  (base as unknown as Record<string, unknown>).type = type;
  (base as unknown as Record<string, unknown>).hitTest = hitTest;
  return base as unknown as GridCanvasEvent;
}
