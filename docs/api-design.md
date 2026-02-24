# API Design

## Why Not `rows.map(row => <Cell />)`?

DOM 기반 테이블에서는 이렇게 쓴다:

```tsx
{
  rows.map((row) => (
    <tr key={row.id}>
      {columns.map((col) => (
        <td key={col.id}>{row[col.id]}</td>
      ))}
    </tr>
  ));
}
```

Canvas 렌더링에서는 이 패턴을 쓰지 않는다. 이유:

1. **가상 스크롤과 충돌** — 10만 행을 React에 마운트하면 가상 스크롤의 의미가 없음
2. **스크롤 핫패스 성능** — 행 반복을 엔진(WASM)이 제어해야 React 개입 없이 60fps 유지
3. **불필요한 복잡도** — Custom Reconciler를 만들어야 하지만, 테이블은 구조가 고정적(행×열)이라 과잉

대신 **Column Render Prop + RowStyle** 패턴을 사용한다:

```tsx
<Grid data={data}>
  {/* 셀 단위 커스텀 — Column render prop */}
  <Column id="name" width={200}>
    {(value) => ({ type: "text", value, style: { bold: true } })}
  </Column>
  <Column id="price" width={100} align="right" />
  <Column id="status" width={120}>
    {(value) => ({ type: "badge", value, style: { color: "green" } })}
  </Column>

  {/* 행 단위 스타일 — RowStyle render prop */}
  <RowStyle>
    {(row, index) => ({
      backgroundColor:
        index % 5 === 0
          ? "#f0f0f0"
          : row.isError
            ? "#fee2e2"
            : index % 2 === 0
              ? "#fafafa"
              : "#fff",
      opacity: row.isDeleted ? 0.5 : 1,
    })}
  </RowStyle>
</Grid>
```

엔진이 보이는 행을 순회하면서 Column render prop과 RowStyle 함수를 호출한다.
유저는 "무엇을 그릴지"를 선언하고, "어떤 행을 언제 그릴지"는 엔진이 결정한다.
결과적으로 `rows.map`과 동일한 표현력을 가지면서, 성능은 엔진이 보장한다.

---

## React Component API

### Basic Usage

```tsx
import { Grid, Column } from "@anthropic/react-wasm-table";

function App() {
  const data = [
    { id: 1, name: "Alice", price: 100, status: "active" },
    { id: 2, name: "Bob", price: 200, status: "inactive" },
    // ... 100K rows
  ];

  return (
    <Grid data={data} width={800} height={600}>
      <Column id="name" width={200} header="Name" sortable />
      <Column id="price" width={100} header="Price" align="right" sortable />
      <Column id="status" width={120} header="Status" />
    </Grid>
  );
}
```

### Grid Props

```typescript
interface GridProps<T = Record<string, unknown>> {
  /** Row data array */
  data: T[];

  /** Canvas width in pixels */
  width: number;

  /** Canvas height in pixels */
  height: number;

  /** Row height in pixels (default: 36) */
  rowHeight?: number;

  /** Header height in pixels (default: 40) */
  headerHeight?: number;

  /** Selection mode */
  selection?: "none" | "single" | "multi" | "range";

  /** Event handlers */
  onCellClick?: (coord: CellCoord, value: unknown) => void;
  onCellDoubleClick?: (coord: CellCoord, value: unknown) => void;
  onSelectionChange?: (selection: Selection) => void;
  onSortChange?: (sorts: SortConfig[]) => void;
  onFilterChange?: (filters: FilterCondition[]) => void;
  onScroll?: (scrollTop: number) => void;

  /** Initial sort state */
  defaultSort?: SortConfig[];

  /** Initial filter state */
  defaultFilters?: FilterCondition[];

  /** Debug mode — enables pipeline logs, overlay, DevTools */
  debug?: boolean | "warn" | "info" | "verbose";

  /** Visual debug overlay on canvas */
  debugOverlay?: boolean;

  /** React children — <Column> and <RowStyle> components */
  children: React.ReactNode;
}
```

