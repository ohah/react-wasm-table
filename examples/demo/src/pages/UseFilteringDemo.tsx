import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, type ColumnFiltersState } from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";

type Employee = {
  id: number;
  name: string;
  department: string;
  salary: number;
  performanceScore: number | null;
};

const helper = createColumnHelper<Employee>();

const columns = [
  helper.accessor("id", {
    header: "ID",
    size: 70,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("name", {
    header: "Name",
    size: 180,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    enableSorting: true,
    padding: [0, 8],
  }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  helper.accessor("performanceScore", {
    header: "Score",
    size: 100,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

export function UseFilteringDemo() {
  const data = useMemo(() => generateEmployees(1000) as Record<string, unknown>[], []);

  // === Controlled column filters ===
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // === Quick filter inputs ===
  const [nameFilter, setNameFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [minSalary, setMinSalary] = useState("");

  const applyFilters = useCallback(() => {
    const filters: ColumnFiltersState = [];
    if (nameFilter) filters.push({ id: "name", value: nameFilter, op: "contains" });
    if (deptFilter) filters.push({ id: "department", value: deptFilter, op: "eq" });
    if (minSalary) filters.push({ id: "salary", value: Number(minSalary), op: "gte" });
    setColumnFilters(filters);
  }, [nameFilter, deptFilter, minSalary]);

  const clearFilters = useCallback(() => {
    setNameFilter("");
    setDeptFilter("");
    setMinSalary("");
    setColumnFilters([]);
    setGlobalFilter("");
  }, []);

  const inputStyle: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 13,
    width: 140,
  };

  return (
    <>
      <h1>useFiltering Hook</h1>
      <p>
        Demonstrates controlled filtering with <code>columnFilters</code> +{" "}
        <code>onColumnFiltersChange</code> and <code>globalFilter</code> +{" "}
        <code>onGlobalFilterChange</code>.
      </p>

      <h2>Column Filters</h2>
      <p style={{ fontSize: 13, color: "#666" }}>
        Apply column-level filters with different operators. Filters are combined with AND logic.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Name (contains)
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="e.g. Alice"
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Department (exact)
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ ...inputStyle, width: 150 }}
          >
            <option value="">All</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Design">Design</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            <option value="Operations">Operations</option>
          </select>
        </label>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Min Salary (gte)
          <input
            type="number"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
            placeholder="e.g. 100000"
            style={inputStyle}
          />
        </label>
        <button
          onClick={applyFilters}
          style={{
            padding: "4px 16px",
            borderRadius: 4,
            border: "1px solid #1976d2",
            background: "#1976d2",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            height: 28,
          }}
        >
          Apply
        </button>
        <button
          onClick={clearFilters}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
            height: 28,
          }}
        >
          Clear All
        </button>
      </div>

      <h2>Global Filter</h2>
      <p style={{ fontSize: 13, color: "#666" }}>
        Search across all string columns (case-insensitive, OR logic).
      </p>
      <input
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Search all columns..."
        style={{ ...inputStyle, width: 300, marginBottom: 12 }}
      />

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 14, marginBottom: 6 }}>Grid API</h4>
        <Grid
          data={data}
          width={640}
          height={400}
          columns={columns}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          overflowY="scroll"
        />
      </section>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
          marginTop: 16,
        }}
      >
        {`const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);\n`}
        {`const [globalFilter, setGlobalFilter] = useState("");\n\n`}
        {`<Grid\n`}
        {`  columnFilters={columnFilters}\n`}
        {`  onColumnFiltersChange={setColumnFilters}\n`}
        {`  globalFilter={globalFilter}\n`}
        {`  onGlobalFilterChange={setGlobalFilter}\n`}
        {`/>`}
      </pre>

      <div
        style={{
          padding: 12,
          background: "#f9f9f9",
          borderRadius: 4,
          fontSize: 13,
          marginTop: 16,
        }}
      >
        <strong>Active filters:</strong>{" "}
        {columnFilters.length > 0
          ? columnFilters
              .map((f) => `${f.id} ${f.op ?? "eq"} ${JSON.stringify(f.value)}`)
              .join(" AND ")
          : "none"}
        {globalFilter && (
          <>
            {columnFilters.length > 0 ? " | " : ""}
            <em>global: &quot;{globalFilter}&quot;</em>
          </>
        )}
      </div>
    </>
  );
}
