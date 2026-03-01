# Canvas component list

Overview of canvas JSX components: **supported** (implemented and drawn on canvas) vs **planned** (API defined, renderer shows a placeholder).

---

## Supported components

These components have a dedicated cell renderer and are fully drawn on canvas.

| Component     | Description                                                                                        | Main props                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Text**      | Single-line text.                                                                                  | `value`, `style?`, `color?`, `fontWeight?`, `fontSize?`                                                        |
| **Badge**     | Pill/chip with background.                                                                         | `value`, `style?`, `color?`, `backgroundColor?`, `borderRadius?`                                               |
| **Flex**      | Taffy-compatible flex container; lays out and draws all children (Text, Badge, Stub, nested Flex). | `children`, `style?`, `flexDirection?`, `gap?`, `alignItems?`, `justifyContent?`, …                            |
| **Box**       | Generic container: padding, margin, border; children drawn in content rect (vertical stack).       | `children?`, `style?`, `padding?`, `margin?`, `borderWidth?`, `borderColor?`, `backgroundColor?`, `boxSizing?` |
| **Stack**     | Row or column layout with gap (no padding from layout buffer).                                     | `children?`, `direction?` ("row" \| "column"), `gap?`, `style?`                                                |
| **Sparkline** | Inline mini line chart from a data array.                                                          | `data` (number[]), `style?`, `color?`, `strokeWidth?`, `variant?` ("line" \| "area")                           |

All six support the same pattern: optional `style` object and individual props (individual overrides `style`). See [Canvas Components](canvas-components.md) for API details.

---

## Planned components (stub)

These components are **exported and usable in JSX**, but the renderer only draws a placeholder (e.g. `[ProgressBar]`). They return a `StubInstruction`; props (including `style`) are stored and will apply when a real renderer is added.

### Layout

_(None — Box and Stack are implemented.)_

### Data display

Display-only; no DOM overlay. Canvas drawing only.

| Component  | Intended use                   |
| ---------- | ------------------------------ |
| **Rating** | Star or numeric rating.        |
| **Icon**   | Icon (name or glyph).          |
| **Image**  | Image (src, alt).              |
| **Avatar** | User avatar.                   |
| **Tag**    | Tag label.                     |
| **Chip**   | Chip with optional icon/close. |
| **Link**   | Clickable link (text + href).  |
| **Color**  | Color swatch.                  |

### Interactive (DOM overlay)

These require **DOM overlays** over the canvas (e.g. for editing or user control). The grid already has an editor layer; these stubs reserve the component names for future overlay UI.

| Component       | Intended use                                                                |
| --------------- | --------------------------------------------------------------------------- |
| **ProgressBar** | Progress bar: canvas display + `<input type="range">` overlay when editing. |
| **Input**       | Text input.                                                                 |
| **NumberInput** | Number input.                                                               |
| **Select**      | Dropdown select.                                                            |
| **Checkbox**    | Checkbox.                                                                   |
| **Switch**      | Toggle switch.                                                              |
| **DatePicker**  | Date picker.                                                                |
| **Dropdown**    | Dropdown menu.                                                              |

---

## Adding a new component

1. **Supported**: Implement a cell renderer in `packages/grid/src/renderer/cell-renderers/<name>.ts` (see existing `text.ts`, `badge.ts`, `box.ts`, `flex.ts`), export it and register it in `createCellRendererRegistry` in `cell-renderer.ts`, and add a component in `components.tsx` that returns the corresponding instruction type.
2. **Planned**: Add a stub in `components.tsx` with `stub("ComponentName")` and document it in the “Planned” table above. No renderer change until implementation.
