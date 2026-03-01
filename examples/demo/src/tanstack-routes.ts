/**
 * Mapping from base (Grid API) path to TanStack example path.
 * Used to show "TanStack" button on demo pages and "Grid API" on TanStack pages.
 */
export const BASE_TO_TANSTACK: Record<string, string> = {
  "/": "/tanstack/home",
  "/stress-test": "/tanstack/stress-test",
  "/selection": "/tanstack/selection",
  "/event-callbacks": "/tanstack/event-callbacks",
  "/event-middleware": "/tanstack/event-middleware",
  "/touch-events": "/tanstack/touch-events",
  "/export": "/tanstack/export",
  "/clipboard": "/tanstack/clipboard",
  "/layout-cache": "/tanstack/layout-cache",
  "/column-features": "/tanstack/column-features",
  "/column-pinning": "/tanstack/column-pinning",
  "/column-dnd-row-pinning": "/tanstack/column-dnd-row-pinning",
  "/hooks/sorting": "/tanstack/hooks/sorting",
  "/hooks/filtering": "/tanstack/hooks/filtering",
  "/hooks/selection": "/tanstack/hooks/selection",
  "/hooks/composition": "/tanstack/hooks/composition",
  "/hooks/after-draw": "/tanstack/hooks/after-draw",
  "/hooks/adapter-di": "/tanstack/hooks/adapter-di",
  "/custom-renderer": "/tanstack/custom-renderer",
  "/layers": "/tanstack/layers",
  "/expanding": "/tanstack/expanding",
  // Canvas
  "/canvas-components": "/tanstack/canvas-components",
  "/canvas-text": "/tanstack/canvas-text",
  "/canvas-badge": "/tanstack/canvas-badge",
  "/canvas-flex": "/tanstack/canvas-flex",
  "/canvas-progress-bar": "/tanstack/canvas-progress-bar",
  "/canvas-box": "/tanstack/canvas-box",
  "/canvas-stack": "/tanstack/canvas-stack",
  // Grid / Flex / Box
  "/grid-template": "/tanstack/grid-template",
  "/flex-direction": "/tanstack/flex-direction",
  "/flex-wrap": "/tanstack/flex-wrap",
  "/gap": "/tanstack/gap",
  "/justify-content": "/tanstack/justify-content",
  "/align-items": "/tanstack/align-items",
  "/flex-grow": "/tanstack/flex-grow",
  "/position": "/tanstack/position",
  "/padding": "/tanstack/padding",
  "/margin": "/tanstack/margin",
  "/overflow": "/tanstack/overflow",
  "/scrollbar": "/tanstack/scrollbar",
  "/hooks": "/tanstack/hooks",
};

/** Reverse map: TanStack path → base path (for "Grid API" back link). */
export const TANSTACK_TO_BASE: Record<string, string> = Object.fromEntries(
  Object.entries(BASE_TO_TANSTACK).map(([a, b]) => [b, a]),
);
