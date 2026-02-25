# Module Specifications

Each module is independently testable with zero cross-module test dependencies.

## Module Dependency Graph

```
                    ┌──────────┐
                    │  react   │  Layer 1: React headless components
                    └────┬─────┘
                         │ uses
                    ┌────▼─────┐
                    │ adapter  │  Layer 2: JS orchestration
                    └──┬────┬──┘
                       │    │
              uses     │    │  uses
          ┌────────────┘    └──────────────┐
          │                                │
     ┌────▼─────┐                    ┌─────▼────┐
     │   wasm   │  Layer 3: bindings │ renderer │  Layer 4: canvas drawing
     └────┬─────┘                    └──────────┘
          │ wraps
     ┌────▼─────┐
     │   core   │  Layer 3: pure Rust logic
     └──────────┘
```

**Rule:** arrows point downward only. A module may never import from a higher layer.

---

## 1. core (Rust)

**Path:** `crates/core/`
**Dependencies:** `serde`, `serde_json`, `taffy`
**Test command:** `cargo test -p react-wasm-table-core`

### Submodules

#### columnar_store

Primary data store. Columnar typed arrays with view management (sort/filter on u32 indices).

```rust
pub struct ColumnarStore {
    pub columns: Vec<ColumnDef>,
    pub data: Vec<ColumnData>,
    pub row_count: usize,
    pub generation: u64,
    view_indices: Vec<u32>,
    view_dirty: bool,
    sort_configs: Vec<SortConfig>,
    filter_conditions: Vec<FilterCondition>,
    row_height: f64,
    viewport_height: f64,
    overscan: usize,
}

pub enum ColumnData {
    Float64(Vec<f64>),               // NaN = null sentinel
    Strings { ids: Vec<u32>, intern: StringInternTable },
    Bool(Vec<f64>),                  // 0.0/1.0/NaN
}

impl ColumnarStore {
    // Direct column setters (serde bypass — used by JS TypedArray ingestion)
    pub fn init(&mut self, col_count: usize, row_count: usize);
    pub fn set_column_float64(&mut self, col_idx: usize, values: &[f64]);
    pub fn set_column_bool(&mut self, col_idx: usize, values: &[f64]);
    pub fn set_column_strings(&mut self, col_idx: usize, unique: &[String], ids: &[u32]);
    pub fn finalize(&mut self);

    // View management
    pub fn set_sort(&mut self, configs: Vec<SortConfig>);
    pub fn set_filters(&mut self, conditions: Vec<FilterCondition>);
    pub fn set_scroll_config(&mut self, row_height: f64, viewport_height: f64, overscan: usize);
    pub fn rebuild_view(&mut self);  // filter → sort on u32 indices, skips if not dirty
    pub fn view_indices(&self) -> &[u32];
}

// Free functions operating on ColumnarStore
pub fn sort_indices_columnar(indices: &mut [u32], store: &ColumnarStore, configs: &[SortConfig]);
pub fn filter_indices_columnar(indices: &[u32], store: &ColumnarStore, conditions: &[FilterCondition]) -> Vec<u32>;
```

**Test scope:** data ingestion (serde and direct setters), type detection, sort/filter on columnar data,
view rebuild idempotency, string interning, null (NaN) handling, generation tracking.

#### data_store

Row-major store with index indirection. Internal module, not used by WASM layer.

**Test scope:** data loading, query pipeline (filter → sort → slice), edge cases.

#### sorting

Pure function. No state.

```rust
pub fn apply_sort(rows: &mut [Vec<Value>], configs: &[SortConfig], columns: &[ColumnDef]);
```

**Test scope:** single/multi-column sort, all value types, stability, empty input.

#### filtering

Pure function. No state.

```rust
pub fn apply_filters(rows: &[Vec<Value>], conditions: &[FilterCondition], columns: &[ColumnDef]) -> Vec<usize>;
```

**Test scope:** each operator (eq, neq, contains, gt, lt, gte, lte), type coercion,
case sensitivity, multiple conditions (AND logic), empty input.

#### virtual_scroll

Pure function. No state.

```rust
pub fn compute_virtual_slice(state: &ScrollState) -> VirtualSlice;

pub struct ScrollState {
    pub scroll_top: f64,
    pub viewport_height: f64,
    pub row_height: f64,
    pub total_rows: usize,
    pub overscan: usize,
}

pub struct VirtualSlice {
    pub start_index: usize,
    pub end_index: usize,
    pub offset_y: f64,
    pub total_height: f64,
    pub visible_count: usize,
}
```

**Test scope:** basic viewport, scrolled position, near-end boundary, overscan clamping,
empty/few rows.

#### layout (Taffy integration)

Wraps Taffy to compute grid cell positions.

```rust
pub struct LayoutEngine { tree: TaffyTree<()> }

pub struct ColumnLayout {
    pub width: f32,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub align: Align,
}

impl LayoutEngine {
    pub fn new() -> Self;
    pub fn compute_into_buffer(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
        row_range: Range<usize>,
        buf: &mut [f32],
    ) -> usize;  // returns cell count written
}
```

