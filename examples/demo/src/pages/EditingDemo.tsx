import { Column, Grid, type TableMeta } from "@ohah/react-wasm-table";
import { useCallback, useMemo, useState } from "react";

interface Person {
  name: string;
  age: number;
  department: string;
}

const INITIAL_DATA: Person[] = [
  { name: "Alice", age: 30, department: "Engineering" },
  { name: "Bob", age: 25, department: "Marketing" },
  { name: "Charlie", age: 35, department: "Design" },
  { name: "Diana", age: 28, department: "Engineering" },
  { name: "Eve", age: 32, department: "Marketing" },
];

interface EditLog {
  rowIndex: number;
  columnId: string;
  value: unknown;
  timestamp: number;
}

export function EditingDemo() {
  const [data, setData] = useState<Person[]>(INITIAL_DATA);
  const [editLog, setEditLog] = useState<EditLog[]>([]);
  const [editTrigger, setEditTrigger] = useState<"click" | "dblclick">("dblclick");

  const meta: TableMeta = useMemo(
    () => ({
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        setData((prev) =>
          prev.map((row, i) => (i === rowIndex ? { ...row, [columnId]: value } : row)),
        );
        setEditLog((prev) => [...prev, { rowIndex, columnId, value, timestamp: Date.now() }]);
      },
    }),
    [],
  );

  const clearLog = useCallback(() => setEditLog([]), []);

  return (
    <>
      <h1>Cell Editing — meta.updateData</h1>
      <p>
        {editTrigger === "click" ? "Click" : "Double-click"} a cell to edit. Press{" "}
        <strong>Enter</strong> or click outside to commit. Press <strong>Tab</strong> /{" "}
        <strong>Shift+Tab</strong> to move between cells. Press <strong>Escape</strong> to cancel.
      </p>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <label style={{ fontSize: 14 }}>
          editTrigger:{" "}
          <select
            value={editTrigger}
            onChange={(e) => setEditTrigger(e.target.value as "click" | "dblclick")}
            style={{ padding: "2px 4px" }}
          >
            <option value="dblclick">dblclick (default)</option>
            <option value="click">click</option>
          </select>
        </label>
      </div>

      <Grid
        data={data as Record<string, unknown>[]}
        width={600}
        height={300}
        meta={meta}
        editTrigger={editTrigger}
      >
        <Column id="name" header="Name" width={200} editor="text" />
        <Column id="age" header="Age" width={100} editor="number" />
        <Column id="department" header="Department" width={200} editor="text" />
      </Grid>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: "#f9f9f9",
          borderRadius: 4,
          border: "1px solid #e0e0e0",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Native HTML inputs (for comparison)</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 13 }}>
            Input A: <input type="text" defaultValue="Hello" style={{ padding: "4px 8px" }} />
          </label>
          <label style={{ fontSize: 13 }}>
            Input B: <input type="text" defaultValue="World" style={{ padding: "4px 8px" }} />
          </label>
          <span style={{ fontSize: 12, color: "#999" }}>
            Click A then click B — focus moves immediately, no value lost
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 8px" }}>
            Edit Log ({editLog.length}){" "}
            {editLog.length > 0 && (
              <button type="button" onClick={clearLog} style={{ fontSize: 12, marginLeft: 8 }}>
                Clear
              </button>
            )}
          </h3>
          <div
            style={{
              maxHeight: 200,
              overflow: "auto",
              fontSize: 13,
              fontFamily: "monospace",
              background: "#f5f5f5",
              padding: 8,
              borderRadius: 4,
            }}
          >
            {editLog.length === 0 ? (
              <span style={{ color: "#999" }}>No edits yet</span>
            ) : (
              editLog.map((log) => (
                <div key={log.timestamp}>
                  [{new Date(log.timestamp).toLocaleTimeString()}] row[
                  {log.rowIndex}].
                  {log.columnId} = {JSON.stringify(log.value)}
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 8px" }}>Current Data</h3>
          <pre
            style={{
              maxHeight: 200,
              overflow: "auto",
              fontSize: 12,
              background: "#f5f5f5",
              padding: 8,
              borderRadius: 4,
              margin: 0,
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </>
  );
}