### Column Props

```typescript
interface ColumnProps {
  /** Unique column identifier (matches data key) */
  id: string;

  /** Fixed width in pixels */
  width?: number;

  /** Flex grow factor (default: 0) */
  flexGrow?: number;

  /** Flex shrink factor (default: 1) */
  flexShrink?: number;

  /** Minimum width in pixels */
  minWidth?: number;

  /** Maximum width in pixels */
  maxWidth?: number;

  /** Header display text */
  header?: string;

  /** Text alignment */
  align?: "left" | "center" | "right";

  /** Enable sorting on this column */
  sortable?: boolean;

  /** Enable filtering on this column */
  filterable?: boolean;

  /** Cell editor type (activates on double-click) */
  editor?: "text" | "number" | "select" | "date" | "boolean";

  /** Editor options (for select type) */
  editorOptions?: string[];

  /** Whether column is resizable */
  resizable?: boolean;

  /** Whether column is pinned */
  pin?: "left" | "right";

  /** Custom cell render function */
  children?: (value: unknown, row: unknown, rowIndex: number) => RenderInstruction;
}
```

### RowStyle Props

```typescript
interface RowStyleProps {
  /**
   * Render function called per visible row.
   * Returns style overrides for that row.
   * Engine controls which rows are visible (virtual scroll).
   */
  children: (row: unknown, index: number) => RowStyleResult;
}

interface RowStyleResult {
  backgroundColor?: string;
  opacity?: number;
  borderBottom?: { width: number; color: string };
}
```

`<RowStyle>` returns `null` — it's a config node like `<Column>`.
The engine calls the render function only for visible rows during the render cycle.

---

## Custom Cell Rendering

### RenderInstruction Types

The `children` render prop on `<Column>` returns a `RenderInstruction` — a plain
object describing what to draw. The canvas renderer maps each type to drawing commands.

```typescript
type RenderInstruction =
  | TextInstruction
  | BadgeInstruction
  | ProgressInstruction
  | IconInstruction
  | CompositeInstruction;

interface TextInstruction {
  type: "text";
  value: string;
  style?: {
    color?: string;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
  };
}

interface BadgeInstruction {
  type: "badge";
  value: string;
  style?: {
    color?: string; // text color
    backgroundColor?: string; // badge fill
    borderRadius?: number;
  };
}

interface ProgressInstruction {
  type: "progress";
  value: number; // 0-1
  style?: {
    color?: string;
    trackColor?: string;
    height?: number;
  };
}

interface IconInstruction {
  type: "icon";
  icon: string; // icon name from built-in set
  style?: {
    color?: string;
    size?: number;
  };
  onClick?: () => void; // triggers via hitTest
}

interface CompositeInstruction {
  type: "composite";
  direction: "row" | "column";
  gap?: number;
  children: RenderInstruction[];
}
```

### Examples

**Badge column:**

```tsx
<Column id="status" width={120} header="Status">
  {(value) => ({
    type: "badge",
    value: String(value),
    style: {
      color: value === "active" ? "#065f46" : "#374151",
      backgroundColor: value === "active" ? "#d1fae5" : "#f3f4f6",
    },
  })}
</Column>
```

**Progress bar:**

```tsx
<Column id="progress" width={150} header="Progress">
  {(value) => ({
    type: "progress",
    value: Number(value) / 100,
    style: { color: "#3b82f6" },
  })}
</Column>
```

**Composite (icon + text):**

```tsx
<Column id="name" width={200} header="Name">
  {(value, row) => ({
    type: "composite",
    direction: "row",
    gap: 8,
    children: [
      { type: "icon", icon: "user", style: { color: "#6b7280", size: 16 } },
      { type: "text", value: String(value), style: { bold: true } },
    ],
  })}
</Column>
```

**Action button:**

