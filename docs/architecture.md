# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  User Code                                                      │
│                                                                 │
│  <Grid data={data} columns={columns} width={800} height={600} />│
│  // or JSX: <Grid data={data}><Column id="name" ... /></Grid>  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 1: React Headless API    │
          │  (Config collection only)       │
          │  • <Grid> — canvas mount + ctx  │
          │  • <Column> — register to ctx   │
          │  • Hooks — useGrid, useEditor   │
          │  Output: ColumnProps[]          │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 2: JS Adapter            │
          │  • Column Registry              │
          │  • Data Ingestor (TypedArrays)  │
          │  • String Table (JS-side cache) │
          │  • Memory Bridge (zero-copy)    │
          │  • Instruction Builder          │
          │  • Event Manager (click/scroll) │
          │  • Editor Manager (overlay DOM) │
          │  Output: RenderInstruction[]    │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 3: WASM Core Engine      │
          │  (Rust compiled to WASM)        │
          │  • ColumnarStore (typed arrays) │
          │  • Taffy Layout Engine          │
          │  • Virtual Scroll               │
          │  • Sorting / Filtering          │
          │  Output: Float32Array layout    │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Layer 4: Canvas Renderer       │
          │  • Cell drawing (text, badge)   │
          │  • Header rendering             │
          │  • Grid lines                   │
          │  • Hit testing                  │
          │  Output: pixels on <canvas>     │
          └─────────────────────────────────┘
```

## Data Flow

### Data Ingestion (on data change)

```
1. Object[] arrives from user (API JSON response)
2. JS DataIngestor classifies columns by type (float64 / bool / string)
3. Numeric/bool columns → Float64Array → WASM memory copy (no serde)
4. String columns → JS StringTable (display) + intern IDs → WASM (sort/filter)
5. ColumnarStore stores type-specific arrays, marks view dirty
```

### Render Cycle (per frame)

```
1. React reconciles → Column configs collected via ColumnRegistry
2. Single WASM call: engine.updateViewportColumnar(scrollTop, viewport, columns)
   a. ColumnarStore rebuilds view indices (filter → sort on u32 indices)
   b. VirtualScroll computes visible row range
   c. Taffy computes flexbox layout for visible cells
   d. Writes to flat Float32Array layout buffer (stride 8 per cell)
3. JS reads layout buffer via zero-copy MemoryBridge (Float32Array view)
4. Canvas Renderer draws each cell using layout buffer + StringTable
```

### Scroll Cycle (hot path — no React involvement)

```
1. Canvas wheel event → EventManager
2. New scrollTop → WASM updateViewportColumnar(scrollTop)
3. Engine recomputes visible slice + layout buffer
4. Renderer redraws visible cells from buffer
```

React is NOT involved in the scroll hot path. This is critical for 60fps scrolling
with large datasets.

### Edit Cycle

```
1. User double-clicks cell → hitTest via layout buffer → CellCoord
2. EditorManager reads Column editor type
3. Overlay a real DOM <input> at the cell's canvas position
4. On commit → update data → re-render
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
pub struct ColumnarStore { ... }     // columnar typed arrays + view management
pub struct LayoutEngine { ... }      // wraps Taffy
pub fn sort_indices_columnar(indices, store, configs)     // in-place sort on u32 indices
pub fn filter_indices_columnar(indices, store, conditions) // filter on u32 indices
pub fn compute_virtual_slice(state) -> VirtualSlice
```

Testable with `cargo test` — no browser needed.

### crates/wasm (WASM bindings)

```rust
#[wasm_bindgen]
pub struct TableEngine {
    layout: LayoutEngine,
    layout_buf: Vec<f32>,
    columnar: ColumnarStore,
}

#[wasm_bindgen]
impl TableEngine {
    // TypedArray direct ingestion (no serde for numerics)
    pub fn init_columnar(&mut self, col_count: usize, row_count: usize);
    pub fn ingest_float64_column(&mut self, col_idx: usize, values: &[f64]);
    pub fn ingest_bool_column(&mut self, col_idx: usize, values: &[f64]);
    pub fn ingest_string_column(&mut self, col_idx, unique: JsValue, ids: &[u32]);
    pub fn finalize_columnar(&mut self);

