import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Input } from "@ohah/react-wasm-table";

type Row = { id: number; name: string; email: string; role: string };
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
  "Alice Kim",
  "Bob Lee",
  "Charlie Park",
  "Diana Choi",
  "Eve Hong",
  "Frank Yoo",
  "Grace Shin",
  "Henry Kang",
  "Iris Moon",
  "Jack Oh",
  "Kate Ryu",
  "Leo Jang",
  "Mia Han",
  "Noah Bae",
  "Olivia Jung",
  "Paul Seo",
  "Quinn Im",
  "Ryan Hwang",
  "Sara Ahn",
  "Tom Song",
];

const ROLES = ["Engineer", "Designer", "PM", "QA", "DevOps"];

function generatePeople(): Row[] {
  return NAMES.map((name, i) => ({
    id: i,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    role: ROLES[i % ROLES.length]!,
  }));
}

export function CanvasInput() {
  const [data, setData] = useState(generatePeople);
  const [disabled, setDisabled] = useState(false);

  const handleChange = useCallback(
    (rowIndex: number, field: keyof Row, value: string) => {
      setData((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)));
    },
    [],
  );

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name (text)", size: 130, padding: [0, 8] }),
      helper.display({
        id: "nameInput",
        header: "Name (input)",
        size: 160,
        cell: (info) => (
          <Input
            value={info.row.original.name}
            placeholder="Enter name..."
            disabled={disabled}
            onChange={(e) => handleChange(info.row.index, "name", e.target.value)}
          />
        ),
      }),
      helper.display({
        id: "emailInput",
        header: "Email",
        size: 220,
        cell: (info) => (
          <Input
            type="email"
            value={info.row.original.email}
            placeholder="email@example.com"
            disabled={disabled}
            onChange={(e) => handleChange(info.row.index, "email", e.target.value)}
          />
        ),
      }),
      helper.display({
        id: "roleInput",
        header: "Role",
        size: 140,
        cell: (info) => (
          <Input
            value={info.row.original.role}
            placeholder="Role..."
            disabled={disabled}
            borderColor="#e5e7eb"
            onChange={(e) => handleChange(info.row.index, "role", e.target.value)}
          />
        ),
      }),
    ],
    [disabled, handleChange],
  );

  return (
    <>
      <h1>Canvas: Input</h1>
      <p>
        <code>Input</code> renders native <code>&lt;input&gt;</code> elements as DOM overlays,
        positioned by the Taffy layout engine. Scroll down to see all {data.length} rows — inputs
        follow scroll position. Supports controlled <code>value</code>, <code>onChange</code>,{" "}
        <code>placeholder</code>, and <code>disabled</code>. Touch-friendly on mobile.
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
        <button style={btnBase} onClick={() => setData(generatePeople)}>
          Reset Data
        </button>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          Editable Grid ({data.length} rows — scroll to see all)
        </h2>
        <Grid data={data} columns={columns} width={670} height={400} rowHeight={40} overflowY="auto" />
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
            data.map((r) => ({ name: r.name, email: r.email, role: r.role })),
            null,
            2,
          )}
        </pre>
      </section>
    </>
  );
}