**Test scope:** fixed-width columns, flex-grow distribution, flex-shrink compression,
min/max width constraints, alignment mapping, scroll offsets, buffer output correctness.

#### layout_buffer

Flat f32 buffer format for zero-copy layout data.

```rust
pub const LAYOUT_STRIDE: usize = 8;  // [row, col, x, y, width, height, align, reserved]
pub fn buf_len(cell_count: usize) -> usize;
pub fn write_cell(buf: &mut [f32], index: usize, cell: &CellLayout);
pub fn read_cell(buf: &[f32], index: usize) -> CellLayout;
```

---

## 2. wasm (Rust → WASM bindings)

**Path:** `crates/wasm/`
**Dependencies:** `react-wasm-table-core`, `wasm-bindgen`, `serde-wasm-bindgen`
**Test command:** `cargo test -p react-wasm-table-wasm`

```rust
#[wasm_bindgen]
pub struct TableEngine {
    layout: LayoutEngine,
    layout_buf: Vec<f32>,
    layout_cell_count: usize,
    columnar: ColumnarStore,
}

#[wasm_bindgen]
impl TableEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self;

    // TypedArray direct ingestion (no serde for numerics)
    pub fn init_columnar(&mut self, col_count: usize, row_count: usize);
    pub fn ingest_float64_column(&mut self, col_idx: usize, values: &[f64]);
    pub fn ingest_bool_column(&mut self, col_idx: usize, values: &[f64]);
    pub fn ingest_string_column(&mut self, col_idx: usize, unique: JsValue, ids: &[u32]);
    pub fn finalize_columnar(&mut self);

    // Hot path
    pub fn update_viewport_columnar(&mut self, scroll_top, viewport, columns) -> Vec<f64>;
    pub fn set_columnar_sort(&mut self, configs: JsValue);
    pub fn set_columnar_scroll_config(&mut self, row_height, viewport_height, overscan);

    // Zero-copy buffer access
    pub fn get_layout_buffer_info(&self) -> Vec<usize>;
    pub fn get_layout_cell_count(&self) -> usize;
    pub fn get_columnar_view_indices_info(&self) -> Vec<usize>;

    // Column metadata
    pub fn set_columnar_columns(&mut self, columns: JsValue);
    pub fn get_column_float64_info(&self, col_idx: usize) -> Vec<usize>;
    pub fn get_column_type(&self, col_idx: usize) -> i32;
    pub fn get_columnar_generation(&self) -> u64;
}
```

**Responsibility:** Serialization/deserialization only. No business logic.
All logic lives in `core`.

---

## 3. adapter (TypeScript)

**Path:** `packages/grid/src/adapter/`
**Dependencies:** WASM module (via dynamic import)
**Test command:** `bun test packages/grid/src/adapter/`

### ColumnRegistry

```typescript
class ColumnRegistry {
  register(id: string, props: ColumnProps): void;
  unregister(id: string): void;
  setAll(columns: ColumnProps[]): void;  // bulk replace (for columns prop)
  getAll(): ColumnProps[];
  get(id: string): ColumnProps | undefined;
  readonly size: number;
  onChange(cb: () => void): () => void;  // returns unsubscribe
}
```

**Test scope:** register/unregister ordering, setAll bulk replace, subscription
notification, update on re-register.

### DataIngestor

```typescript
type ColumnDataType = "float64" | "bool" | "string";

function classifyColumns(data: Record<string, unknown>[], columnIds: string[]): ColumnDataType[];
function buildFloat64Column(data: Record<string, unknown>[], colId: string): Float64Array;
function buildBoolColumn(data: Record<string, unknown>[], colId: string): Float64Array;
function buildStringColumn(data: Record<string, unknown>[], colId: string): [string[], Uint32Array];
function ingestData(engine: WasmTableEngine, data: Record<string, unknown>[], columnIds: string[]): void;
```

**Test scope:** type classification (number, bool, string, null-skip, all-null default),
Float64Array/Uint32Array correctness, NaN null sentinel, string deduplication,
engine method call order.

### StringTable

```typescript
class StringTable {
  populate(data: Record<string, unknown>[], columnIds: string[]): void;
  get(colIdx: number, rowIdx: number): string;
  clear(): void;
}
```

**Test scope:** populate from objects, get returns correct strings, null → empty string.

### MemoryBridge

```typescript
class MemoryBridge {
  constructor(engine: WasmTableEngine, memory: WebAssembly.Memory);
  getLayoutBuffer(): Float32Array;       // cached zero-copy view
  getViewIndices(): Uint32Array;         // cached zero-copy view
  getColumnFloat64(colIdx: number): Float64Array | null;
  invalidate(): void;
}
```

**Test scope:** cache invalidation on memory growth, buffer re-creation.

### InstructionBuilder

