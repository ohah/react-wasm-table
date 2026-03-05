import { useState, useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  Text,
  Badge,
  Flex,
  ProgressBar,
  type SortingState,
} from "@ohah/react-wasm-table";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  department: string;
  status: string;
  salary: number;
  score: number;
  startYear: number;
};

const DEPARTMENTS = ["Engineering", "Product", "Design", "Marketing", "Sales", "HR"];
const STATUSES = ["Active", "On Leave", "Inactive"];

function generatePeople(count: number): Person[] {
  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  };
  const rand = rng(123);
  const firstNames = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Hank",
    "Ivy",
    "Jack",
    "Karen",
    "Leo",
    "Mia",
    "Noah",
    "Olivia",
    "Paul",
    "Quinn",
    "Ruby",
  ];
  const lastNames = [
    "Kim",
    "Lee",
    "Park",
    "Choi",
    "Smith",
    "Johnson",
    "Brown",
    "Garcia",
    "Miller",
    "Davis",
    "Tanaka",
    "Sato",
  ];

  return Array.from({ length: count }, () => ({
    firstName: firstNames[Math.floor(rand() * firstNames.length)]!,
    lastName: lastNames[Math.floor(rand() * lastNames.length)]!,
    age: 22 + Math.floor(rand() * 40),
    department: DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)]!,
    status: STATUSES[Math.floor(rand() * STATUSES.length)]!,
    salary: 40000 + Math.floor(rand() * 160000),
    score: Math.floor(rand() * 100),
    startYear: 2015 + Math.floor(rand() * 10),
  }));
}

const helper = createColumnHelper<Person>();

export function TanStackApi() {
  const isDark = useDarkMode();
  const data = useMemo(() => generatePeople(10_000), []);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    helper.group({
      header: "Name",
      columns: [
        helper.accessor("firstName", {
          header: "First",
          size: 120,
          enableSorting: true,
          padding: [0, 8],
        }),
        helper.accessor("lastName", {
          header: "Last",
          size: 120,
          enableSorting: true,
          padding: [0, 8],
        }),
      ],
    }),
    helper.accessor("age", {
      header: "Age",
      size: 70,
      enableSorting: true,
      align: "right",
      padding: [0, 8],
      cell: (info) => <Text value={String(info.getValue())} fontWeight="bold" />,
    }),
    helper.accessor("department", {
      header: "Dept",
      size: 120,
      enableSorting: true,
      padding: [0, 8],
      cell: (info) => (
        <Badge value={info.getValue()} color={isDark ? "#e0e0e0" : "#333"} backgroundColor={isDark ? "#1e3a5f" : "#e3f2fd"} borderRadius={4} />
      ),
    }),
    helper.accessor("status", {
      header: "Status",
      size: 100,
      enableSorting: true,
      padding: [0, 8],
      cell: (info) => {
        const v = info.getValue();
        const bg = v === "Active" ? "#4caf50" : v === "On Leave" ? "#ff9800" : "#9e9e9e";
        return <Badge value={v} color="white" backgroundColor={bg} borderRadius={4} />;
      },
    }),
    helper.accessor("salary", {
      header: "Salary",
      size: 120,
      enableSorting: true,
      align: "right",
      padding: [0, 8],
      cell: (info) => (
        <Text
          value={`$${info.getValue().toLocaleString()}`}
          fontWeight="bold"
          color={info.getValue() > 100000 ? "#2e7d32" : (isDark ? "#e0e0e0" : "#333")}
        />
      ),
    }),
    helper.accessor("score", {
      header: "Score",
      size: 160,
      padding: [0, 8],
      cell: (info) => (
        <Flex flexDirection="row" gap={8} alignItems="center">
          <Text
            value={`${info.getValue()}%`}
            fontSize={12}
            color={info.getValue() >= 70 ? "#2e7d32" : "#d32f2f"}
          />
          <ProgressBar value={info.getValue()} max={100} color="#2196f3" />
        </Flex>
      ),
    }),
    helper.accessor("startYear", {
      header: "Start",
      size: 80,
      enableSorting: true,
      align: "center",
      padding: [0, 8],
    }),
  ], [isDark]);

  return (
    <>
      <h1>TanStack Table API</h1>
      <p>
        TanStack-compatible column definitions with <code>createColumnHelper</code>, JSX canvas
        components (<code>&lt;Text&gt;</code>, <code>&lt;Badge&gt;</code>, <code>&lt;Flex&gt;</code>
        ), column groups, and controlled sorting.
      </p>

      <div style={{ marginBottom: 16 }}>
        <strong>Features demonstrated:</strong>
        <ul style={{ margin: "4px 0", paddingLeft: 20, fontSize: 14 }}>
          <li>
            <code>createColumnHelper&lt;T&gt;()</code> — type-safe column definitions
          </li>
          <li>
            <code>helper.group()</code> — multi-level header ("Name" spans First + Last)
          </li>
          <li>
            <code>cell: (info) =&gt; &lt;Badge /&gt;</code> — JSX canvas components in cells
          </li>
          <li>
            <code>sorting / onSortingChange</code> — controlled sorting state
          </li>
          <li>
            <code>&lt;ProgressBar /&gt;</code> — stub component (renders as placeholder)
          </li>
        </ul>
      </div>

      {sorting.length > 0 && (
        <p style={{ color: "#1976d2", fontSize: 14 }}>
          Sorted by: <strong>{sorting[0]!.id}</strong> ({sorting[0]!.desc ? "desc" : "asc"}){" · "}
          <button
            onClick={() => setSorting([])}
            style={{
              background: "none",
              border: "none",
              color: "#d32f2f",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 14,
            }}
          >
            Clear
          </button>
        </p>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
        <Grid
          data={data as Record<string, unknown>[]}
          width={960}
          height={500}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          theme={isDark ? DARK_THEME : LIGHT_THEME}
        />
      </section>

    </>
  );
}
