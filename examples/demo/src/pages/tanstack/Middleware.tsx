import { useState, useMemo, useCallback, useRef } from "react";
import {
  Table,
  useReactTable,
  flexRender,
  getCoreRowModel,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  createColumnHelper,
  type SortingState,
  type EventMiddleware,
  type EventChannel,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

interface LogEntry {
  id: number;
  source: string;
  channel: string;
  detail: string;
}

const MAX_LOG = 80;

function createLoggerMiddleware(
  addLog: (source: string, channel: string, detail: string) => void,
): EventMiddleware {
  return (channel, event, next) => {
    const prevented = event.defaultPrevented ? " (already prevented)" : "";
    addLog("logger", channel, `passing through${prevented}`);
    next();
  };
}

function createBlockerMiddleware(
  blockedChannels: Set<string>,
  addLog: (source: string, channel: string, detail: string) => void,
): EventMiddleware {
  return (channel, event, next) => {
    if (blockedChannels.has(channel)) {
      addLog("blocker", channel, "BLOCKED — next() not called");
      return;
    }
    next();
  };
}

function createTimingMiddleware(
  addLog: (source: string, channel: string, detail: string) => void,
): EventMiddleware {
  return (channel, event, next) => {
    const start = performance.now();
    next();
    const elapsed = (performance.now() - start).toFixed(2);
    addLog("timer", channel, `chain completed in ${elapsed}ms`);
  };
}

const CHANNELS: EventChannel[] = [
  "cellClick",
  "cellDoubleClick",
  "headerClick",
  "cellMouseDown",
  "keyDown",
  "scroll",
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function TanStackMiddleware() {
  const data = useMemo(() => generateSmallData(), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const [enableLogger, setEnableLogger] = useState(true);
  const [enableBlocker, setEnableBlocker] = useState(false);
  const [enableTimer, setEnableTimer] = useState(false);
  const [blockedChannels, setBlockedChannels] = useState<Set<string>>(new Set(["headerClick"]));

  const addLog = useCallback((source: string, channel: string, detail: string) => {
    setLog((prev) => {
      const entry: LogEntry = { id: nextId.current++, source, channel, detail };
      const next = [entry, ...prev];
      return next.length > MAX_LOG ? next.slice(0, MAX_LOG) : next;
    });
  }, []);

  const toggleBlockedChannel = (ch: string) => {
    setBlockedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: "Name",
        size: 180,
        enableSorting: true,
        padding: [0, 8],
      }),
      helper.accessor("dept", {
        header: "Department",
        size: 140,
        enableSorting: true,
        padding: [0, 8],
      }),
      helper.accessor("salary", {
        header: "Salary",
        size: 120,
        enableSorting: true,
        align: "right",
        padding: [0, 8],
      }),
      helper.accessor("score", {
        header: "Score",
        size: 100,
        enableSorting: true,
        align: "right",
        padding: [0, 8],
      }),
    ],
    [],
  );

  const middleware = useMemo(() => {
    const mws: EventMiddleware[] = [];
    if (enableTimer) mws.push(createTimingMiddleware(addLog));
    if (enableLogger) mws.push(createLoggerMiddleware(addLog));
    if (enableBlocker) mws.push(createBlockerMiddleware(blockedChannels, addLog));
    return mws;
  }, [enableLogger, enableBlocker, enableTimer, blockedChannels, addLog]);

  const sourceColors: Record<string, string> = {
    logger: "#4ec9b0",
    blocker: "#f44336",
    timer: "#ce9178",
  };

  const table = useReactTable({
    data: data as SmallRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>Event Middleware</h1>
      <p>
        The <code>eventMiddleware</code> prop accepts an array of middleware functions. Each
        receives <code>(channel, event, next)</code>. Call <code>next()</code> to continue the
        chain, or skip it to block the event entirely (including user callbacks and internal
        handlers).
      </p>

      <div style={{ display: "flex", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
        <Toggle label="Logger MW" checked={enableLogger} onChange={setEnableLogger} />
        <Toggle label="Blocker MW" checked={enableBlocker} onChange={setEnableBlocker} />
        <Toggle label="Timer MW" checked={enableTimer} onChange={setEnableTimer} />
      </div>

      {enableBlocker && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
            Blocked channels (blocker middleware)
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {CHANNELS.map((ch) => (
              <label
                key={ch}
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
              >
                <input
                  type="checkbox"
                  checked={blockedChannels.has(ch)}
                  onChange={() => toggleBlockedChannel(ch)}
                />
                {ch}
              </label>
            ))}
          </div>
        </div>
      )}

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
          marginBottom: 12,
        }}
      >
        {`const middleware: EventMiddleware[] = [\n`}
        {enableTimer && `  // Timing middleware — wraps the chain\n`}
        {enableTimer && `  (channel, event, next) => {\n`}
        {enableTimer && `    const start = performance.now();\n`}
        {enableTimer && `    next();\n`}
        {enableTimer && `    console.log(\`\${channel}: \${performance.now() - start}ms\`);\n`}
        {enableTimer && `  },\n`}
        {enableLogger && `  // Logger middleware — logs and passes through\n`}
        {enableLogger && `  (channel, event, next) => {\n`}
        {enableLogger && `    console.log("event:", channel);\n`}
        {enableLogger && `    next();\n`}
        {enableLogger && `  },\n`}
        {enableBlocker && `  // Blocker middleware — blocks specific channels\n`}
        {enableBlocker && `  (channel, event, next) => {\n`}
        {enableBlocker &&
          `    if (${JSON.stringify([...blockedChannels])}.includes(channel)) return;\n`}
        {enableBlocker && `    next();\n`}
        {enableBlocker && `  },\n`}
        {`];\n\n`}
        {`<Table eventMiddleware={middleware} ...>\n  <Thead>...</Thead>\n  <Tbody>...</Tbody>\n</Table>`}
      </pre>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>TanStack API</h4>
            <Table table={table} width={560} height={480} eventMiddleware={middleware}>
              <Thead>
                {table.getHeaderGroups().map((hg) => (
                  <Tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <Th key={h.id} colSpan={h.colSpan}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </Th>
                    ))}
                  </Tr>
                ))}
              </Thead>
              <Tbody>
                {table.getRowModel().rows.map((row) => (
                  <Tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </section>
        </div>

        <div
          style={{
            flex: 1,
            maxHeight: 480,
            overflowY: "auto",
            background: "#1e1e1e",
            color: "#d4d4d4",
            borderRadius: 4,
            padding: 8,
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
              color: "#888",
            }}
          >
            <span>Middleware Log</span>
            <button
              onClick={() => setLog([])}
              style={{
                background: "none",
                border: "1px solid #555",
                color: "#aaa",
                borderRadius: 3,
                padding: "1px 6px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Clear
            </button>
          </div>
          {log.length === 0 && (
            <div style={{ color: "#666" }}>
              Click cells or headers to see middleware in action...
            </div>
          )}
          {log.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 2 }}>
              <span style={{ color: sourceColors[entry.source] ?? "#dcdcaa" }}>
                [{entry.source}]
              </span>{" "}
              <span style={{ color: "#569cd6" }}>{entry.channel}</span>{" "}
              <span style={{ color: "#9cdcfe" }}>{entry.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
        <strong>Active middleware ({middleware.length}):</strong>{" "}
        {[enableTimer && "Timer", enableLogger && "Logger", enableBlocker && "Blocker"]
          .filter(Boolean)
          .join(" → ") || "none"}
        {enableBlocker && blockedChannels.size > 0 && (
          <span style={{ color: "#f44336" }}> | Blocking: {[...blockedChannels].join(", ")}</span>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
        <strong>Tip:</strong> Enable the blocker middleware and block <code>headerClick</code> —
        sorting will stop working because the middleware blocks the event before it reaches the
        internal sort handler.
      </div>
    </>
  );
}
