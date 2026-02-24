# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  User Code                                                      │
│                                                                 │
│  <Grid data={data} width={800} height={600}>                    │
│    <Column id="name" width={200} header="Name" sortable />      │
│    <Column id="price" width={100} align="right" editor="number"/>│
│  </Grid>                                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 1: React Headless API    │
          │  (Config collection only)       │
          │  • <Grid> — canvas mount + ctx  │
          │  • <Column> — register to ctx   │
          │  • Hooks — useGrid, useEditor   │
          │  Output: ColumnConfig[]         │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 2: JS Adapter            │
          │  • Column Registry              │
          │  • Instruction Builder          │
          │  • Event Manager (click/scroll) │
          │  • Editor Manager (overlay DOM) │
          │  Output: RenderInstruction[]    │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 3: WASM Core Engine      │
          │  (Rust compiled to WASM)        │
          │  • DataStore (rows, columns)    │
          │  • Taffy Layout Engine          │
          │  • Virtual Scroll               │
          │  • Sorting / Filtering          │
          │  Output: LayoutResult[]         │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 4: Canvas Renderer       │
          │  • Cell drawing (text, bg)      │
          │  • Header rendering             │
          │  • Selection / highlight        │
          │  • Scrollbar                    │
          │  • Hit testing                  │
          │  Output: pixels on <canvas>     │
          └─────────────────────────────────┘
```

## Data Flow

### Render Cycle

```
1. React reconciles → Column configs collected via context
2. Adapter builds RenderInstructions from configs + data
3. WASM Engine receives instructions:
   a. DataStore filters/sorts data
   b. VirtualScroll computes visible row range
   c. Taffy computes flexbox layout for visible cells
   d. Returns LayoutResult[] (x, y, w, h per cell)
4. Canvas Renderer draws each cell using LayoutResult + content
```

### Scroll Cycle (hot path — no React involvement)

```
1. Canvas scroll event → Adapter.Event Manager
2. New scrollTop → WASM Engine.query(scrollTop)
3. Engine recomputes visible slice + layout
4. Renderer redraws visible cells
```

React is NOT involved in the scroll hot path. This is critical for 60fps scrolling
with large datasets.

### Edit Cycle

```
1. User double-clicks cell → Renderer.hitTest(x,y) → CellCoord
2. Adapter.Editor Manager reads Column editor type
3. Overlay a real DOM <input> at the cell's canvas position
4. On commit → update DataStore → re-render affected region
```

Editors are DOM overlays because canvas cannot host native inputs.
Only the actively-edited cell uses DOM — everything else stays on canvas.

## Taffy Integration

[Taffy](https://github.com/DioxusLabs/taffy) is a high-performance Rust flexbox/grid
layout engine. We use it to compute cell positions instead of manual arithmetic.

### Why Taffy?

| Manual layout                 | Taffy                               |
| ----------------------------- | ----------------------------------- |
| Breaks with column resize     | Flexbox handles it                  |
| No wrapping/alignment support | Full flex alignment                 |
| Hard-coded spacing            | Gap, padding, margin                |
| Fragile position math         | Declarative style → computed layout |

### Layout Model

```
Root (Row: flex-direction=column)
├── Header Row (flex-direction=row)
│   ├── Header Cell [width=200, flex-shrink=0]
│   ├── Header Cell [width=100, flex-shrink=0]
│   └── Header Cell [flex-grow=1]         ← fills remaining
├── Body Container (flex-direction=column, overflow=scroll)
│   ├── Data Row (flex-direction=row)
│   │   ├── Cell [width=200]
│   │   ├── Cell [width=100]
│   │   └── Cell [flex-grow=1]
│   ├── Data Row ...
│   └── ...
```

Each visible row is a Taffy flex row. Taffy computes:

- `x, y` position of each cell
- `width, height` after flex resolution
- Alignment within cells (left/center/right via `justify-content`)

### Performance

Taffy layout is computed only for **visible rows** (virtual scroll window).
For a viewport showing ~30 rows × 10 columns = 300 nodes — Taffy handles this
in microseconds.

## Module Boundaries

### crates/core (Pure Rust, no WASM deps)

```rust
pub struct DataStore { ... }
pub struct LayoutEngine { ... }  // wraps Taffy
pub fn apply_sort(rows, configs) -> sorted_rows
pub fn apply_filters(rows, conditions) -> filtered_rows
pub fn compute_virtual_slice(state) -> VirtualSlice
pub fn compute_layout(columns, viewport, rows) -> Vec<CellLayout>
```

Testable with `cargo test` — no browser needed.

### crates/wasm (WASM bindings)

```rust
#[wasm_bindgen]
pub struct TableEngine {
    store: DataStore,
    layout: LayoutEngine,
}

