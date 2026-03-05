import {
  createColumnHelper,
  editorStyle,
  flexRender,
  getCoreRowModel,
  Table,
  type CellEditRenderProps,
  type TableMeta,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useReactTable,
} from "@ohah/react-wasm-table";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../../useDarkMode";

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
  { name: "Frank", age: 41, department: "Sales" },
  { name: "Grace", age: 27, department: "Design" },
  { name: "Henry", age: 33, department: "Engineering" },
  { name: "Ivy", age: 29, department: "Marketing" },
  { name: "Jack", age: 38, department: "Sales" },
  { name: "Karen", age: 26, department: "Design" },
  { name: "Leo", age: 44, department: "Engineering" },
  { name: "Mia", age: 31, department: "Marketing" },
  { name: "Noah", age: 36, department: "Sales" },
  { name: "Olivia", age: 24, department: "Engineering" },
];

/** Custom editCell editor: a styled text input with a colored border. */
function CustomNameEditor({
  value,
  onCommit,
  onCancel,
  onCommitAndNavigate,
  layout,
  initialChar,
}: CellEditRenderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);
  const initialValue = initialChar != null ? initialChar : value == null ? "" : String(value);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (initialChar == null) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
  }, [initialChar]);

  const getValue = () => inputRef.current?.value ?? "";
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      committedRef.current = true;
      onCommit(getValue());
    } else if (e.key === "Escape") {
      committedRef.current = true;
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      committedRef.current = true;
      onCommitAndNavigate(getValue(), e.shiftKey ? "prev" : "next");
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialValue}
      style={{ ...editorStyle(layout), borderColor: "#e91e63" }}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (!committedRef.current) onCommit(getValue());
      }}
    />
  );
}

const helper = createColumnHelper<Person>();

interface EditLog {
  rowIndex: number;
  columnId: string;
  value: unknown;
  timestamp: number;
}

export function TanStackEditing() {
  const isDark = useDarkMode();
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

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name (editCell)",
        size: 200,
        padding: [0, 8],
        editCell: (props) => <CustomNameEditor {...props} />,
      }),
      helper.accessor("age", {
        header: "Age",
        size: 100,
        padding: [0, 8],
        align: "right",
        editor: "number",
      }),
      helper.accessor("department", {
        header: "Department (select)",
        size: 200,
        padding: [0, 8],
        editor: "select",
        editorOptions: {
          options: [
            { label: "Engineering", value: "Engineering" },
            { label: "Marketing", value: "Marketing" },
            { label: "Design", value: "Design" },
            { label: "Sales", value: "Sales" },
          ],
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: data as Person[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const clearLog = useCallback(() => setEditLog([]), []);

  return (
    <>
      <h1>Cell Editing — TanStack API</h1>
      <p>
        {editTrigger === "click" ? "Click" : "Double-click"} a cell to edit. Press{" "}
        <strong>Enter</strong> or click outside to commit. Press <strong>Tab</strong> /{" "}
        <strong>Shift+Tab</strong> to move between cells. Press <strong>Escape</strong> to cancel.
      </p>

      <div
        style={{
          marginBottom: 12,
          padding: 12,
          background: "#fce4ec",
          borderRadius: 4,
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <strong>Features to test:</strong>
        <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
          <li>
            <strong>editCell render prop</strong> — Name column uses a custom React editor (pink
            border) via <code>editCell</code>
          </li>
          <li>
            <strong>Type-to-edit</strong> — Select a cell, then type any character to start editing
            (initialChar is passed to editor)
          </li>
          <li>
            <strong>Scroll cancel</strong> — Start editing, then scroll — editor auto-cancels
          </li>
          <li>
            <strong>Select editor</strong> — Department column uses built-in{" "}
            <code>editor=&quot;select&quot;</code> with <code>editorOptions</code>
          </li>
          <li>
            <strong>Mixed editors</strong> — Custom editCell (Name) + built-in number (Age) +
            built-in select (Department) in one table
          </li>
        </ul>
      </div>

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

      <section style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 14, marginBottom: 6 }}>TanStack API</h4>
        <Table
          table={table}
          width={600}
          height={300}
          theme={isDark ? DARK_THEME : LIGHT_THEME}
          meta={meta}
          editTrigger={editTrigger}
        >
          <Thead>
            {table.getHeaderGroups().map((hg) => (
              <Tr key={hg.id}>
                {hg.headers.map((h) => (
                  <Th key={h.id} colSpan={h.colSpan}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </section>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: "var(--demo-panel-bg)",
          borderRadius: 4,
          border: "1px solid var(--demo-border)",
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
          <span style={{ fontSize: 12, color: "var(--demo-muted-5)" }}>
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
              background: "var(--demo-code-bg)",
              color: "var(--demo-code-fg)",
              padding: 8,
              borderRadius: 4,
            }}
          >
            {editLog.length === 0 ? (
              <span style={{ color: "var(--demo-muted-5)" }}>No edits yet</span>
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
              background: "var(--demo-code-bg)",
              color: "var(--demo-code-fg)",
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
