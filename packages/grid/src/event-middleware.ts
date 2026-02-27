import type {
  GridCellEvent,
  GridHeaderEvent,
  GridKeyboardEvent,
  GridScrollEvent,
  GridCanvasEvent,
  GridTouchEvent,
} from "./types";

/** Event channel names for middleware routing. */
export type EventChannel =
  | "cellClick"
  | "cellDoubleClick"
  | "headerClick"
  | "cellMouseDown"
  | "cellMouseMove"
  | "cellMouseUp"
  | "keyDown"
  | "scroll"
  | "canvasEvent"
  | "touchStart"
  | "touchMove"
  | "touchEnd";

/** Union of all grid event types that flow through middleware. */
export type GridEvent =
  | GridCellEvent
  | GridHeaderEvent
  | GridKeyboardEvent
  | GridScrollEvent
  | GridCanvasEvent
  | GridTouchEvent;

/** Call to pass control to the next middleware (or final handler). */
export type NextFn = () => void;

/** A middleware function that can intercept, modify, or block events. */
export type EventMiddleware = (channel: EventChannel, event: GridEvent, next: NextFn) => void;

/**
 * Compose an array of middlewares into a single dispatch function.
 * Each middleware receives `(channel, event, next)` and must call `next()` to continue.
 * If a middleware does not call `next()`, the chain (including the final handler) is skipped.
 *
 * Returns a dispatch function `(channel, event) => void`.
 */
export function composeMiddleware(
  middlewares: EventMiddleware[],
  final_: (channel: EventChannel, event: GridEvent) => void,
): (channel: EventChannel, event: GridEvent) => void {
  if (middlewares.length === 0) {
    return final_;
  }

  return (channel: EventChannel, event: GridEvent) => {
    let index = 0;

    function next() {
      if (index > middlewares.length) {
        throw new Error("next() called more than once in event middleware");
      }
      const i = index++;
      if (i < middlewares.length) {
        middlewares[i]!(channel, event, next);
      } else {
        final_(channel, event);
      }
    }

    next();
  };
}
