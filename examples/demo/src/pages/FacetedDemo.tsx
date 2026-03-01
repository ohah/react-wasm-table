import { useMemo } from "react";
import {
  Grid,
  createColumnHelper,
  useGridTable,
  getFacetedRowModel,
  Text,
  Badge,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";

// ── Data ──────────────────────────────────────────────────────────

type Employee = {
  id: number;
  name: string;
  department: string;
  title: string;
  salary: number;
  isActive: boolean;
};

const rawData = generateEmployees(500) as unknown as Employee[];

const helper = createColumnHelper<Employee>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Department",
    size: 140,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("title", { header: "Title", size: 180, padding: [0, 8] }),
  helper.accessor("salary", {
    header: "Salary",
    size: 120,
    align: "right",
    padding: [0, 8],
    cell: (info) => (
      <Text
        value={`$${info.getValue().toLocaleString()}`}
        fontWeight="bold"
        color={info.getValue() > 100000 ? "#2e7d32" : "#333"}
      />
    ),
  }),
  helper.accessor((row) => (row.isActive ? "Active" : "Inactive"), {
    id: "status",
    header: "Status",
    size: 100,
    align: "center",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={info.getValue()}
        color="white"
        backgroundColor={info.getValue() === "Active" ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
];

// ── Styles ────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 12,
  background: "#f9f9f9",
  borderRadius: 6,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  padding: 16,
  background: "#fff",
};

// ── Component ─────────────────────────────────────────────────────

export function FacetedDemo() {
  const table = useGridTable<Employee>({
    data: rawData,
    columns,
    getFacetedRowModel: getFacetedRowModel(),
    state: { sorting: [], columnFilters: [], globalFilter: "" },
  });

  const facetedColumns = ["department", "title", "status", "salary", "name"];

  const facetedData = useMemo(() => {
    return facetedColumns.map((colId) => ({
      colId,
      uniqueValues: table.getFacetedUniqueValues(colId),
      minMax: table.getFacetedMinMaxValues(colId),
    }));
  }, [table]);

  const formatSalary = (n: number) => "$" + n.toLocaleString("en-US");

  return (
    <>
      <h1>Faceted Row Model</h1>
      <p>
        Demonstrates <code>getFacetedRowModel</code> which computes per-column statistics: unique
        value counts and min/max for numeric columns. Useful for building filter UIs (dropdowns,
        range sliders). The canvas grid below shows the raw data.
      </p>

      <div style={sectionStyle}>
        <span style={{ fontSize: 13, color: "#666" }}>
          Dataset: <strong>{rawData.length}</strong> employees across{" "}
          <strong>{table.getFacetedUniqueValues("department").size}</strong> departments
        </span>
      </div>

      {/* Canvas Grid showing the raw data */}
      <div style={{ marginBottom: 20 }}>
        <Grid
          table={table}
          data={rawData as unknown as Record<string, unknown>[]}
          columns={columns}
          width={800}
          height={300}
          overflowY="scroll"
        />
      </div>

      {/* Faceted values per column */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {facetedData.map(({ colId, uniqueValues, minMax }) => (
          <div key={colId} style={cardStyle}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#333" }}>
              Column: <code>{colId}</code>
            </h3>

            {/* Min/Max */}
            {minMax && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 8,
                  background: "#e3f2fd",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                <strong>Range:</strong> {colId === "salary" ? formatSalary(minMax[0]) : minMax[0]}{" "}
                &mdash; {colId === "salary" ? formatSalary(minMax[1]) : minMax[1]}
              </div>
            )}

            {/* Unique values */}
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              <strong>{uniqueValues.size}</strong> unique values
            </div>

            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "4px 8px",
                        borderBottom: "1px solid #eee",
                        color: "#999",
                      }}
                    >
                      Value
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4px 8px",
                        borderBottom: "1px solid #eee",
                        color: "#999",
                      }}
                    >
                      Count
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4px 8px",
                        borderBottom: "1px solid #eee",
                        color: "#999",
                        width: 80,
                      }}
                    >
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...uniqueValues.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 20)
                    .map(([value, count]) => (
                      <tr key={String(value)}>
                        <td style={{ padding: "3px 8px", borderBottom: "1px solid #f5f5f5" }}>
                          {colId === "salary" ? formatSalary(value as number) : String(value)}
                        </td>
                        <td
                          style={{
                            padding: "3px 8px",
                            borderBottom: "1px solid #f5f5f5",
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          {count}
                        </td>
                        <td
                          style={{
                            padding: "3px 8px",
                            borderBottom: "1px solid #f5f5f5",
                            textAlign: "right",
                            color: "#999",
                          }}
                        >
                          {((count / rawData.length) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  {uniqueValues.size > 20 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{ padding: "4px 8px", color: "#999", fontStyle: "italic" }}
                      >
                        ... and {uniqueValues.size - 20} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Code snippet */}
      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {`const table = useGridTable({
  data,
  columns,
  getFacetedRowModel: getFacetedRowModel(),
});

// Per-column unique values (value → count):
const deptValues = table.getFacetedUniqueValues("department");
// Map { "Engineering" => 45, "Product" => 12, ... }

// Per-column min/max (numeric columns only):
const salaryRange = table.getFacetedMinMaxValues("salary");
// [40000, 200000] or undefined for non-numeric

// Use cases:
// - Build filter dropdowns from uniqueValues
// - Build range sliders from min/max
// - Show distribution charts`}
      </pre>
    </>
  );
}
