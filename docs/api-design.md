# API Design

## Why Not `rows.map(row => <Cell />)`?

DOM-based tables use this pattern:

```tsx
{rows.map(row => (
  <tr key={row.id}>
    {columns.map(col => <td key={col.id}>{row[col.id]}</td>)}
  </tr>
))}
```

Canvas rendering does not use this pattern because:

1. **Virtual scroll conflict** — mounting 100K rows in React defeats virtual scrolling
2. **Scroll hot path performance** — the engine (WASM) controls row iteration for 60fps without React involvement
3. **Unnecessary complexity** — a custom reconciler is overkill for a fixed grid structure (rows × columns)

Instead we use **Column Render Prop** pattern:

```tsx
<Grid data={data} width={800} height={600}>
  <Column id="name" width={200}>
    {(value) => ({ type: "text", value, style: { fontWeight: "bold" } })}
  </Column>
  <Column id="price" width={100} align="right" />
  <Column id="status" width={120}>
    {(value) => ({ type: "badge", value, style: { color: "green" } })}
  </Column>
</Grid>
```

The engine iterates visible rows and calls the Column render prop per cell.
Users declare "what to draw", the engine decides "which rows, when".

---

## React Component API

### Object-based Columns (react-table style)

```tsx
import { Grid, type ColumnDef, setWasmUrl } from "@ohah/react-wasm-table";

const columns: ColumnDef[] = [
  { id: "name", width: 200, header: "Name", sortable: true },
  { id: "price", width: 100, header: "Price", align: "right", sortable: true },
  { id: "status", width: 120, header: "Status" },
];

function App() {
  const data = [
    { id: 1, name: "Alice", price: 100, status: "active" },
    { id: 2, name: "Bob", price: 200, status: "inactive" },
  ];

  return <Grid data={data} columns={columns} width={800} height={600} />;
}
```

### JSX Children (declarative style)

```tsx
import { Grid, Column } from "@ohah/react-wasm-table";

function App() {
  return (
    <Grid data={data} width={800} height={600}>
      <Column id="name" width={200} header="Name" sortable />
      <Column id="price" width={100} header="Price" align="right" sortable />
      <Column id="status" width={120} header="Status" />
    </Grid>
  );
}
```

When `columns` prop is provided, JSX children are ignored.

### Grid Props

```typescript
interface GridProps {
  /** Row data as array of objects */
  data: Record<string, unknown>[];

  /** Canvas width in pixels */
  width: number;

  /** Canvas height in pixels */
  height: number;

  /** Row height in pixels (default: 36) */
  rowHeight?: number;

  /** Header height in pixels (default: 40) */
  headerHeight?: number;

  /** Theme overrides */
  theme?: Partial<Theme>;

  /** Object-based column definitions. Takes precedence over children. */
  columns?: ColumnDef[];

  /** Children must be <Column> elements. Ignored when columns prop is provided. */
  children?: React.ReactNode;
}
```

### ColumnDef (object-based)

```typescript
interface ColumnDef {
  id: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flexGrow?: number;
  flexShrink?: number;
  header?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  editor?: "text" | "number" | "select";
  render?: (value: unknown) => RenderInstruction;
}
```

### ColumnProps (JSX)

```typescript
interface ColumnProps {
  id: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flexGrow?: number;
  flexShrink?: number;
  header?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  editor?: "text" | "number" | "select";
  children?: (value: unknown) => RenderInstruction;
}
```

---

## Custom Cell Rendering

### RenderInstruction Types

The `children` render prop (or `render` in ColumnDef) returns a `RenderInstruction` —
a plain object describing what to draw. The canvas renderer maps each type to drawing commands.

```typescript
type RenderInstruction = TextInstruction | BadgeInstruction;

interface TextInstruction {
  type: "text";
  value: string;
  style?: {
    color?: string;
    fontWeight?: string;
    fontSize?: number;
  };
}

interface BadgeInstruction {
  type: "badge";
  value: string;
  style?: {
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
  };
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

**Object-based with render:**

```tsx
const columns: ColumnDef[] = [
  {
    id: "status",
    width: 120,
    header: "Status",
    render: (value) => ({
      type: "badge",
      value: String(value),
      style: { color: value === "active" ? "green" : "gray" },
    }),
  },
];
```

## Editor API

Editors are DOM overlays positioned over the canvas cell being edited.

### Built-in Editor Types

| Type     | Element                 | Behavior                      |
| -------- | ----------------------- | ----------------------------- |
| `text`   | `<input type="text">`   | Free text input               |
| `number` | `<input type="number">` | Numeric input with validation |
| `select` | `<select>`              | Dropdown                      |

### Editor Lifecycle

```
1. User double-clicks cell
2. hitTest via layout buffer → CellCoord { row, col }
3. Check Column.editor type
4. EditorManager creates DOM <input> overlay:
   - Position: cell's canvas x/y (from layout buffer)
   - Size: cell's width/height
   - Value: current cell value from JS data array
5. User edits value
6. On Enter/blur → commit:
   - Remove DOM overlay
   - Re-render canvas
7. On Escape → cancel:
   - Remove DOM overlay (no data change)
```

## Sorting

Click on a sortable column header cycles: none → ascending → descending → none.

Sort state is managed internally via ref (not React state) to avoid re-renders
on the scroll hot path.

```tsx
// Sorting enabled per column
<Grid data={data} columns={[
  { id: "name", width: 200, sortable: true },
  { id: "price", width: 100, sortable: true },
]} width={800} height={600} />
```

## WASM Initialization

The Grid component handles WASM loading internally:

```tsx
// Automatic — Grid loads WASM on mount
<Grid data={data} columns={columns} width={800} height={600} />
```

For custom WASM URL (e.g., CDN or public directory):

```tsx
import { setWasmUrl } from "@ohah/react-wasm-table";

setWasmUrl("/react_wasm_table_wasm_bg.wasm");
```

For manual preloading:

```tsx
import { initWasm } from "@ohah/react-wasm-table";

await initWasm();
```

## Theming

```tsx
<Grid
  data={data}
  columns={columns}
  width={800}
  height={600}
  theme={{
    headerBackground: "#f9fafb",
    headerColor: "#111827",
    cellBackground: "#ffffff",
    cellColor: "#374151",
    borderColor: "#e5e7eb",
    selectedBackground: "#dbeafe",
    fontFamily: "14px Inter, sans-serif",
    fontSize: 13,
    headerFontSize: 13,
  }}
/>
```

```typescript
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