    // Hot path — single call per frame
    pub fn update_viewport_columnar(&mut self, scroll_top, viewport, columns) -> Vec<f64>;
    pub fn set_columnar_sort(&mut self, configs: JsValue);
    pub fn set_columnar_scroll_config(&mut self, row_height, viewport_height, overscan);

    // Zero-copy buffer access
    pub fn get_layout_buffer_info(&self) -> Vec<usize>;
    pub fn get_columnar_view_indices_info(&self) -> Vec<usize>;
}
```

Thin binding layer. All business logic lives in `core`.

### packages/grid/src/adapter (JS)

```typescript
class ColumnRegistry {
  register(id: string, props: ColumnProps): void;
  unregister(id: string): void;
  setAll(columns: ColumnProps[]): void; // for object-based columns prop
  getAll(): ColumnProps[];
  get(id: string): ColumnProps | undefined;
  onChange(cb: () => void): () => void;
}

// Classifies Object[] columns by type and sends TypedArrays to WASM
function ingestData(
  engine: WasmTableEngine,
  data: Record<string, unknown>[],
  columnIds: string[],
): void;

class StringTable {
  populate(data: Record<string, unknown>[], columnIds: string[]): void;
  get(colIdx: number, rowIdx: number): string;
}

class MemoryBridge {
  getLayoutBuffer(): Float32Array; // zero-copy view into WASM memory
  getViewIndices(): Uint32Array; // zero-copy view into WASM memory
}

class EventManager {
  attach(canvas: HTMLCanvasElement, handlers: GridEventHandlers): void;
  detach(): void;
  setLayouts(headerLayouts: CellLayout[], rowLayouts: CellLayout[]): void;
}

class EditorManager {
  setContainer(div: HTMLElement): void;
  open(coord: CellCoord, layout: CellLayout, editorType: string, value: unknown): void;
  commit(): void;
  cancel(): void;
}
```

### packages/grid/src/renderer (JS)

```typescript
class CanvasRenderer {
  attach(canvas: HTMLCanvasElement): void;
  clear(): void;
  drawHeaderFromBuffer(
    buf: Float32Array,
    start: number,
    count: number,
    labels: string[],
    theme: Theme,
  ): void;
  drawRowsFromBuffer(
    buf: Float32Array,
    start: number,
    count: number,
    getInstruction: fn,
    theme: Theme,
    headerHeight: number,
  ): void;
  drawGridLinesFromBuffer(
    buf: Float32Array,
    start: number,
    count: number,
    theme: Theme,
    headerHeight: number,
  ): void;
}
```

### packages/grid/src/react (Headless Components)

```tsx
// Grid: mounts canvas, provides context, runs render loop
function Grid({ data, width, height, columns, children, ...props }: GridProps): JSX.Element;

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
// Object-based columns (react-table style)
const columns: ColumnDef[] = [
  { id: "name", width: 200, header: "Name", sortable: true },
  { id: "price", width: 100, header: "Price", align: "right" },
];
<Grid data={data} columns={columns} width={800} height={600} />

// Or JSX children
<Grid data={data} width={800} height={600}>
  <Column id="name" width={200} header="Name" sortable />
  <Column id="price" width={100} header="Price" align="right" />
</Grid>
```

Under the hood:

1. Columns registered in ColumnRegistry (from prop or JSX children)
2. DataIngestor classifies data types, sends TypedArrays to WASM
3. `<Grid>` runs rAF render loop → single WASM call → layout buffer → canvas draw
4. Result: users think in React components, rendering happens on canvas

### Custom Cell Rendering

```tsx
<Column id="status" width={120}>
  {(value) => ({
    type: "badge",
    value: String(value),
    style: { color: value === "active" ? "#10b981" : "#6b7280" },
  })}
</Column>
```

The render prop returns a `RenderInstruction`, not JSX.
The canvas renderer knows how to draw each instruction type.
