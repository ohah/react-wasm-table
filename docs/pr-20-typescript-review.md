# PR #20 TypeScript/React Review

## P1 — Fix before merge

| Location                                        | Issue                                                                                                                                                                                                                   | Fix / pattern                                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Grid.tsx** (getters passed to `useSelection`) | `getVisStart`, `getMemoryBridge`, `getStringTable` are inline arrows, so new ref every render → `handleKeyDown` changes every render → `useEventAttachment` effect re-runs every render (attach/detach on every paint). | Wrap in `useCallback(..., [])`: e.g. `getVisStart: useCallback(() => visStartRef.current, [])`, same for `getMemoryBridge` and `getStringTable`. |
| **use-selection.ts:99**                         | Non-null assertion `sm.getNormalized()!` after `sm.hasSelection`; TS doesn’t narrow return type.                                                                                                                        | Assign to variable and guard: `const norm = sm.getNormalized(); if (!norm) return;` then use `norm`.                                             |

---

## P2 — Should fix

| Location                                        | Issue                                                                                         | Fix / pattern                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **use-editing.ts:44**                           | Parameter type is `{ row: number; col: number }` instead of shared type.                      | Use `CellCoord` from `../../types` for the double-click handler coord.                                                                                          |
| **use-wasm-engine.ts:14–35**                    | `initWasm().then(...)` has no `.catch()`; rejections are unhandled.                           | Add `.catch((err) => { if (!cancelled) console.error(err); })` or report via callback/state.                                                                    |
| **use-grid-scroll.ts** / **use-render-loop.ts** | `col.width` handled as `number                                                                | undefined`and otherwise fallback (100 or 0);`ColumnProps.width`is`CssDimension` (number \| string \| "auto"). String/"auto" not explicitly handled.             | Either document fallback (e.g. "non-number width → 100") or handle union explicitly (e.g. `typeof c.width === "number" ? c.width : (c.width === undefined ? defaultVal : parseFallback(c.width))` or switch). |
| **Grid.tsx:185**                                | `useEventAttachment` receives `eventManager: eventManagerRef.current` (value) instead of ref. | Prefer `eventManagerRef: React.RefObject<EventManager>` and read `eventManagerRef.current` inside the hook so dependency is the ref object and intent is clear. |

---

## P3 — Nice to have

| Location                       | Issue                                                                                                    | Fix / pattern                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **css-utils.ts:31–32**         | Default `resolver` uses `v as unknown as number \| string \| undefined`; hides incorrect `T`.            | Keep default for backward compat but type it explicitly, or require callers to pass resolver when `T` is not number/string.           |
| **css-utils.ts:46–64**         | `resolveRect` uses `shorthand as [T, T]` etc. for array branches; assumes length already checked.        | Prefer type guards or narrow by length then assign to typed locals to avoid assertion.                                                |
| **use-grid-scroll.ts:27–66**   | Same scroll math (maxScrollY, totalColWidth, scroll clamping) in `handleWheel` and setInterval callback. | Extract e.g. `applyScrollDelta(dy, dx)` and call from both to avoid drift and duplication.                                            |
| **use-render-loop.ts:327–339** | Very large effect dependency array (refs + many props); refs are stable but list is hard to scan.        | Optional: group deps with a comment (e.g. “refs”, “layout”, “callbacks”) or split effect if a subset truly drives a distinct concern. |

---

## Summary

- **Type safety:** No `any` in production code; test files use `as any` for mocks (acceptable). `CellCoord` should be used in `use-editing` for consistency.
- **Unions:** `CssOverflow` "auto" → "scroll" is clear; column `width` (CssDimension) is handled by fallback, not exhaustive.
- **React:** P1 getter instability causes effect re-run every render; fix with stable getters. Other dependency arrays and ref usage are correct. `useCallback`/`useMemo` usage in Grid and hooks is appropriate.
- **Naming:** Hook and param names are clear; no renames required.
