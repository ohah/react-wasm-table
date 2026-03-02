import { useState, useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  type SortingState,
  type GridColumnDef,
} from "@ohah/react-wasm-table";
import { useContainerSize } from "../useContainerSize";
import { CodeSnippet } from "../components/CodeSnippet";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  city: string;
  department: string;
  status: string;
  salary: number;
  score: number;
};

function generateData(count: number): Person[] {
  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank"];
  const lastNames = ["Kim", "Lee", "Park", "Choi", "Smith", "Johnson", "Brown", "Garcia"];
  const cities = ["Seoul", "Tokyo", "NYC", "London", "Berlin", "Paris"];
  const depts = ["Engineering", "Product", "Design", "Marketing", "Sales"];
  const statuses = ["Active", "On Leave", "Inactive"];
  const rng = ((s: number) => () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  })(42);
  return Array.from({ length: count }, () => ({
    firstName: firstNames[Math.floor(rng() * firstNames.length)]!,
    lastName: lastNames[Math.floor(rng() * lastNames.length)]!,
    age: 22 + Math.floor(rng() * 40),
    city: cities[Math.floor(rng() * cities.length)]!,
    department: depts[Math.floor(rng() * depts.length)]!,
    status: statuses[Math.floor(rng() * statuses.length)]!,
    salary: 40000 + Math.floor(rng() * 160000),
    score: Math.floor(rng() * 100),
  }));
}

const helper = createColumnHelper<Person>();

// 2-level grouped columns
const twoLevelColumns: GridColumnDef<Person, any>[] = [
  helper.group({
    id: "name",
    header: "Name",
    columns: [
      helper.accessor("firstName", { header: "First", size: 120, enableSorting: true }),
      helper.accessor("lastName", { header: "Last", size: 120, enableSorting: true }),
    ],
  }),
  helper.group({
    id: "info",
    header: "Info",
    columns: [
      helper.accessor("age", { header: "Age", size: 80, enableSorting: true, align: "right" }),
      helper.accessor("city", { header: "City", size: 100, enableSorting: true }),
    ],
  }),
  helper.accessor("department", { header: "Department", size: 130, enableSorting: true }),
  helper.accessor("status", { header: "Status", size: 100, enableSorting: true }),
];

// 3-level grouped columns
const threeLevelColumns: GridColumnDef<Person, any>[] = [
  helper.group({
    id: "personal",
    header: "Personal",
    columns: [
      helper.group({
        id: "name",
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First", size: 120, enableSorting: true }),
          helper.accessor("lastName", { header: "Last", size: 120, enableSorting: true }),
        ],
      }),
      helper.accessor("age", { header: "Age", size: 80, enableSorting: true, align: "right" }),
    ],
  }),
  helper.group({
    id: "work",
    header: "Work",
    columns: [
      helper.accessor("department", { header: "Dept", size: 130, enableSorting: true }),
      helper.accessor("salary", {
        header: "Salary",
        size: 120,
        enableSorting: true,
        align: "right",
      }),
    ],
  }),
  helper.accessor("status", { header: "Status", size: 100, enableSorting: true }),
];

// Flat columns (no groups) for comparison
const flatColumns: GridColumnDef<Person, any>[] = [
  helper.accessor("firstName", { header: "First Name", size: 120, enableSorting: true }),
  helper.accessor("lastName", { header: "Last Name", size: 120, enableSorting: true }),
  helper.accessor("age", { header: "Age", size: 80, enableSorting: true, align: "right" }),
  helper.accessor("department", { header: "Department", size: 130, enableSorting: true }),
  helper.accessor("status", { header: "Status", size: 100, enableSorting: true }),
];

type Level = "flat" | "2-level" | "3-level";

export function GroupedColumnsDemo() {
  const { ref: containerRef, size } = useContainerSize();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [level, setLevel] = useState<Level>("2-level");
  const data = useMemo(() => generateData(200), []);

  const columns =
    level === "flat" ? flatColumns : level === "2-level" ? twoLevelColumns : threeLevelColumns;
  const headerHeight = level === "flat" ? 40 : level === "2-level" ? 30 : 26;

  return (
    <div>
      <h2>Grouped Columns (Multi-Level Headers)</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Multi-level column headers rendered on canvas. Group headers span across their children.
        Sort indicators appear on leaf columns only.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["flat", "2-level", "3-level"] as Level[]).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            style={{
              padding: "6px 16px",
              border: level === l ? "2px solid #1976d2" : "1px solid #ccc",
              borderRadius: 4,
              background: level === l ? "#e3f2fd" : "#fff",
              cursor: "pointer",
              fontWeight: level === l ? "bold" : "normal",
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div ref={containerRef} style={{ height: 500 }}>
        {size.width > 0 && (
          <Grid
            data={data}
            columns={columns}
            width={size.width}
            height={500}
            rowHeight={36}
            headerHeight={headerHeight}
            sorting={sorting}
            onSortingChange={setSorting}
          />
        )}
      </div>

      <CodeSnippet title="2-Level Grouped Columns">
        {`
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";

const helper = createColumnHelper<Person>();

const columns = [
  helper.group({
    id: "name",
    header: "Name",
    columns: [
      helper.accessor("firstName", { header: "First", size: 120 }),
      helper.accessor("lastName", { header: "Last", size: 120 }),
    ],
  }),
  helper.group({
    id: "info",
    header: "Info",
    columns: [
      helper.accessor("age", { header: "Age", size: 80 }),
      helper.accessor("city", { header: "City", size: 100 }),
    ],
  }),
  // Ungrouped leaf column — renders with rowSpan across all header rows
  helper.accessor("department", { header: "Department", size: 130 }),
];

<Grid
  data={data}
  columns={columns}
  width={800}
  height={500}
  headerHeight={30}   // per-row height (total = rows × headerHeight)
  rowHeight={36}
/>
        `}
      </CodeSnippet>

      <CodeSnippet title="3-Level Nested Groups">
        {`
const columns = [
  helper.group({
    id: "personal",
    header: "Personal",
    columns: [
      helper.group({
        id: "name",
        header: "Name",
        columns: [
          helper.accessor("firstName", { header: "First", size: 120 }),
          helper.accessor("lastName", { header: "Last", size: 120 }),
        ],
      }),
      helper.accessor("age", { header: "Age", size: 80 }),
    ],
  }),
  helper.group({
    id: "work",
    header: "Work",
    columns: [
      helper.accessor("department", { header: "Dept", size: 130 }),
      helper.accessor("salary", { header: "Salary", size: 120 }),
    ],
  }),
  helper.accessor("status", { header: "Status", size: 100 }),
];
        `}
      </CodeSnippet>
    </div>
  );
}