```typescript
class InstructionBuilder {
  build(column: ColumnProps, value: unknown): RenderInstruction;
}
```

**Test scope:** text instruction for plain values, render prop execution,
error fallback to text, null/undefined handling.

### EventManager

```typescript
interface GridEventHandlers {
  onHeaderClick?: (colIndex: number) => void;
  onCellClick?: (coord: { row: number; col: number }) => void;
  onCellDoubleClick?: (coord: { row: number; col: number }) => void;
  onScroll?: (deltaY: number) => void;
}

class EventManager {
  attach(canvas: HTMLCanvasElement, handlers: GridEventHandlers): void;
  detach(): void;
  setLayouts(headerLayouts: CellLayout[], rowLayouts: CellLayout[]): void;
}
```

**Test scope:** event listener attach/detach cleanup, hit-test accuracy,
layout-based coordinate resolution.

### EditorManager

```typescript
class EditorManager {
  setContainer(div: HTMLElement): void;
  setOnCommit(cb: (coord, value) => void): void;
  open(coord: CellCoord, layout: CellLayout, editorType: string, currentValue: unknown): void;
  commit(): void;
  cancel(): void;
  readonly isEditing: boolean;
}
```

**Test scope:** open/close lifecycle, DOM element creation/removal, value commit,
escape cancellation, position overlay accuracy.

### LayoutReader

```typescript
const LAYOUT_STRIDE = 8;
function readCellRow(buf: Float32Array, i: number): number;
function readCellCol(buf: Float32Array, i: number): number;
function readCellX(buf: Float32Array, i: number): number;
function readCellY(buf: Float32Array, i: number): number;
function readCellWidth(buf: Float32Array, i: number): number;
function readCellHeight(buf: Float32Array, i: number): number;
function readCellAlign(buf: Float32Array, i: number): "left" | "center" | "right";
function hitTest(buf: Float32Array, start: number, count: number, x: number, y: number): number;
```

---

## 4. renderer (TypeScript)

**Path:** `packages/grid/src/renderer/`
**Dependencies:** none (pure canvas API)
**Test command:** `bun test packages/grid/src/renderer/`

### CanvasRenderer

```typescript
class CanvasRenderer {
  attach(canvas: HTMLCanvasElement): void;
  clear(): void;
  drawHeaderFromBuffer(buf: Float32Array, start: number, count: number, labels: string[], theme: Theme): void;
  drawRowsFromBuffer(buf: Float32Array, start: number, count: number, getInstruction: (cellIdx: number) => RenderInstruction, theme: Theme, headerHeight: number): void;
  drawGridLinesFromBuffer(buf: Float32Array, start: number, count: number, theme: Theme, headerHeight: number): void;
}
```

### Drawing Primitives

```typescript
function drawTextCell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, instruction: TextInstruction, theme: Theme): void;
function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, instruction: BadgeInstruction, theme: Theme): void;
function measureText(ctx: CanvasRenderingContext2D, text: string): number;
```

**Test scope:** draw call recording with canvas mock, theme application.

---

## 5. react (TypeScript + React)

**Path:** `packages/grid/src/react/`
**Dependencies:** adapter, renderer (via props/context)
**Test command:** `bun test packages/grid/src/react/`

### Components

```typescript
// Grid.tsx — orchestrator component
function Grid(props: GridProps): JSX.Element;
// Renders: <div> containing <canvas> + editor overlay <div>
// Manages: WASM lifecycle, adapter wiring, render loop

// Column.tsx — config registration component
function Column(props: ColumnProps): null;
// Renders: nothing (returns null)
// Side effect: registers/unregisters in ColumnRegistry via context
```

### Hooks

```typescript
function useGrid(): { columnRegistry: ColumnRegistry };
function useColumnRegistry(): ColumnRegistry;
function useWasm(): { engine: WasmTableEngine | null; isReady: boolean };
```

### Contexts

```typescript
const GridContext: React.Context<{ columnRegistry: ColumnRegistry }>;
const WasmContext: React.Context<{ engine: WasmTableEngine | null; isReady: boolean }>;
```

---

## Shared Types

**Path:** `packages/grid/src/types.ts`

```typescript
interface CellCoord {
  row: number;
  col: number;
}

interface CellLayout {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  contentAlign: "left" | "center" | "right";
}

type RenderInstruction = TextInstruction | BadgeInstruction;

interface TextInstruction {
  type: "text";
  value: string;
  style?: Partial<TextStyle>;
}

interface BadgeInstruction {
  type: "badge";
  value: string;
  style?: Partial<BadgeStyle>;
}

interface Theme {
  headerBackground: string;
  headerColor: string;
  cellBackground: string;
  cellColor: string;
  borderColor: string;
  selectedBackground: string;
  fontFamily: string;
  fontSize: number;
  headerFontSize: number;
}
```

Types are shared across adapter, renderer, and react modules.
They have no dependencies and no logic — pure data shapes.
