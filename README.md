# react-wasm-table

High-performance React table component powered by Rust/WASM. All cell rendering happens on a single `<canvas>`, and layout + hit-testing runs in Rust via WebAssembly (Taffy flexbox engine).

```
React Headless API -> JS Adapter -> WASM Core (Rust/Taffy) -> Canvas Renderer
```

[Documentation](https://ohah.github.io/react-wasm-table/) | [Korean (한국어)](./README_KO.md)

## Features

- **Canvas rendering** - No DOM per cell; one canvas draws the entire viewport
- **WASM layout engine** - Taffy (Rust) handles flexbox/grid layout and hit-testing
- **TanStack-compatible API** - `createColumnHelper`, `useReactTable`, same column/state model
- **Canvas components** - Text, Badge, Flex, Box, Stack, Sparkline, Color, Tag, Rating, Chip, Link, Image, Icon, Avatar, Input, Select, Checkbox, Radio, Label, Switch, ProgressBar, DatePicker, Dropdown
- **Built-in features** - Sorting, filtering, selection, clipboard (copy/paste), CSV/TSV/JSON export
- **60fps scrolling** - Scroll hot path runs entirely outside React
- **Virtual scrolling** - Handles 1M+ rows

## Quick Start

### Install

```bash
npm install @ohah/react-wasm-table
# or
bun add @ohah/react-wasm-table
```

### Basic Usage

```tsx
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";

type Person = { name: string; age: number };

const helper = createColumnHelper<Person>();

const columns = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
];

const data: Person[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

function App() {
  return <Grid data={data} columns={columns} width={600} height={400} />;
}
```

### Canvas Components in Cells

```tsx
import { Grid, createColumnHelper, Flex, Badge, Rating } from "@ohah/react-wasm-table";

const columns = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => <Badge value={getValue()} backgroundColor="#d1fae5" color="#065f46" />,
  }),
  helper.accessor("rating", {
    header: "Rating",
    cell: ({ getValue }) => <Rating value={getValue()} max={5} />,
  }),
];
```

## Architecture

| Layer              | Role                                                 |
| ------------------ | ---------------------------------------------------- |
| React Headless API | Configuration collection (`Grid`, `Column`, hooks)   |
| JS Adapter         | Column registry, data ingestion, event management    |
| WASM Core (Rust)   | Columnar store, Taffy layout, virtual scroll, sort   |
| Canvas Renderer    | Cell drawing, header rendering, grid lines, hit-test |

## Canvas Components

| Component   | Description                          |
| ----------- | ------------------------------------ |
| Text        | Single-line text                     |
| Badge       | Pill/chip with background            |
| Flex        | Taffy-compatible flex container      |
| Box         | Container with padding/margin/border |
| Stack       | Row or column layout with gap        |
| Sparkline   | Inline mini line/area chart          |
| Color       | Centered square color swatch         |
| Tag         | Outlined text with border            |
| Rating      | Star rating (filled/empty)           |
| Chip        | Filled pill with optional close      |
| Link        | Clickable text with underline        |
| Image       | Canvas image with object-fit         |
| Icon        | SVG path icon                        |
| Avatar      | Circular avatar (image or initials)  |
| Input       | Text input with border/placeholder   |
| Select      | Select dropdown                      |
| Checkbox    | Checkable box with label             |
| Radio       | Radio button with label              |
| Label       | Text label with pointer cursor       |
| Switch      | Animated toggle switch               |
| ProgressBar | Horizontal progress bar              |
| DatePicker  | Date input with DOM overlay          |
| Dropdown    | Select input with DOM overlay        |

All components support event handlers: `onClick`, `onDoubleClick`, `onMouseDown`, `onMouseUp`, `onMouseEnter`, `onMouseLeave`.

## Hooks

| Hook            | Description                        |
| --------------- | ---------------------------------- |
| `useReactTable` | TanStack-compatible table instance |
| `useGridTable`  | Grid-specific table instance       |
| `useSorting`    | Column sorting state               |
| `useFiltering`  | Column/global filtering            |
| `useSelection`  | Cell/row selection                 |

## Row Models

- `getCoreRowModel` - Base row model
- `getSortedRowModel` - Sorted rows
- `getFilteredRowModel` - Filtered rows
- `getExpandedRowModel` - Tree/expandable rows
- `getPaginationRowModel` - Paginated rows
- `getGroupedRowModel` - Grouped rows
- `getFacetedRowModel` - Faceted rows

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
