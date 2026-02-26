# Getting Started

## Installation

```bash
bun add @ohah/react-wasm-table
```

## Quick Start

```tsx
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";

type Row = { name: string; age: number };

const helper = createColumnHelper<Row>();
const columns = [
  helper.accessor("name", { header: "Name", size: 200 }),
  helper.accessor("age", { header: "Age", size: 100 }),
];

const data: Row[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

function App() {
  return <Grid data={data} columns={columns} width={600} height={400} />;
}
```
