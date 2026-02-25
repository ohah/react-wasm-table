import { useMemo } from "react";
import { Grid, type ColumnDef } from "@ohah/react-wasm-table";
import { generateEmployees } from "../data";

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

export function Home() {
  const data = useMemo(() => generateEmployees(50_000), []);

  return (
    <>
      <h1>react-wasm-table Demo</h1>
      <p>Rendering {data.length.toLocaleString()} rows with Canvas + WASM layout</p>
      <Grid data={data} width={1280} height={600} columns={columns} />
    </>
  );
}
