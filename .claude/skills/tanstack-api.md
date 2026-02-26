# TanStack Table API (react-wasm-table)

Canvas-based WASM grid with TanStack Table v8-compatible column definition API.

## Column Definition Pattern

```tsx
import { Grid, createColumnHelper, Text, Badge } from "@ohah/react-wasm-table";

type Person = { name: string; age: number; status: string };
const helper = createColumnHelper<Person>();

const columns = [
  helper.accessor("name", { header: "Name", size: 150, padding: [0, 8] }),
  helper.accessor("age", {
    header: "Age",
    size: 80,
    align: "right",
    enableSorting: true,
    cell: (info) => <Text value={String(info.getValue())} fontWeight="bold" />,
  }),
  helper.accessor("status", {
    header: "Status",
    size: 120,
    cell: (info) => (
      <Badge
        value={info.getValue()}
        color="white"
        backgroundColor={info.getValue() === "Active" ? "#4caf50" : "#9e9e9e"}
      />
    ),
  }),
  helper.group({
    header: "Info",
    columns: [
      helper.accessor("name", { header: "Name" }),
      helper.accessor("age", { header: "Age" }),
    ],
  }),
  helper.display({ id: "actions", header: "Actions", size: 80 }),
];
```

## Column Helper Methods

| Method | Description |
|--------|-------------|
| `helper.accessor(key, opts)` | Data column by property name — type-safe `getValue()` |
| `helper.accessor(fn, opts)` | Data column by function (requires `id`) |
| `helper.display(opts)` | Display-only column (requires `id`) |
| `helper.group(opts)` | Group column with nested `columns` (multi-level headers) |

## Column Properties

**TanStack-compatible (내부 변환됨):**
- `size` → width, `minSize` → minWidth, `maxSize` → maxWidth
- `enableSorting` → sortable
- `cell: string | (info: CellContext<T, V>) => RenderInstruction | ReactElement | string`
- `header: string | (ctx: HeaderContext<T, V>) => string`

**Canvas extensions (Taffy flexbox):**
- `flexGrow`, `flexShrink`, `flexBasis`, `align`
- `padding`, `paddingTop/Right/Bottom/Left`
- `margin`, `marginTop/Right/Bottom/Left`
- `borderWidth`, `borderTopWidth/RightWidth/BottomWidth/LeftWidth`
- `height`, `minHeight`, `maxHeight`
- `alignSelf`, `position`, `inset`, `insetTop/Right/Bottom/Left`
- `gridRow`, `gridColumn`, `justifySelf`
- `editor: "text" | "number" | "select"`

## Sorting (Controlled / Uncontrolled)

```tsx
// Controlled
const [sorting, setSorting] = useState([]);
<Grid sorting={sorting} onSortingChange={setSorting} columns={columns} ... />

// Uncontrolled
<Grid initialState={{ sorting: [{ id: "age", desc: false }] }} columns={columns} ... />
```

## Canvas JSX Components

`cell` 함수에서 JSX로 사용. 내부적으로 `RenderInstruction` 반환.

```tsx
<Text value="hello" color="#333" fontWeight="bold" fontSize={14} />
<Badge value="Active" color="white" backgroundColor="green" />
<Flex direction="row" gap={8} align="center">
  <Text value="A" />
  <Badge value="B" />
</Flex>
```

Stub components (미래 지원 — placeholder 렌더링):
`ProgressBar`, `Sparkline`, `Rating`, `Icon`, `Image`, `Avatar`,
`Tag`, `Chip`, `Link`, `Color`, `Input`, `NumberInput`, `Select`,
`Checkbox`, `Switch`, `DatePicker`, `Dropdown`

## Type Variance 주의

`GridColumnDef<T>[]` 직접 annotate 시 TValue 공변성 에러 발생.
type annotation 생략하고 추론에 의존할 것.

```tsx
// Good
const columns = [helper.accessor("name", { header: "Name" })];

// Bad — variance error
const columns: GridColumnDef<Person>[] = [...];
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/grid/src/tanstack-types.ts` | GridColumnDef, CellContext, HeaderContext, SortingState |
| `packages/grid/src/column-helper.ts` | createColumnHelper factory |
| `packages/grid/src/resolve-columns.ts` | GridColumnDef → ColumnProps 변환 |
| `packages/grid/src/grid-instance.ts` | GridInstance, GridColumn (runtime methods) |
| `packages/grid/src/use-grid-table.ts` | React hook (controlled/uncontrolled) |
| `packages/grid/src/build-header-groups.ts` | Multi-level header builder |
| `packages/grid/src/components.tsx` | Canvas JSX components |
| `packages/grid/src/resolve-instruction.ts` | ReactElement → RenderInstruction |
| `packages/grid/src/react/Grid.tsx` | Main Grid component |
| `packages/grid/src/types.ts` | Core types (GridProps, ColumnProps, Theme) |

## Grid Container Props

```tsx
<Grid
  data={data} columns={columns} width={800} height={600}
  // Flexbox
  display="flex" flexDirection="row" flexWrap="nowrap"
  gap={8} alignItems="stretch" justifyContent="start"
  // Grid layout
  display="grid" gridTemplateColumns="1fr 2fr 1fr" gridAutoFlow="row"
  // Box model
  padding={[4, 8]} margin={0} borderWidth={1}
  // Overflow
  overflowX="visible" overflowY="visible"
  // Sorting
  sorting={sorting} onSortingChange={setSorting}
  initialState={{ sorting: [] }}
  // Theme
  theme={{ headerBackground: "#f5f5f5", fontSize: 13 }}
/>
```

## Build & Test

```bash
cargo test --workspace         # Rust 75 tests
bun test packages/             # JS 176 tests
bun run build                  # Full build (wasm + lib)
bun run dev:demo               # Demo server :12313
bun run test:e2e               # Playwright 19 tests
```
