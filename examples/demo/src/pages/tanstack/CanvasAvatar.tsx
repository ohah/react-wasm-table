import { useMemo, useState } from "react";
import {
  Table,
  useReactTable,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  createColumnHelper,
  Avatar,
  Text,
} from "@ohah/react-wasm-table";
import { useContainerSize } from "../../useContainerSize";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../../useDarkMode";

type Row = { id: number; name: string; avatar: string; role: string };

const helper = createColumnHelper<Row>();

const USERS: Row[] = [
  { id: 1, name: "Alice Johnson", avatar: "https://i.pravatar.cc/80?u=alice", role: "Engineer" },
  { id: 2, name: "Bob Smith", avatar: "https://i.pravatar.cc/80?u=bob", role: "Designer" },
  { id: 3, name: "Charlie Brown", avatar: "https://i.pravatar.cc/80?u=charlie", role: "PM" },
  { id: 4, name: "Diana Prince", avatar: "https://i.pravatar.cc/80?u=diana", role: "Engineer" },
  { id: 5, name: "Eve", avatar: "", role: "QA" },
  { id: 6, name: "Frank Castle", avatar: "https://i.pravatar.cc/80?u=frank", role: "DevOps" },
  { id: 7, name: "Grace Hopper", avatar: "", role: "Engineer" },
  { id: 8, name: "Hank Pym", avatar: "https://i.pravatar.cc/80?u=hank", role: "Scientist" },
];

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid var(--demo-border-2)",
  borderRadius: 4,
  background: "var(--demo-card-bg)",
  color: "var(--demo-panel-fg)",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

export function TanStackCanvasAvatar() {
  const isDark = useDarkMode();
  const [size, setSize] = useState(32);
  const { ref, width } = useContainerSize();

  const columns = useMemo(
    () => [
      helper.accessor("avatar", {
        header: "Avatar",
        size: 60,
        padding: [4, 8],
        cell: (info) => <Avatar src={info.getValue()} name={info.row.original.name} size={size} />,
      }),
      helper.accessor("name", { header: "Name", size: 150, padding: [0, 8] }),
      helper.accessor("role", { header: "Role", size: 100, padding: [0, 8] }),
    ],
    [size],
  );

  const table = useReactTable({ data: USERS, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <>
      <h1>TanStack: Canvas Avatar</h1>
      <p>
        <code>Avatar</code> via TanStack <code>useReactTable</code> + <code>Table</code> API.
        Circular image with initials fallback.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>size:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[24, 32, 40].map((s) => (
              <button key={s} style={size === s ? btnActive : btnBase} onClick={() => setSize(s)}>
                {s}px
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={ref}>
        <Table
          table={table}
          width={Math.min(width || 400, 500)}
          height={360}
          rowHeight={48}
          theme={isDark ? DARK_THEME : LIGHT_THEME}
        />
      </div>
    </>
  );
}
