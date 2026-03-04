# Canvas Components

Rules and API for canvas JSX components (Text, Badge, Flex, etc.) used in cell rendering. Implemented: Text, Badge, Flex, Box, Stack, Sparkline, Rating, Color, Link, Chip, Tag, Image, Input, Checkbox, Radio, Label, Switch, ProgressBar.

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

## 4. Image

Image draws images on canvas using `drawImage()`. It supports all meaningful `<img>` HTML attributes that work in a Canvas rendering context, plus CSS `object-fit` style properties.

### 4.1 HTML `<img>` attributes

| Prop             | Type                               | Required | Description                          |
| ---------------- | ---------------------------------- | -------- | ------------------------------------ |
| `src`            | `string`                           | **Yes**  | Image URL                            |
| `alt`            | `string`                           | No       | Fallback text rendered on load error |
| `width`          | `number`                           | No       | Explicit render width (px)           |
| `height`         | `number`                           | No       | Explicit render height (px)          |
| `crossOrigin`    | `"anonymous" \| "use-credentials"` | No       | CORS setting                         |
| `referrerPolicy` | `ReferrerPolicy`                   | No       | Referrer policy for the image fetch  |
| `decoding`       | `"sync" \| "async" \| "auto"`      | No       | Decoding hint                        |
| `fetchPriority`  | `"high" \| "low" \| "auto"`        | No       | Fetch priority hint                  |

Attributes **not supported** (meaningless in Canvas context): `srcSet`, `sizes`, `loading`, `isMap`, `useMap`, deprecated attributes (`align`, `border`, `hspace`, `vspace`).

### 4.2 Style props

| Prop           | Type                                                       | Default  | Description                               |
| -------------- | ---------------------------------------------------------- | -------- | ----------------------------------------- |
| `objectFit`    | `"fill" \| "contain" \| "cover" \| "none" \| "scale-down"` | `"fill"` | How the image fits within its content box |
| `borderRadius` | `number`                                                   | `0`      | Border radius in pixels (clip path)       |
| `opacity`      | `number`                                                   | `1`      | Opacity (0–1, applied via `globalAlpha`)  |

Same `style` prop pattern as other components: `style?: Partial<ImageStyle>`, individual props override `style`.

### 4.3 object-fit modes

- **fill** — Stretches image to fill content box (ignores aspect ratio).
- **contain** — Scales image to fit entirely within content box (letterboxed).
- **cover** — Scales image to completely cover content box (cropped).
- **none** — Draws image at natural size, centered.
- **scale-down** — Uses the smaller of `none` and `contain`.

### 4.4 Image cache

Images are cached at module level (`Map<string, ImageCacheEntry>`). Each unique `src` is loaded only once. When the image finishes loading, it appears on the next canvas redraw cycle (triggered by scroll, interaction, or state change).

### 4.5 Content box clipping

The image is **always clipped to the content box** (cell area minus padding), regardless of `borderRadius`. This prevents `cover` and `none` modes from drawing outside the cell boundary. When `borderRadius > 0`, `roundRect` is used for the clip path; otherwise a plain `rect` clip is used.

### 4.6 Error handling

When an image fails to load and `alt` is provided, the alt text is rendered centered in the content box with `12px system-ui` in `#999` color. Without `alt`, nothing is drawn.

### 4.7 Example

```tsx
// Avatar with circular clip
<Image src={avatarUrl} objectFit="cover" borderRadius={20} crossOrigin="anonymous" />

// Photo with controls
<Image src={photoUrl} alt="User photo" objectFit="contain" opacity={0.8} />

// Inside a Stack layout
<Stack direction="row" gap={8}>
  <Image src={avatarUrl} width={28} height={28} objectFit="cover" borderRadius={14} />
  <Text value={userName} />
</Stack>
```

---

## 5. Implemented interactive components

### Input

Canvas-drawn text input with border, placeholder, and disabled state support.

| Prop          | Type      | Default | Description                                                                          |
| ------------- | --------- | ------- | ------------------------------------------------------------------------------------ |
| `value`       | `string`  | `""`    | Current text value                                                                   |
| `placeholder` | `string`  | `""`    | Placeholder text                                                                     |
| `disabled`    | `boolean` | `false` | Disabled state                                                                       |
| `style`       | `object`  | —       | fontSize, fontFamily, color, backgroundColor, borderColor, borderWidth, borderRadius |

