# CSS Differences

react-wasm-table exposes a CSS-like API but runs layout through Taffy (Rust flexbox engine), not the browser. This document lists the differences from standard CSS.

## Supported units

| Unit                          | CSS                               | react-wasm-table |
| ----------------------------- | --------------------------------- | ---------------- |
| `px` (number)                 | `padding: 8px`                    | `padding={8}`    |
| `%`                           | `padding: 50%`                    | `padding="50%"`  |
| `auto`                        | `margin: auto`                    | `margin="auto"`  |
| `rem` / `em`                  | `padding: 1rem`                   | Not supported    |
| `vh` / `vw`                   | `width: 100vh`                    | Not supported    |
| `ch` / `ex`                   | `width: 10ch`                     | Not supported    |
| `calc()`                      | `width: calc(100% - 8px)`         | Not supported    |
| `min()` / `max()` / `clamp()` | `width: clamp(100px, 50%, 200px)` | Not supported    |

## Rect shorthand syntax

CSS rect properties (padding, margin, border, inset) use a tuple/array syntax instead of CSS string shorthand.

| CSS                       | react-wasm-table              |
| ------------------------- | ----------------------------- |
| `padding: 8px`            | `padding={8}`                 |
| `padding: 0 8px`          | `padding={[0, 8]}`            |
| `padding: 0 8px 4px`      | `padding={[0, 8, 4]}`         |
| `padding: 0 8px 4px 12px` | `padding={[0, 8, 4, 12]}`     |
| `"0 8px"` (string)        | Not supported, use `{[0, 8]}` |

## Default values

| Property     | CSS default   | react-wasm-table default   |
| ------------ | ------------- | -------------------------- |
| `padding`    | `0`           | `0`                        |
| `position`   | `static`      | `relative` (Taffy default) |
| `box-sizing` | `content-box` | `border-box`               |

## Layout model

- All layout is computed by Taffy (Rust), not the browser CSS engine
- Rendering is on `<canvas>`, not DOM elements
- `display: flex` is the default (CSS default is `block`)
- Grid (`display: grid`) is supported with same properties as CSS Grid
- No support for `display: block`, `inline`, `inline-flex`, `inline-grid`
- No `z-index` stacking context (canvas draws in order)
- No CSS transitions or animations
