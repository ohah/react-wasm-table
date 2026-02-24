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

#### data_store

Manages row/column data and orchestrates query pipeline.

```rust
pub struct DataStore {
    columns: Vec<ColumnDef>,
    rows: Vec<Vec<Value>>,
    sort_configs: Vec<SortConfig>,
    filter_conditions: Vec<FilterCondition>,
    scroll_config: ScrollConfig,
}

impl DataStore {
    pub fn new() -> Self;
    pub fn set_columns(&mut self, columns: Vec<ColumnDef>);
    pub fn set_data(&mut self, rows: Vec<Vec<Value>>);
    pub fn set_sort(&mut self, configs: Vec<SortConfig>);
    pub fn set_filters(&mut self, conditions: Vec<FilterCondition>);
    pub fn set_scroll_config(&mut self, config: ScrollConfig);
    pub fn query(&self, scroll_top: f64) -> TableResult;
    pub fn row_count(&self) -> usize;
}
```

**Test scope:** data loading, query pipeline (filter → sort → slice), edge cases
(empty data, single row, null values).

#### sorting

Pure function. No state.

```rust
pub fn apply_sort(rows: &mut [Vec<Value>], configs: &[SortConfig], columns: &[ColumnDef]);
```

**Test scope:** single/multi-column sort, all value types, stability, empty input.

#### filtering

Pure function. No state.

```rust
pub fn apply_filters(rows: &[Vec<Value>], conditions: &[FilterCondition], columns: &[ColumnDef]) -> Vec<Vec<Value>>;
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

#### layout (NEW — Taffy integration)

Wraps Taffy to compute grid cell positions.

```rust
pub struct LayoutEngine {
    tree: TaffyTree<()>,
}

pub struct ColumnLayout {
    pub width: f32,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub align: Align,  // Left | Center | Right
}

pub struct Viewport {
    pub width: f32,
    pub height: f32,
    pub row_height: f32,
    pub header_height: f32,
    pub scroll_top: f32,
}

pub struct CellLayout {
    pub row: usize,
    pub col: usize,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub content_align: Align,
}

impl LayoutEngine {
    pub fn new() -> Self;

    /// Compute layout for header row
    pub fn compute_header_layout(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
    ) -> Vec<CellLayout>;

    /// Compute layout for visible data rows
    pub fn compute_rows_layout(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
        row_range: std::ops::Range<usize>,
    ) -> Vec<CellLayout>;
}
```

**Test scope:**

- Fixed-width columns sum to viewport width
- Flex-grow distributes remaining space
- Flex-shrink compresses when total > viewport
- Min/max width constraints
- Alignment mapping (left/center/right → Taffy justify-content)
- Header vs body layout consistency
- Single column, many columns, zero columns

---

## 2. wasm (Rust → WASM bindings)

**Path:** `crates/wasm/`
**Dependencies:** `react-wasm-table-core`, `wasm-bindgen`, `serde-wasm-bindgen`
**Test command:** `wasm-pack test --headless --chrome` (or `cargo test -p react-wasm-table-wasm`)

```rust
#[wasm_bindgen]
pub struct TableEngine {
    store: DataStore,
    layout: LayoutEngine,
}

#[wasm_bindgen]
impl TableEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self;

    pub fn set_columns(&mut self, columns: JsValue) -> Result<(), JsError>;
    pub fn set_data(&mut self, data: JsValue) -> Result<(), JsError>;
    pub fn row_count(&self) -> usize;
    pub fn set_scroll_config(&mut self, config: JsValue) -> Result<(), JsError>;
    pub fn set_sort(&mut self, configs: JsValue) -> Result<(), JsError>;
    pub fn set_filters(&mut self, conditions: JsValue) -> Result<(), JsError>;

    /// Main query: filter → sort → virtual slice → layout
    pub fn query(&mut self, scroll_top: f64) -> Result<JsValue, JsError>;

    /// Layout only (for resize without data change)
    pub fn compute_layout(&mut self, viewport: JsValue) -> Result<JsValue, JsError>;
}
```

**Responsibility:** Serialization/deserialization only. No business logic.
All logic lives in `core`.

**Test scope:** JS↔Rust serialization round-trips, error handling for malformed input,
JsValue conversion correctness.

---

## 3. adapter (TypeScript)

**Path:** `packages/grid/src/adapter/`
**Dependencies:** WASM module (via dynamic import)
**Test command:** `bun test packages/grid/src/adapter/`

### ColumnRegistry

```typescript
class ColumnRegistry {
  private columns: Map<string, ColumnConfig>;
  private order: string[];
  private listeners: Set<() => void>;

  register(config: ColumnConfig): void;
  unregister(id: string): void;
  update(id: string, partial: Partial<ColumnConfig>): void;
  getAll(): ColumnConfig[]; // ordered
  getById(id: string): ColumnConfig | undefined;
  subscribe(listener: () => void): () => void; // returns unsubscribe
}
```

**Test scope:** register/unregister ordering, duplicate id handling, subscription
notification, update partial merge.

### InstructionBuilder

```typescript
class InstructionBuilder {
  /**
   * Convert column configs + row data into render instructions
   * for the WASM engine and canvas renderer.
   */
  build(
    columns: ColumnConfig[],
    rows: unknown[],
    rowRange: { start: number; end: number },
  ): {
    wasmColumns: WasmColumnDef[]; // for WASM layout
    cellContents: CellContent[][]; // for canvas renderer
  };
}
```

**Test scope:** column config to WASM format conversion, render prop execution,
default rendering (no render prop), row range slicing.

### EventManager

```typescript
class EventManager {
  constructor(canvas: HTMLCanvasElement);

