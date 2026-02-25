import { useMemo } from "react";
import { Grid, Column, setWasmUrl } from "@ohah/react-wasm-table";

// Point directly to the .wasm binary in public/ so the bundler doesn't interfere.
setWasmUrl("/react_wasm_table_wasm_bg.wasm");

function generateData(count: number): Record<string, unknown>[] {
  const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace"];
  const cities = ["Seoul", "Tokyo", "New York", "London", "Berlin", "Paris"];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: names[i % names.length],
    age: 20 + Math.floor(Math.random() * 40),
    city: cities[i % cities.length],
    salary: Math.floor(Math.random() * 100000),
  }));
}

export function App() {
  const data = useMemo(() => generateData(10_000), []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>react-wasm-table Demo</h1>
      <p>Rendering 10,000 rows with Canvas + WASM layout</p>
      <Grid data={data} width={800} height={500}>
        <Column id="id" width={80} header="ID" sortable />
        <Column id="name" width={150} header="Name" sortable />
        <Column id="age" width={80} header="Age" align="right" sortable />
        <Column id="city" width={150} header="City" sortable />
        <Column id="salary" width={120} header="Salary" align="right" sortable />
      </Grid>
    </div>
  );
}
