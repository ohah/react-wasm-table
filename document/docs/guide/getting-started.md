# Getting Started

## Installation

```bash
bun add @ohah/react-wasm-table
```

## Quick Start

```tsx
import { WasmProvider, Table } from "@ohah/react-wasm-table";

const columns = [
  { key: "name", header: "Name", sortable: true },
  { key: "age", header: "Age", sortable: true },
];

const data = [
  ["Alice", 30],
  ["Bob", 25],
];

function App() {
  return (
    <WasmProvider>
      <Table columns={columns} data={data} height={400} />
    </WasmProvider>
  );
}
```
