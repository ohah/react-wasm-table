import { useMemo } from "react";
import { Table, type ColumnDef } from "@anthropic/react-wasm-table";

function generateData(count: number): unknown[][] {
  const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace"];
  const cities = ["Seoul", "Tokyo", "New York", "London", "Berlin", "Paris"];

  return Array.from({ length: count }, (_, i) => [
    i + 1,
    names[i % names.length],
    20 + Math.floor(Math.random() * 40),
    cities[i % cities.length],
    Math.floor(Math.random() * 100000),
  ]);
}

const columns: ColumnDef[] = [
  { key: "id", header: "ID", width: 80, sortable: true, filterable: false },
  { key: "name", header: "Name", width: 150, sortable: true, filterable: true },
  { key: "age", header: "Age", width: 80, sortable: true, filterable: true },
  { key: "city", header: "City", width: 150, sortable: true, filterable: true },
  {
    key: "salary",
    header: "Salary",
    width: 120,
    sortable: true,
    filterable: true,
  },
];

export function App() {
  const data = useMemo(() => generateData(10_000), []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>react-wasm-table Demo</h1>
      <p>Rendering 10,000 rows with WASM-powered virtual scrolling</p>
      <Table columns={columns} data={data} height={500} rowHeight={36} />
    </div>
  );
}