### Checkbox

Self-drawing checkbox component. Draws a 16×16 rounded square with a checkmark when checked. Children (e.g. `Label`) are rendered to the right of the checkbox indicator.

| Prop       | Type                     | Default | Description                                                            |
| ---------- | ------------------------ | ------- | ---------------------------------------------------------------------- |
| `checked`  | `boolean`                | —       | Checked state                                                          |
| `disabled` | `boolean`                | `false` | Disabled state                                                         |
| `style`    | `Partial<CheckboxStyle>` | —       | size, borderColor, checkedColor, checkColor, borderRadius, borderWidth |
| `children` | `Instruction[]`          | `[]`    | Child instructions (e.g. Label)                                        |

```tsx
<Checkbox checked={done} onClick={toggle}>
  <Label value="Accept terms" />
</Checkbox>
```

### Radio

Self-drawing radio button component. Draws a 16×16 circle with an inner filled dot when checked. Children (e.g. `Label`) are rendered to the right of the radio indicator.

| Prop       | Type                  | Default | Description                                  |
| ---------- | --------------------- | ------- | -------------------------------------------- |
| `checked`  | `boolean`             | —       | Selected state                               |
| `disabled` | `boolean`             | `false` | Disabled state                               |
| `style`    | `Partial<RadioStyle>` | —       | size, borderColor, checkedColor, borderWidth |
| `children` | `Instruction[]`       | `[]`    | Child instructions (e.g. Label)              |

```tsx
<Radio checked={selected} onClick={select}>
  <Label value="Option A" />
</Radio>
```

### Label

Text component with pointer cursor, designed to be used as a child of Checkbox or Radio. Draws text identically to `Text` but sets the cursor to "pointer".

| Prop         | Type                  | Default         | Description                 |
| ------------ | --------------------- | --------------- | --------------------------- |
| `value`      | `string`              | —               | Label text                  |
| `style`      | `Partial<LabelStyle>` | —               | color, fontSize, fontWeight |
| `color`      | `string`              | theme.cellColor | Text color                  |
| `fontSize`   | `number`              | theme.fontSize  | Font size                   |
| `fontWeight` | `string`              | `"normal"`      | Font weight                 |

### Switch

Animated toggle switch with easing transitions. Tracks per-cell animation state for smooth checked/unchecked transitions.

| Prop       | Type      | Default | Description                                                                                           |
| ---------- | --------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `checked`  | `boolean` | —       | Checked state                                                                                         |
| `disabled` | `boolean` | `false` | Disabled state                                                                                        |
| `style`    | `object`  | —       | trackColor, activeTrackColor, thumbColor, width, height, transitionDuration, transitionTimingFunction |

### ProgressBar

Horizontal progress bar with optional percentage label. Caches bar geometry for click/drag editing support.

| Prop    | Type     | Default | Description                                                                        |
| ------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| `value` | `number` | —       | Current value                                                                      |
| `max`   | `number` | `100`   | Maximum value                                                                      |
| `style` | `object` | —       | color, backgroundColor, borderRadius, height, showLabel, labelColor, labelFontSize |

---

## 6. Stub components

These components are **exported and usable in JSX**, but the renderer only draws a placeholder (e.g. `[Icon]`). They return a `StubInstruction`; props (including `style`) are stored and will apply when a real renderer is added.

### Data display

| Component  | Intended use          |
| ---------- | --------------------- |
| **Icon**   | Icon (name or glyph). |
| **Avatar** | User avatar.          |

### Interactive (DOM overlay)

| Component       | Intended use     |
| --------------- | ---------------- |
| **NumberInput** | Number input.    |
| **Select**      | Dropdown select. |
| **DatePicker**  | Date picker.     |
| **Dropdown**    | Dropdown menu.   |

---

## Adding a new component

1. **Implement**: Add a cell renderer in `packages/grid/src/renderer/components/<name>.ts`, export and register it in `createCellRendererRegistry` in `components/index.ts`, and add the component in `components.tsx` that returns the corresponding instruction type.
2. **Stub only**: Add a stub in `components.tsx` with `stub("ComponentName")` and document it in the “Planned components” section above. No renderer change until implementation.
