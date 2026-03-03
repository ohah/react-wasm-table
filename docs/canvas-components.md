# Canvas Components

Rules and API for canvas JSX components (Text, Badge, Flex, etc.) used in cell rendering. Implemented: Text, Badge, Flex, Box, Stack, Sparkline, Rating, Color, Link, Chip, Tag.

---

## 1. Flex component

Flex is a **Taffy-compatible flex container** used inside cells. It exposes the same style surface as the layout engine (Taffy).

### 1.1 Styles: same surface as Taffy

Flex accepts **all container styles supported by Taffy** as props.

| Prop             | Type                                                                                    | Description             |
| ---------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| `flexDirection`  | `"row" \| "column" \| "row-reverse" \| "column-reverse"`                                | Main axis direction     |
| `flexWrap`       | `"nowrap" \| "wrap" \| "wrap-reverse"`                                                  | Wrapping                |
| `gap`            | `number \| string` (px, `"50%"`, `"auto"`, etc.)                                        | Gap (all sides)         |
| `rowGap`         | same                                                                                    | Row (vertical) gap      |
| `columnGap`      | same                                                                                    | Column (horizontal) gap |
| `alignItems`     | `"start" \| "end" \| "flex-start" \| "flex-end" \| "center" \| "baseline" \| "stretch"` | Cross-axis alignment    |
| `alignContent`   | above + `"space-between" \| "space-evenly" \| "space-around"`                           | Multi-line alignment    |
| `justifyContent` | same                                                                                    | Main-axis alignment     |
| `padding`        | `CssRect<CssLength>`                                                                    | Padding                 |
| `margin`         | `CssRect<CssLengthAuto>`                                                                | Margin                  |
| `borderWidth`    | `CssRect<CssLength>`                                                                    | Border width            |
| `boxSizing`      | `"border-box" \| "content-box"`                                                         | Box model               |
| `overflow`       | `"visible" \| "clip" \| "hidden" \| "scroll" \| "auto"`                                 | Overflow                |

Types are defined in `FlexContainerStyle` and `Css*` in the package, aligned with Grid container and column layout.

### 1.2 `style` prop (like a normal flex node)

In addition to individual props, you can pass styles via a **`style` object**.

- Type: `style?: Partial<FlexContainerStyle>`
- Example: `<Flex style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>...</Flex>`

### 1.3 Merging `style` and individual props

- Apply the `style` object first, then **individual props** override it.
- If the same key is set in both `style` and as a prop, the **individual prop wins**.

```tsx
<Flex style={{ flexDirection: "column", gap: 8 }} flexDirection="row" gap={4}>
  {/* Result: flexDirection = "row", gap = 4 */}
</Flex>
```

### 1.4 children: ReactNode

- **children** is typed as **`ReactNode`**.
- Only **valid React elements** are used for layout/rendering.
- `null`, `undefined`, strings, numbers, etc. are **ignored** at resolve time.

So you can use conditional children, empty nodes, and similar patterns freely.

```tsx
<Flex flexDirection="column">
  {condition && <Text value="Optional" />}
  <Text value="Always" />
  {null}
</Flex>
```

---

## 2. Internal representation: FlexInstruction

The Flex component returns a **FlexInstruction** (render instruction).

- `type: "flex"`
- **FlexContainerStyle** fields are **flattened** on the instruction (`flexDirection`, `gap`, `alignItems`, etc.).
- `children`: `RenderInstruction[]` — already resolved child instructions.

So `style` and individual props are merged at the component level; the instruction only has top-level keys (no nested `style` object).

---

## 3. Text, Badge, and Sparkline

Same extensible pattern as Flex:

- **`style` prop**: Optional `style` object (`Partial<TextStyle>` / `Partial<BadgeStyle>` / `Partial<SparklineStyle>`). Individual props override `style` when both are set.
- **Text**: `value`, `style?`, `color?`, `fontWeight?`, `fontSize?`.
- **Badge**: `value`, `style?`, `color?`, `backgroundColor?`, `borderRadius?`.
- **Sparkline**: Inline mini line chart. `data` (number[]), `style?`, `color?`, `strokeWidth?`, `variant?` (`"line"` | `"area"`). Fully drawn on canvas.

---

## 4. Stub components

Icon, ProgressBar, Input, etc. are stubs (placeholder instructions). They use the same pattern: optional `style` + individual prop merging (individual overrides), and `ReactNode` children where applicable. When implemented, each stub can expose a typed style surface like Text/Badge/Flex.

---

## Planned components (stub)

These components are **exported and usable in JSX**, but the renderer only draws a placeholder (e.g. `[ProgressBar]`). They return a `StubInstruction`; props (including `style`) are stored and will apply when a real renderer is added.

### Data display

Display-only; no DOM overlay. Canvas drawing only.

| Component  | Intended use          |
| ---------- | --------------------- |
| **Icon**   | Icon (name or glyph). |
| **Image**  | Image (src, alt).     |
| **Avatar** | User avatar.          |

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

1. **Implement**: Add a cell renderer in `packages/grid/src/renderer/components/<name>.ts`, export and register it in `createCellRendererRegistry` in `components/index.ts`, and add the component in `components.tsx` that returns the corresponding instruction type.
2. **Stub only**: Add a stub in `components.tsx` with `stub("ComponentName")` and document it in the “Planned components” section above. No renderer change until implementation.