  attach(): void;
  detach(): void;

  onCellClick(handler: (coord: CellCoord) => void): () => void;
  onCellDoubleClick(handler: (coord: CellCoord) => void): () => void;
  onHeaderClick(handler: (columnId: string) => void): () => void;
  onScroll(handler: (scrollTop: number) => void): () => void;
  onResize(handler: (width: number, height: number) => void): () => void;

  /** Convert canvas pixel coords to cell coords using current layout */
  setLayoutResolver(resolver: (x: number, y: number) => CellCoord | null): void;
}
```

**Test scope:** event listener attach/detach cleanup, coordinate → cell resolution,
scroll throttling (rAF), handler registration/removal.

### EditorManager

```typescript
class EditorManager {
  constructor(container: HTMLElement);

  open(coord: CellCoord, config: EditorConfig): void;
  commit(): { coord: CellCoord; value: unknown } | null;
  cancel(): void;
  isOpen(): boolean;
  getCurrentCoord(): CellCoord | null;

  onCommit(handler: (coord: CellCoord, value: unknown) => void): () => void;
  onCancel(handler: () => void): () => void;
}

interface EditorConfig {
  type: "text" | "number" | "select" | "date" | "boolean";
  value: unknown;
  position: { x: number; y: number; width: number; height: number };
  options?: string[]; // for select type
}
```

**Test scope:** open/close lifecycle, DOM element creation/removal, value commit,
escape cancellation, position overlay accuracy. Uses happy-dom for DOM.

---

## 4. renderer (TypeScript)

**Path:** `packages/grid/src/renderer/`
**Dependencies:** none (pure canvas API)
**Test command:** `bun test packages/grid/src/renderer/`

### CanvasRenderer

```typescript
class CanvasRenderer {
  constructor(canvas: HTMLCanvasElement);

  /** Full frame render */
  render(frame: RenderFrame): void;

  /** Partial update (single cell) */
  renderCell(layout: CellLayout, content: CellContent): void;

  /** Find cell at canvas coordinates */
  hitTest(x: number, y: number): CellCoord | null;

  /** Measure text dimensions */
  measureText(text: string, font: string): { width: number; height: number };

  /** Set DPI scaling (for retina) */
  setScale(devicePixelRatio: number): void;

  destroy(): void;
}

interface RenderFrame {
  headerLayouts: CellLayout[];
  headerContents: CellContent[];
  bodyLayouts: CellLayout[];
  bodyContents: CellContent[];
  gridWidth: number;
  gridHeight: number;
  scrollTop: number;
  selection?: Selection;
  theme: Theme;
}
```

**Test scope:** Uses OffscreenCanvas or canvas mock.

- Correct draw calls for each CellContent type (text, badge, progress, icon)
- Hit testing accuracy (click at pixel → correct cell)
- DPI scaling (2x renders at double resolution)
- Theme application (colors, fonts)
- Selection highlight rendering

### Drawing Primitives

```typescript
// Internal — not exported
function drawTextCell(
  ctx: CanvasRenderingContext2D,
  layout: CellLayout,
  content: TextContent,
  theme: Theme,
): void;
function drawBadgeCell(
  ctx: CanvasRenderingContext2D,
  layout: CellLayout,
  content: BadgeContent,
  theme: Theme,
): void;
function drawProgressCell(
  ctx: CanvasRenderingContext2D,
  layout: CellLayout,
  content: ProgressContent,
  theme: Theme,
): void;
function drawGridLines(ctx: CanvasRenderingContext2D, layouts: CellLayout[], theme: Theme): void;
function drawSelection(
  ctx: CanvasRenderingContext2D,
  selection: Selection,
  layouts: CellLayout[],
  theme: Theme,
): void;
```

**Test scope:** Each primitive tested in isolation with pixel snapshot or draw call spy.

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
// useGrid — main state hook
function useGrid(config: GridConfig): GridState;

// useColumnRegistry — column collection
function useColumnRegistry(): ColumnRegistry;

// useWasm — WASM lifecycle
function useWasm(): { ready: boolean; error: Error | null; engine: TableEngine | null };

// useRenderLoop — animation frame management
function useRenderLoop(renderer: CanvasRenderer, engine: TableEngine): void;
```

**Test scope:** Uses happy-dom + React testing patterns.

- `<Column>` registration on mount/unmount
- `<Grid>` canvas element creation
- Hook state transitions (loading → ready → error)
- Re-render on column config change
- Cleanup on unmount

---

## Shared Types

**Path:** `packages/grid/src/types.ts`

```typescript
interface CellCoord {
  rowIndex: number;
  columnId: string;
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

interface CellContent {
  type: string;
  value: string;
  style?: Record<string, unknown>;
  onClick?: () => void;
}

interface Selection {
  type: "row" | "cell" | "range";
  rows?: number[];
  cells?: CellCoord[];
  range?: { start: CellCoord; end: CellCoord };
}

interface Theme {
  headerBg: string;
  headerColor: string;
  cellBg: string;
  cellColor: string;
  borderColor: string;
  selectionBg: string;
  font: string;
  headerFont: string;
}
```

Types are shared across adapter, renderer, and react modules.
They have no dependencies and no logic — pure data shapes.
