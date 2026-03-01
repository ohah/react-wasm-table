# Canvas Components

Rules and API for canvas JSX components (Text, Badge, Flex, etc.) used in cell rendering.

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

## 4. Stub components

Rating, Icon, ProgressBar, etc. are stubs (placeholder instructions). ProgressBar is planned as an **interactive (DOM overlay)** component: canvas-drawn bar for display, plus `<input type="range">` overlay when the cell is edited. Stubs use the same pattern:

- **`style` prop**: Optional `style?: Record<string, unknown>`. Merged with other props; individual props override `style`. When implemented, each stub can expose a typed style surface like Text/Badge/Flex.

New components should follow the same rules: optional `style` + individual prop merging (individual overrides), and `ReactNode` children where applicable.
