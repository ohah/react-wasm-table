import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Select, Text } from "@ohah/react-wasm-table";

type Row = {
  id: number;
  name: string;
  role: string;
  department: string;
  status: string;
  priority: string;
};

const helper = createColumnHelper<Row>();

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

const NAMES = [
  "Alice Kim", "Bob Lee", "Charlie Park", "Diana Choi", "Eve Hong",
  "Frank Yoo", "Grace Shin", "Henry Kang", "Iris Moon", "Jack Oh",
  "Kate Ryu", "Leo Jang", "Mia Han", "Noah Bae", "Olivia Jung",
  "Paul Seo", "Quinn Im", "Ryan Hwang", "Sara Ahn", "Tom Song",
];

const ROLE_OPTIONS = [
  { value: "engineer", label: "Engineer" },
  { value: "designer", label: "Designer" },
  { value: "pm", label: "PM" },
  { value: "qa", label: "QA" },
  { value: "devops", label: "DevOps" },
];

const DEPT_OPTIONS = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "infra", label: "Infra" },
  { value: "data", label: "Data" },
  { value: "mobile", label: "Mobile" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "onleave", label: "On Leave" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function generateData(): Row[] {
  return NAMES.map((name, i) => ({
    id: i,
    name,
    role: ROLE_OPTIONS[i % ROLE_OPTIONS.length]!.value,
    department: DEPT_OPTIONS[i % DEPT_OPTIONS.length]!.value,
    status: STATUS_OPTIONS[i % STATUS_OPTIONS.length]!.value,
    priority: PRIORITY_OPTIONS[i % PRIORITY_OPTIONS.length]!.value,
  }));
}

export function CanvasSelect() {
  const [data, setData] = useState(generateData);
  const [disabled, setDisabled] = useState(false);

  const handleChange = useCallback((rowIndex: number, field: keyof Row, value: string) => {
    setData((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)));
  }, []);

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 120,
        padding: [0, 8],
        cell: (info) => <Text value={info.getValue()} />,
      }),
      helper.display({
        id: "roleSelect",
        header: "Role",
        size: 150,
        cell: (info) => (
          <Select
            value={info.row.original.role}
            options={ROLE_OPTIONS}
            disabled={disabled}
            onChange={(e) => handleChange(info.row.index, "role", e.target.value)}
          />
        ),
      }),
      helper.display({
        id: "deptSelect",
        header: "Department",
        size: 150,
        cell: (info) => (
          <Select
            value={info.row.original.department}
            options={DEPT_OPTIONS}
            disabled={disabled}
            onChange={(e) => handleChange(info.row.index, "department", e.target.value)}
          />
        ),
      }),
      helper.display({
        id: "statusSelect",
        header: "Status",
        size: 140,
        cell: (info) => (
          <Select
            value={info.row.original.status}
            options={STATUS_OPTIONS}
            disabled={disabled}
            onChange={(e) => handleChange(info.row.index, "status", e.target.value)}
          />
        ),
      }),
      helper.display({
        id: "prioritySelect",
        header: "Priority",
        size: 140,
        cell: (info) => (
          <Select
            value={info.row.original.priority}
            options={PRIORITY_OPTIONS}
            disabled={disabled}
            placeholder="Select..."
            onChange={(e) => handleChange(info.row.index, "priority", e.target.value)}
          />
        ),
      }),
    ],
    [disabled, handleChange],
  );

  return (
    <>
      <h1>Canvas: Select</h1>
      <p>
        <code>Select</code> renders native <code>&lt;select&gt;</code> elements as DOM overlays,
        positioned by the Taffy layout engine. Like <code>Input</code>, it follows scroll position
        and supports controlled <code>value</code>, <code>onChange</code>, <code>placeholder</code>,
        and <code>disabled</code>.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>disabled:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[false, true].map((v) => (
              <button
                key={String(v)}
                style={disabled === v ? btnActive : btnBase}
                onClick={() => setDisabled(v)}
              >
                {String(v)}
              </button>
            ))}
          </div>
        </div>
        <button style={btnBase} onClick={() => setData(generateData)}>
          Reset Data
        </button>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          Select Grid ({data.length} rows — scroll to see all)
        </h2>
        <Grid
          data={data}
          columns={columns}
          width={710}
          height={400}
          rowHeight={40}
          overflowX="auto"
          overflowY="auto"
        />
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Current Data</h2>
        <pre
          style={{
            background: "#f5f5f5",
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          {JSON.stringify(
            data.map((r) => ({
              name: r.name,
              role: r.role,
              department: r.department,
              status: r.status,
              priority: r.priority,
            })),
            null,
            2,
          )}
        </pre>
      </section>
    </>
  );
}
