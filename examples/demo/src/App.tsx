import { useMemo } from "react";
import { Grid, type ColumnDef, setWasmUrl } from "@ohah/react-wasm-table";

// Point directly to the .wasm binary in public/ so the bundler doesn't interfere.
setWasmUrl("/react_wasm_table_wasm_bg.wasm");

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Operations",
];

const TITLES = [
  "Junior Engineer",
  "Senior Engineer",
  "Staff Engineer",
  "Principal Engineer",
  "Engineering Manager",
  "Product Manager",
  "Designer",
  "Marketing Lead",
  "Sales Rep",
  "HR Specialist",
  "Accountant",
  "Ops Manager",
];

const FIRST_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace",
  "Hank", "Ivy", "Jack", "Karen", "Leo", "Mia", "Noah", "Olivia",
  "Paul", "Quinn", "Ruby", "Sam", "Tina", "Uma", "Victor", "Wendy",
  "Xander", "Yuki", "Zara",
];

const LAST_NAMES = [
  "Kim", "Lee", "Park", "Choi", "Jung", "Smith", "Johnson", "Williams",
  "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Tanaka", "Sato", "Suzuki", "Takahashi", "Watanabe",
];

function generateEmployees(count: number): Record<string, unknown>[] {
  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  };
  const rand = rng(42);

  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!;
    const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]!;
    const dept = DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)]!;
    const year = 2015 + Math.floor(rand() * 10);
    const month = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");

    return {
      id: i + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      department: dept,
      title: TITLES[Math.floor(rand() * TITLES.length)]!,
      salary: 40000 + Math.floor(rand() * 160000),
      startDate: `${year}-${month}-${day}`,
      isActive: rand() > 0.15,
      performanceScore: rand() > 0.1 ? Math.round(rand() * 50 + 50) : null,
      teamSize: 1 + Math.floor(rand() * 20),
    };
  });
}

const columns: ColumnDef[] = [
  { id: "id", width: 70, header: "ID", sortable: true, align: "right" },
  { id: "name", width: 180, header: "Name", sortable: true },
  { id: "email", width: 260, header: "Email", sortable: true },
  { id: "department", width: 130, header: "Department", sortable: true },
  { id: "title", width: 180, header: "Title", sortable: true },
  { id: "salary", width: 110, header: "Salary", sortable: true, align: "right" },
  { id: "startDate", width: 110, header: "Start Date", sortable: true },
  { id: "isActive", width: 80, header: "Active", sortable: true, align: "center" },
  { id: "performanceScore", width: 80, header: "Score", sortable: true, align: "right" },
  { id: "teamSize", width: 80, header: "Team", sortable: true, align: "right" },
];

export function App() {
  const data = useMemo(() => generateEmployees(50_000), []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>react-wasm-table Demo</h1>
      <p>Rendering {data.length.toLocaleString()} rows with Canvas + WASM layout</p>
      <Grid data={data} width={1280} height={600} columns={columns} />
    </div>
  );
}