```tsx
<Column id="actions" width={80} header="">
  {(value, row) => ({
    type: "icon",
    icon: "trash",
    style: { color: "#ef4444", size: 18 },
    onClick: () => handleDelete(row.id),
  })}
</Column>
```

## Editor API

Editors are DOM overlays positioned over the canvas cell being edited.

### Built-in Editor Types

| Type      | Element                   | Behavior                      |
| --------- | ------------------------- | ----------------------------- |
| `text`    | `<input type="text">`     | Free text input               |
| `number`  | `<input type="number">`   | Numeric input with validation |
| `select`  | `<select>`                | Dropdown from `editorOptions` |
| `date`    | `<input type="date">`     | Date picker                   |
| `boolean` | `<input type="checkbox">` | Toggle checkbox               |

### Editor Lifecycle

```
1. User double-clicks cell
2. hitTest → CellCoord { rowIndex, columnId }
3. Check Column.editor type
4. EditorManager creates DOM <input> overlay:
   - Position: cell's canvas x/y (from Taffy layout)
   - Size: cell's width/height
   - Value: current cell value
5. User edits value
6. On Enter/blur → commit:
   - Validate input
   - Update DataStore
   - Remove DOM overlay
   - Re-render canvas region
7. On Escape → cancel:
   - Remove DOM overlay (no data change)
```

### Editor Events

```tsx
<Grid
  data={data}
  onCellEdit={(coord, oldValue, newValue) => {
    // Return false to reject the edit
    if (coord.columnId === "price" && newValue < 0) return false;
    // Return true or void to accept
    updateData(coord.rowIndex, coord.columnId, newValue);
  }}
>
  <Column id="name" width={200} editor="text" />
  <Column id="price" width={100} editor="number" />
</Grid>
```

## Sorting API

Click on a sortable column header cycles: none → ascending → descending → none.

```tsx
<Grid
  data={data}
  defaultSort={[{ columnId: "name", direction: "asc" }]}
  onSortChange={(sorts) => console.log("Sort changed:", sorts)}
>
  <Column id="name" width={200} sortable />
  <Column id="price" width={100} sortable />
</Grid>
```

Multi-column sort: hold Shift + click additional columns.

## Filtering API

```tsx
<Grid
  data={data}
  defaultFilters={[
    { columnId: "status", operator: "equals", value: "active" },
    { columnId: "price", operator: "greaterThan", value: 100 },
  ]}
  onFilterChange={(filters) => console.log(filters)}
>
  <Column id="name" width={200} filterable />
  <Column id="price" width={100} filterable />
  <Column id="status" width={120} filterable />
</Grid>
```

## Selection API

```tsx
<Grid
  data={data}
  selection="range"
  onSelectionChange={(sel) => {
    // sel: { rows: number[], cells: CellCoord[] }
    console.log("Selected:", sel);
  }}
>
  ...
</Grid>
```

| Mode     | Behavior                                         |
| -------- | ------------------------------------------------ |
| `none`   | No selection                                     |
| `single` | Click selects one row                            |
| `multi`  | Ctrl/Cmd+click toggles rows                      |
| `range`  | Click+drag selects cell range (spreadsheet-like) |

## WASM Initialization

The Grid component handles WASM loading internally:

```tsx
// Automatic — Grid loads WASM on mount
<Grid data={data} width={800} height={600}>
  <Column id="name" width={200} />
</Grid>
```

For manual control (e.g., preloading):

```tsx
import { initWasm } from "@anthropic/react-wasm-table";

// Preload during app startup
await initWasm();
```

## Theming

```tsx
<Grid
  data={data}
  theme={{
    headerBg: "#f9fafb",
    headerColor: "#111827",
    cellBg: "#ffffff",
    cellColor: "#374151",
    borderColor: "#e5e7eb",
    selectionBg: "#dbeafe",
    font: "14px Inter, sans-serif",
    headerFont: "600 13px Inter, sans-serif",
  }}
>
  ...
</Grid>
```
