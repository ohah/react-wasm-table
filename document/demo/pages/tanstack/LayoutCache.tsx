import { useState, useMemo, useRef, useCallback } from "react";
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
  type WasmTableEngine,
  type CssFlexDirection,
} from "@ohah/react-wasm-table";
import { generateEmployees } from "../../data";

type SmallRow = {
  name: string;
  department: string;
  salary: number;
  performanceScore: number | null;
};
const helper = createColumnHelper<SmallRow>();

interface BenchResult {
  id: number;
  label: string;
  elapsed: string;
}

function makeViewport(scrollTop: number) {
  return { width: 560, height: 400, rowHeight: 36, headerHeight: 40, scrollTop, lineHeight: 20 };
}

function makeColumns() {
  return [
    {
      width: 180,
      flexGrow: 0,
      flexShrink: 0,
      align: "left",
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    {
      width: 140,
      flexGrow: 0,
      flexShrink: 0,
      align: "left",
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    {
      width: 120,
      flexGrow: 0,
      flexShrink: 0,
      align: "right",
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    {
      width: 100,
      flexGrow: 0,
      flexShrink: 0,
      align: "right",
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
  ];
}

function makeContainer(flexDirection: string, gap: number) {
  return { flexDirection, gap };
}

const columns = [
  helper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
  helper.accessor("department", {
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
  helper.accessor("performanceScore", {
    header: "Score",
    size: 100,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

export function TanStackLayoutCache() {
  const data = useMemo(
    () =>
      generateEmployees(10_000).map((r) => ({
        name: r.name,
        department: r.department,
        salary: r.salary,
        performanceScore: r.performanceScore,
      })),
    [],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const engineRef = useRef<WasmTableEngine | null>(null);
  const [results, setResults] = useState<BenchResult[]>([]);
  const nextId = useRef(0);
  const [flexDirection, setFlexDirection] = useState<CssFlexDirection>("row");
  const [gap, setGap] = useState(0);

  const addResult = useCallback((label: string, elapsed: string) => {
    setResults((prev) => {
      const entry: BenchResult = { id: nextId.current++, label, elapsed };
      return [entry, ...prev].slice(0, 30);
    });
  }, []);

  const handleInvalidate = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      addResult("invalidateLayout()", "engine not ready");
      return;
    }
    engine.invalidateLayout();
    addResult("invalidateLayout()", "cache cleared — next frame will recompute");
  }, [addResult]);

  const handleBenchmark = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const iterations = 100;

    engine.updateViewportColumnar(
      0,
      makeViewport(0),
      makeColumns(),
      makeContainer(flexDirection, gap),
    );

    const start1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const scrollTop = (i % 50) * 36;
      engine.updateViewportColumnar(
        scrollTop,
        makeViewport(scrollTop),
        makeColumns(),
        makeContainer(flexDirection, gap),
      );
    }
    const cached = performance.now() - start1;

    engine.invalidateLayout();
    const start2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      engine.invalidateLayout();
      const scrollTop = (i % 50) * 36;
      engine.updateViewportColumnar(
        scrollTop,
        makeViewport(scrollTop),
        makeColumns(),
        makeContainer(flexDirection, gap),
      );
    }
    const uncached = performance.now() - start2;

    engine.updateViewportColumnar(
      0,
      makeViewport(0),
      makeColumns(),
      makeContainer(flexDirection, gap),
    );

    addResult(
      `${iterations}x updateViewport`,
      `cached: ${cached.toFixed(1)}ms | uncached: ${uncached.toFixed(1)}ms | speedup: ${(uncached / cached).toFixed(1)}x`,
    );
  }, [addResult, flexDirection, gap]);

  const table = useReactTable({
    data: data as SmallRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <h1>Layout Cache</h1>
      <p>
        The Rust <code>LayoutEngine</code> caches Taffy layout results in a 2-slot LRU cache (one
        for header height, one for row height). Scrolling reuses cached column positions instead of
        recomputing Taffy layout every frame.
      </p>
      <p>
        Use <code>engineRef</code> to access <code>invalidateLayout()</code> — forces cache clear so
        the next frame recomputes from scratch. Changing layout props (flex-direction, gap, etc.)
        automatically causes a cache miss.
      </p>

      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleInvalidate}
          style={{
            padding: "6px 16px",
            background: "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          invalidateLayout()
        </button>
        <button
          onClick={handleBenchmark}
          style={{
            padding: "6px 16px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Benchmark (100 iterations)
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--demo-muted)" }}>flex-direction:</span>
          {(["row", "column"] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setFlexDirection(dir)}
              style={{
                padding: "3px 10px",
                border: "1px solid var(--demo-border-2)",
                borderRadius: 4,
                background: flexDirection === dir ? "#1976d2" : "#fff",
                color: flexDirection === dir ? "#fff" : "#333",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {dir}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--demo-muted)" }}>gap:</span>
          {[0, 4, 8, 16].map((g) => (
            <button
              key={g}
              onClick={() => setGap(g)}
              style={{
                padding: "3px 10px",
                border: "1px solid var(--demo-border-2)",
                borderRadius: 4,
                background: gap === g ? "#1976d2" : "#fff",
                color: gap === g ? "#fff" : "#333",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {g}px
            </button>
          ))}
        </div>
      </div>

      <pre
        style={{
          background: "var(--demo-code-bg)",
          color: "var(--demo-code-fg)",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
          marginBottom: 12,
        }}
      >
        {`const engineRef = useRef<WasmTableEngine | null>(null);\n\n`}
        {`// Clear layout cache (forces Taffy recomputation on next frame)\n`}
        {`engineRef.current?.invalidateLayout();\n\n`}
        {`<Table engineRef={engineRef} flexDirection="${flexDirection}" gap={${gap}} ...>\n  <Thead>...</Thead>\n  <Tbody>...</Tbody>\n</Table>`}
      </pre>

      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <section style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>TanStack API</h4>
            <Table
              table={table}
              width={560}
              height={400}
              engineRef={engineRef}
              flexDirection={flexDirection}
              gap={gap}
            >
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
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--demo-code-block-bg)",
            color: "var(--demo-code-block-fg)",
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
              color: "var(--demo-muted-4)",
            }}
          >
            <span>Cache Log</span>
            <button
              onClick={() => setResults([])}
              style={{
                background: "none",
                border: "1px solid var(--demo-border-2)",
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
          {results.length === 0 && (
            <div style={{ color: "var(--demo-muted)" }}>
              Click "Benchmark" to compare cached vs uncached performance, or "invalidateLayout()"
              to manually clear the cache.
            </div>
          )}
          {results.map((r) => (
            <div key={r.id} style={{ marginBottom: 4 }}>
              <span style={{ color: "#dcdcaa" }}>{r.label}</span>{" "}
              <span style={{ color: "#9cdcfe" }}>{r.elapsed}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: "var(--demo-muted-2)" }}>
        <strong>How the cache works:</strong>
        <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
          <li>2-slot LRU — one for header height, one for row height (both hit on every frame)</li>
          <li>Key = hash of all column + container + viewport_width + row_height + line_height</li>
          <li>Cache hit = skip Taffy tree build + compute_layout entirely</li>
          <li>
            Scrolling only changes scroll_top (not a cache key), so layout is always cached during
            scroll
          </li>
          <li>Changing flex-direction or gap = automatic cache miss = fresh Taffy computation</li>
        </ul>
      </div>
    </>
  );
}