#[wasm_bindgen]
impl TableEngine {
    pub fn set_columns(&mut self, cols: JsValue) { ... }
    pub fn set_data(&mut self, data: JsValue) { ... }
    pub fn query(&mut self, scroll_top: f64) -> Result<JsValue, JsError> { ... }
    pub fn compute_layout(&mut self, viewport: JsValue) -> Result<JsValue, JsError> { ... }
}
```

Thin serialization layer. No business logic.

### packages/grid/src/adapter (JS)

```typescript
interface ColumnConfig {
  id: string;
  width: number;
  flexGrow?: number;
  flexShrink?: number;
  align?: "left" | "center" | "right";
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  editor?: EditorType;
  renderCell?: (value: unknown, row: unknown) => RenderInstruction;
}

interface RenderInstruction {
  type: "text" | "badge" | "icon" | "custom";
  value: string;
  style?: CellStyle;
}

class ColumnRegistry {
  register(config: ColumnConfig): void;
  unregister(id: string): void;
  getAll(): ColumnConfig[];
}

class EventManager {
  attach(canvas: HTMLCanvasElement): void;
  detach(): void;
  onCellClick(handler: (coord: CellCoord) => void): void;
  onScroll(handler: (scrollTop: number) => void): void;
}

class EditorManager {
  open(coord: CellCoord, type: EditorType, value: unknown): void;
  commit(): void;
  cancel(): void;
}
```

### packages/grid/src/renderer (JS)

```typescript
class CanvasRenderer {
  constructor(canvas: HTMLCanvasElement);
  render(frame: RenderFrame): void;
  hitTest(x: number, y: number): CellCoord | null;
  measureText(text: string, font: string): TextMetrics;
  destroy(): void;
}

interface RenderFrame {
  layouts: CellLayout[]; // from WASM
  contents: CellContent[]; // from adapter
  selection?: Selection;
  scrollTop: number;
}
```

### packages/grid/src/react (Headless Components)

```tsx
// Grid: mounts canvas, provides context
function Grid({ data, width, height, children, ...props }: GridProps): JSX.Element;

// Column: registers config via context (renders nothing)
function Column({ id, width, header, ...props }: ColumnProps): null;
```

`<Column>` returns `null` — it's a configuration node, not a visual node.
`<Grid>` renders a single `<canvas>` element plus an editor overlay container.

## Rendering Strategy: Why Not DOM?

| Metric            | DOM `<table>`             | Canvas Grid           |
| ----------------- | ------------------------- | --------------------- |
| 10K rows render   | ~2s (with virtual scroll) | ~5ms                  |
| Memory per row    | ~1KB (DOM nodes)          | ~40 bytes (data only) |
| Scroll FPS        | 30-45 fps                 | 60 fps                |
| Style flexibility | Full CSS                  | Flexbox subset        |
| Accessibility     | Native                    | Requires ARIA overlay |

Trade-off: we sacrifice full CSS for massive performance gains.
Flexbox via Taffy covers 95% of grid layout needs.

## Canvas + React-like DX: How It Works

Users write:

```tsx
<Grid data={data}>
  <Column id="name" width={200} />
  <Column id="price" width={100} align="right" />
</Grid>
```

Under the hood:

1. `<Column>` calls `registry.register({ id: "name", width: 200 })` on mount
2. `<Column>` calls `registry.unregister("name")` on unmount
3. `<Grid>` observes registry changes → triggers WASM layout + canvas redraw
4. Result: users think in React components, rendering happens on canvas

### Custom Cell Rendering

```tsx
<Column id="status" width={120}>
  {(value, row) => ({
    type: "badge",
    value: String(value),
    style: { color: value === "active" ? "#10b981" : "#6b7280" },
  })}
</Column>
```

The render prop returns a `RenderInstruction`, not JSX.
The canvas renderer knows how to draw each instruction type.

### Row-level Customization

For `{rows.map(row => <Cell />)}`-style patterns:

```tsx
<Grid data={data}>
  <Column id="name" width={200} />
  <Column id="actions" width={80}>
    {(value, row) => ({
      type: "icon-button",
      icon: "delete",
      onClick: () => handleDelete(row.id),
    })}
  </Column>
</Grid>
```

The engine manages row iteration internally (virtual scroll decides which rows
to render). Users customize per-cell rendering through Column render props.
This is intentional: the engine controls the render loop for performance,
while users control the content through declarative column definitions.
