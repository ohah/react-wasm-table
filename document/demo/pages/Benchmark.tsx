import { useState, useRef, useCallback, useEffect } from "react";
import { Grid, createColumnHelper, Text, Badge } from "@ohah/react-wasm-table";
import {
  createColumnHelper as createTanStackColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown } from "lucide-react";
import { Button } from "../../src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "../../src/components/ui/dropdown-menu";
import { generateEmployees } from "../data";
import { useContainerSize } from "../useContainerSize";

type Employee = {
  id: number;
  name: string;
  email: string;
  department: string;
  title: string;
  salary: number;
  startDate: string;
  isActive: boolean;
  performanceScore: number | null;
  teamSize: number;
};

const ROW_HEIGHT = 36;
const ROW_COUNT_OPTIONS = [
  { value: 1_000, label: "1K" },
  { value: 5_000, label: "5K" },
  { value: 10_000, label: "10K" },
  { value: 50_000, label: "50K" },
  { value: 100_000, label: "100K" },
  { value: 500_000, label: "500K" },
  { value: 1_000_000, label: "1M" },
] as const;

const BENCH_SORTING: SortingState = [{ id: "salary", desc: true }];

// ── react-wasm-table columns ──
const wasmHelper = createColumnHelper<Employee>();
const wasmColumns = [
  wasmHelper.accessor("id", { header: "ID", size: 70, align: "right", padding: [0, 8] }),
  wasmHelper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  wasmHelper.accessor("email", { header: "Email", size: 260, padding: [0, 8] }),
  wasmHelper.accessor("department", {
    header: "Dept",
    size: 130,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  wasmHelper.accessor("title", { header: "Title", size: 180, padding: [0, 8] }),
  wasmHelper.accessor("salary", {
    header: "Salary",
    size: 110,
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
  wasmHelper.accessor("startDate", { header: "Start", size: 110, padding: [0, 8] }),
  wasmHelper.accessor("isActive", {
    header: "Active",
    size: 80,
    align: "center",
    padding: [0, 8],
    cell: (info) => (
      <Badge
        value={info.getValue() ? "Yes" : "No"}
        color="white"
        backgroundColor={info.getValue() ? "#4caf50" : "#9e9e9e"}
        borderRadius={4}
      />
    ),
  }),
  wasmHelper.accessor("performanceScore", {
    header: "Score",
    size: 80,
    align: "right",
    padding: [0, 8],
    cell: (info) => {
      const val = info.getValue();
      if (val == null) return <Text value="—" color="#999" />;
      return (
        <Text
          value={String(val)}
          fontWeight="bold"
          color={val >= 80 ? "#2e7d32" : val >= 60 ? "#ed6c02" : "#d32f2f"}
        />
      );
    },
  }),
  wasmHelper.accessor("teamSize", { header: "Team", size: 80, align: "right", padding: [0, 8] }),
];

// ── @tanstack/react-table columns ──
const tsHelper = createTanStackColumnHelper<Employee>();
const tsColumns = [
  tsHelper.accessor("id", { header: "ID", cell: (c) => c.getValue(), size: 70 }),
  tsHelper.accessor("name", { header: "Name", cell: (c) => c.getValue(), size: 180 }),
  tsHelper.accessor("email", { header: "Email", cell: (c) => c.getValue(), size: 260 }),
  tsHelper.accessor("department", { header: "Dept", cell: (c) => c.getValue(), size: 130 }),
  tsHelper.accessor("title", { header: "Title", cell: (c) => c.getValue(), size: 180 }),
  tsHelper.accessor("salary", {
    header: "Salary",
    cell: (c) => `$${Number(c.getValue()).toLocaleString()}`,
    size: 110,
  }),
  tsHelper.accessor("startDate", { header: "Start", cell: (c) => c.getValue(), size: 110 }),
  tsHelper.accessor("isActive", {
    header: "Active",
    cell: (c) => (c.getValue() ? "Yes" : "No"),
    size: 80,
  }),
  tsHelper.accessor("performanceScore", {
    header: "Score",
    cell: (c) => c.getValue() ?? "—",
    size: 80,
  }),
  tsHelper.accessor("teamSize", { header: "Team", cell: (c) => c.getValue(), size: 80 }),
];
const tsTotalWidth = tsColumns.reduce((s, c) => s + ((c.size as number) || 100), 0);

type BenchResult = {
  rowCount: number;
  dataGenMs: number;
  wasmMs: number | null;
  tanStackMs: number | null;
};

type Phase = "idle" | "generating" | "measure-wasm" | "measure-tanstack" | "done";

export function Benchmark() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<Employee[] | null>(null);
  const [results, setResults] = useState<BenchResult[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [enableWasm, setEnableWasm] = useState(true);
  const [enableTanStack, setEnableTanStack] = useState(true);
  const [selectedCount, setSelectedCount] = useState(10_000);
  const { ref: containerRef, size } = useContainerSize(400);

  const bench = useRef({
    count: 0,
    dataGenMs: 0,
    wasmMs: null as number | null,
    tanStackMs: null as number | null,
    startTime: 0,
    timeout: 0,
    enableWasm: true,
    enableTanStack: true,
  });

  const isRunning = phase !== "idle" && phase !== "done";
  const disabled = isRunning || queue.length > 0;
  const tableWidth = size.width > 0 ? size.width : 800;
  const tableHeight = 400;
  const autoRunDone = useRef(false);

  const run = useCallback(
    (count: number) => {
      bench.current.enableWasm = enableWasm;
      bench.current.enableTanStack = enableTanStack;
      bench.current.count = count;
      bench.current.wasmMs = null;
      bench.current.tanStackMs = null;
      setPhase("generating");
      setData(null);

      const firstPhase: Phase = enableWasm
        ? "measure-wasm"
        : enableTanStack
          ? "measure-tanstack"
          : "done";

      bench.current.timeout = window.setTimeout(() => {
        const t0 = performance.now();
        const generated = generateEmployees(count) as Employee[];
        bench.current.dataGenMs = Math.round(performance.now() - t0);
        bench.current.startTime = performance.now();
        setData(generated);
        setPhase(firstPhase);
      }, 50);
    },
    [enableWasm, enableTanStack],
  );

  const finishRun = useCallback(() => {
    const { count, dataGenMs, wasmMs, tanStackMs } = bench.current;
    setResults((prev) => [...prev, { rowCount: count, dataGenMs, wasmMs, tanStackMs }]);
    setPhase("done");
  }, []);

  const onWasmDone = useCallback(
    (ms: number) => {
      bench.current.wasmMs = ms;
      if (bench.current.enableTanStack) {
        bench.current.timeout = window.setTimeout(() => {
          bench.current.startTime = performance.now();
          setPhase("measure-tanstack");
        }, 200);
      } else {
        finishRun();
      }
    },
    [finishRun],
  );

  const onTanStackDone = useCallback(
    (ms: number) => {
      bench.current.tanStackMs = ms;
      finishRun();
    },
    [finishRun],
  );

  // Auto-run on first mount: PC → 500K, Mobile → 10K
  useEffect(() => {
    if (autoRunDone.current) return;
    autoRunDone.current = true;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const count = isMobile ? 10_000 : 100_000;
    setSelectedCount(count);
    run(count);
  }, [run]);

  useEffect(() => {
    if (queue.length === 0) return;
    if (isRunning) return;
    const next = queue[0];
    if (next == null) return;
    const id = window.setTimeout(() => {
      setQueue((q) => q.slice(1));
      run(next);
    }, 150);
    return () => clearTimeout(id);
  }, [queue, isRunning, run]);

  const runAll = () => {
    clearTimeout(bench.current.timeout);
    setResults([]);
    setData(null);
    setPhase("idle");
    setQueue(ROW_COUNT_OPTIONS.map((o) => o.value));
  };

  const clear = () => {
    clearTimeout(bench.current.timeout);
    setQueue([]);
    setResults([]);
    setData(null);
    setPhase("idle");
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled} className="min-w-[90px] justify-between">
              {ROW_COUNT_OPTIONS.find((o) => o.value === selectedCount)?.label ?? selectedCount}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ROW_COUNT_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.value} onClick={() => setSelectedCount(opt.value)}>
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => run(selectedCount)} disabled={disabled}>
          Run
        </Button>
        <Button variant="success" onClick={runAll} disabled={disabled}>
          Run All
        </Button>
        {results.length > 0 && (
          <Button variant="ghost" onClick={clear} disabled={isRunning}>
            Clear
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={isRunning}
              className="min-w-[140px] justify-between"
            >
              Libraries ({[enableWasm, enableTanStack].filter(Boolean).length}/2)
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Libraries</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={enableWasm}
              onCheckedChange={(v: boolean | "indeterminate") => setEnableWasm(v === true)}
            >
              react-wasm-table
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={enableTanStack}
              onCheckedChange={(v: boolean | "indeterminate") => setEnableTanStack(v === true)}
            >
              @tanstack/react-table
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {phase === "generating" && (
        <PhaseIndicator
          variant="tanstack"
          text={`Generating ${bench.current.count.toLocaleString()} rows…`}
        />
      )}
      {phase === "measure-wasm" && (
        <PhaseIndicator variant="wasm" text="Measuring react-wasm-table render…" />
      )}
      {phase === "measure-tanstack" && (
        <PhaseIndicator variant="tanstack" text="Measuring @tanstack/react-table render…" />
      )}
      {queue.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--demo-muted-4)", marginBottom: 8 }}>
          Remaining: {queue.map((c) => (c >= 1000 ? `${c / 1000}K` : String(c))).join(" → ")}
        </div>
      )}

      {results.length > 0 && <ResultsPanel results={results} />}

      <div ref={containerRef} style={{ width: "100%" }}>
        {phase === "measure-wasm" && data && size.width > 0 && (
          <MeasureWasmGrid
            data={data}
            width={tableWidth}
            height={tableHeight}
            startTime={bench.current.startTime}
            onComplete={onWasmDone}
          />
        )}
        {phase === "measure-tanstack" && data && size.width > 0 && (
          <MeasureTanStackGrid
            data={data}
            width={tableWidth}
            height={tableHeight}
            startTime={bench.current.startTime}
            onComplete={onTanStackDone}
          />
        )}
        {phase === "done" && data && size.width > 0 && (
          <InteractiveBench
            data={data}
            width={tableWidth}
            height={tableHeight}
            enableWasm={bench.current.enableWasm}
            enableTanStack={bench.current.enableTanStack}
          />
        )}
      </div>
    </>
  );
}

// ── Helpers ──

function PhaseIndicator({
  variant,
  text,
}: {
  variant: "info" | "wasm" | "tanstack";
  text: string;
}) {
  return (
    <div
      style={{
        padding: "10px 16px",
        backgroundColor: `var(--phase-${variant}-bg)`,
        color: `var(--phase-${variant}-text)`,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

function ResultsPanel({ results }: { results: BenchResult[] }) {
  const allMs = results
    .flatMap((r) => [r.wasmMs, r.tanStackMs])
    .filter((v): v is number => v != null);
  const maxMs = allMs.length > 0 ? Math.max(...allMs) : 1;
  const hasWasm = results.some((r) => r.wasmMs != null);
  const hasTs = results.some((r) => r.tanStackMs != null);

  return (
    <div style={{ marginBottom: 24 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--demo-border)" }}>
            <th style={thStyle}>Rows</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Data Gen</th>
            {hasWasm && <th style={{ ...thStyle, textAlign: "right" }}>react-wasm-table</th>}
            {hasTs && <th style={{ ...thStyle, textAlign: "right" }}>@tanstack/react-table</th>}
            {hasWasm && hasTs && <th style={{ ...thStyle, textAlign: "right" }}>Speedup</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const speedup =
              r.wasmMs != null && r.wasmMs > 0 && r.tanStackMs != null
                ? (r.tanStackMs / r.wasmMs).toFixed(1)
                : "—";
            return (
              <tr key={i} style={{ borderBottom: "1px solid var(--demo-border)" }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{r.rowCount.toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "var(--demo-muted-4)" }}>
                  {r.dataGenMs}ms
                </td>
                {hasWasm && (
                  <td style={{ ...tdStyle, textAlign: "right", color: "#2e7d32", fontWeight: 700 }}>
                    {r.wasmMs != null ? `${r.wasmMs}ms` : "—"}
                  </td>
                )}
                {hasTs && (
                  <td style={{ ...tdStyle, textAlign: "right", color: "#e65100", fontWeight: 700 }}>
                    {r.tanStackMs != null ? `${r.tanStackMs}ms` : "—"}
                  </td>
                )}
                {hasWasm && hasTs && (
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{speedup}x</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {results.map((r, i) => (
          <div key={i}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              {r.rowCount.toLocaleString()} rows
            </div>
            {r.wasmMs != null && (
              <Bar label="react-wasm-table" ms={r.wasmMs} maxMs={maxMs} color="#2e7d32" />
            )}
            {r.tanStackMs != null && (
              <Bar label="@tanstack/react-table" ms={r.tanStackMs} maxMs={maxMs} color="#e65100" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: 13,
  backgroundColor: "var(--demo-code-bg)",
  color: "var(--demo-code-fg)",
};
const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  backgroundColor: "var(--demo-panel-bg)",
  color: "var(--demo-panel-fg)",
};

function Bar({
  label,
  ms,
  maxMs,
  color,
}: {
  label: string;
  ms: number;
  maxMs: number;
  color: string;
}) {
  const pct = maxMs > 0 ? (ms / maxMs) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
      <span
        style={{
          width: 160,
          fontSize: 12,
          textAlign: "right",
          flexShrink: 0,
          color: "var(--demo-muted-2)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          backgroundColor: "#e8e8e8",
          borderRadius: 4,
          height: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(pct, 1)}%`,
            backgroundColor: color,
            borderRadius: 4,
            height: "100%",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ width: 70, fontSize: 12, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>
        {ms}ms
      </span>
    </div>
  );
}

// ── Render-only measurement ──

function MeasureWasmGrid({
  data,
  width,
  height,
  startTime,
  onComplete,
}: {
  data: Employee[];
  width: number;
  height: number;
  startTime: number;
  onComplete: (ms: number) => void;
}) {
  useEffect(() => {
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        onComplete(Math.round(performance.now() - startTime));
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [startTime, onComplete]);

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden", height }}>
      <Grid
        data={data as Record<string, unknown>[]}
        width={width}
        height={height}
        columns={wasmColumns}
        overflowY="scroll"
        overflowX="scroll"
      />
    </div>
  );
}

function MeasureTanStackGrid({
  data,
  width,
  height,
  startTime,
  onComplete,
}: {
  data: Employee[];
  width: number;
  height: number;
  startTime: number;
  onComplete: (ms: number) => void;
}) {
  useEffect(() => {
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        onComplete(Math.round(performance.now() - startTime));
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [startTime, onComplete]);

  return <TanStackVirtualTable data={data} width={width} height={height} />;
}

// ── Interactive bench (sort / filter with timing) ──

type MeasurePhase = "idle" | "wasm" | "ts";

function InteractiveBench({
  data,
  width,
  height,
  enableWasm,
  enableTanStack,
}: {
  data: Employee[];
  width: number;
  height: number;
  enableWasm: boolean;
  enableTanStack: boolean;
}) {
  const [wasmSorting, setWasmSorting] = useState<SortingState>([]);
  const [tsSorting, setTsSorting] = useState<SortingState>([]);
  const [wasmFilter, setWasmFilter] = useState("");
  const [tsFilter, setTsFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [sortPhase, setSortPhase] = useState<MeasurePhase>("idle");
  const [filterPhase, setFilterPhase] = useState<MeasurePhase>("idle");
  const [sortTimes, setSortTimes] = useState<{ wasm: number | null; ts: number | null }>({
    wasm: null,
    ts: null,
  });
  const [filterTimes, setFilterTimes] = useState<{ wasm: number | null; ts: number | null }>({
    wasm: null,
    ts: null,
  });

  const t0 = useRef(0);
  const searchRef = useRef("");
  const isMeasuring = sortPhase !== "idle" || filterPhase !== "idle";

  const handleSort = () => {
    setSortTimes({ wasm: null, ts: null });
    setWasmSorting([]);
    setTsSorting([]);
    setTimeout(() => {
      if (enableWasm) {
        t0.current = performance.now();
        setWasmSorting(BENCH_SORTING);
        setSortPhase("wasm");
      } else if (enableTanStack) {
        t0.current = performance.now();
        setTsSorting(BENCH_SORTING);
        setSortPhase("ts");
      }
    }, 100);
  };

  const handleFilter = () => {
    const value = searchInput.trim();
    if (!value) return;
    searchRef.current = value;
    setFilterTimes({ wasm: null, ts: null });
    setWasmFilter("");
    setTsFilter("");
    setTimeout(() => {
      if (enableWasm) {
        t0.current = performance.now();
        setWasmFilter(searchRef.current);
        setFilterPhase("wasm");
      } else if (enableTanStack) {
        t0.current = performance.now();
        setTsFilter(searchRef.current);
        setFilterPhase("ts");
      }
    }, 100);
  };

  const handleReset = () => {
    setWasmSorting([]);
    setTsSorting([]);
    setWasmFilter("");
    setTsFilter("");
    setSearchInput("");
    setSortTimes({ wasm: null, ts: null });
    setFilterTimes({ wasm: null, ts: null });
  };

  // Sort measurement
  useEffect(() => {
    if (sortPhase === "idle") return;
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        const ms = Math.round(performance.now() - t0.current);
        if (sortPhase === "wasm") {
          setSortTimes((prev) => ({ ...prev, wasm: ms }));
          if (enableTanStack) {
            setTimeout(() => {
              t0.current = performance.now();
              setTsSorting(BENCH_SORTING);
              setSortPhase("ts");
            }, 100);
          } else {
            setSortPhase("idle");
          }
        } else if (sortPhase === "ts") {
          setSortTimes((prev) => ({ ...prev, ts: ms }));
          setSortPhase("idle");
        }
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [sortPhase, enableTanStack]);

  // Filter measurement
  useEffect(() => {
    if (filterPhase === "idle") return;
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        const ms = Math.round(performance.now() - t0.current);
        if (filterPhase === "wasm") {
          setFilterTimes((prev) => ({ ...prev, wasm: ms }));
          if (enableTanStack) {
            setTimeout(() => {
              t0.current = performance.now();
              setTsFilter(searchRef.current);
              setFilterPhase("ts");
            }, 100);
          } else {
            setFilterPhase("idle");
          }
        } else if (filterPhase === "ts") {
          setFilterTimes((prev) => ({ ...prev, ts: ms }));
          setFilterPhase("idle");
        }
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [filterPhase, enableTanStack]);

  const halfWidth = Math.floor(width / 2) - 12;
  const showBoth = enableWasm && enableTanStack;
  const cols = showBoth ? 2 : 1;
  const w = showBoth ? halfWidth : width;

  return (
    <div>
      {/* Sort / Filter controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Button onClick={handleSort} disabled={isMeasuring} size="sm">
          Sort by Salary
        </Button>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleFilter();
          }}
          placeholder="Search… (e.g. Engineering)"
          disabled={isMeasuring}
          style={{
            padding: "6px 10px",
            fontSize: 13,
            border: "1px solid var(--demo-border-2)",
            borderRadius: 6,
            width: 200,
            backgroundColor: "var(--demo-dropdown-bg)",
            color: "var(--demo-dropdown-fg)",
          }}
        />
        <Button onClick={handleFilter} disabled={isMeasuring || !searchInput.trim()} size="sm">
          Search
        </Button>
        <Button variant="ghost" onClick={handleReset} disabled={isMeasuring} size="sm">
          Reset
        </Button>
      </div>

      {/* Measuring indicator */}
      {sortPhase !== "idle" && (
        <PhaseIndicator
          variant={sortPhase === "wasm" ? "wasm" : "tanstack"}
          text={`Measuring sort — ${sortPhase === "wasm" ? "react-wasm-table" : "@tanstack/react-table"}…`}
        />
      )}
      {filterPhase !== "idle" && (
        <PhaseIndicator
          variant={filterPhase === "wasm" ? "wasm" : "tanstack"}
          text={`Measuring filter — ${filterPhase === "wasm" ? "react-wasm-table" : "@tanstack/react-table"}…`}
        />
      )}

      {/* Timing results */}
      {(sortTimes.wasm != null || sortTimes.ts != null) && (
        <TimingDisplay label="Sort" wasmMs={sortTimes.wasm} tsMs={sortTimes.ts} />
      )}
      {(filterTimes.wasm != null || filterTimes.ts != null) && (
        <TimingDisplay label="Filter" wasmMs={filterTimes.wasm} tsMs={filterTimes.ts} />
      )}

      {/* Grids */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
        {enableWasm && (
          <section>
            <h3
              style={{
                fontSize: 14,
                margin: "0 0 8px",
                fontWeight: 600,
                color: "var(--demo-panel-fg)",
              }}
            >
              react-wasm-table
            </h3>
            <div
              style={{
                border: "1px solid var(--demo-border)",
                borderRadius: 8,
                overflow: "hidden",
                height,
              }}
            >
              <Grid
                data={data as Record<string, unknown>[]}
                width={w}
                height={height}
                columns={wasmColumns}
                sorting={wasmSorting}
                onSortingChange={setWasmSorting}
                globalFilter={wasmFilter}
                onGlobalFilterChange={setWasmFilter}
                overflowY="scroll"
                overflowX="scroll"
              />
            </div>
          </section>
        )}
        {enableTanStack && (
          <section>
            <h3
              style={{
                fontSize: 14,
                margin: "0 0 8px",
                fontWeight: 600,
                color: "var(--demo-panel-fg)",
              }}
            >
              @tanstack/react-table
            </h3>
            <TanStackVirtualTable
              data={data}
              width={w}
              height={height}
              sorting={tsSorting}
              globalFilter={tsFilter}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function TimingDisplay({
  label,
  wasmMs,
  tsMs,
}: {
  label: string;
  wasmMs: number | null;
  tsMs: number | null;
}) {
  const speedup = wasmMs != null && wasmMs > 0 && tsMs != null ? (tsMs / wasmMs).toFixed(1) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
        fontSize: 13,
        padding: "6px 12px",
        backgroundColor: "var(--demo-code-bg)",
        borderRadius: 6,
      }}
    >
      <span style={{ fontWeight: 700, minWidth: 44 }}>{label}</span>
      {wasmMs != null && (
        <span style={{ color: "#2e7d32", fontWeight: 600 }}>react-wasm-table: {wasmMs}ms</span>
      )}
      {tsMs != null && (
        <span style={{ color: "#e65100", fontWeight: 600 }}>@tanstack/react-table: {tsMs}ms</span>
      )}
      {speedup != null && <span style={{ color: "#1976d2", fontWeight: 700 }}>({speedup}x)</span>}
    </div>
  );
}

// ── TanStack virtual table (supports sorting + filter) ──

function TanStackVirtualTable({
  data,
  width,
  height,
  sorting = [],
  globalFilter = "",
}: {
  data: Employee[];
  width: number;
  height: number;
  sorting?: SortingState;
  globalFilter?: string;
}) {
  const table = useReactTable({
    data,
    columns: tsColumns,
    state: { sorting, globalFilter },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const rows = table.getRowModel().rows;
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      style={{
        border: "1px solid var(--demo-border)",
        borderRadius: 8,
        overflow: "hidden",
        height,
        width,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--demo-panel-bg)",
        color: "var(--demo-panel-fg)",
      }}
    >
      <table
        style={{
          width: tsTotalWidth,
          borderCollapse: "collapse",
          tableLayout: "fixed",
          flexShrink: 0,
        }}
      >
        <thead style={{ backgroundColor: "var(--demo-code-bg)", color: "var(--demo-code-fg)" }}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  style={{
                    width: (h.column.columnDef.size as number) ?? 100,
                    minWidth: (h.column.columnDef.size as number) ?? 100,
                    padding: "8px",
                    textAlign: "left",
                    borderBottom: "1px solid var(--demo-border)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--demo-code-fg)",
                  }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
      </table>
      <div
        ref={parentRef}
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
          backgroundColor: "var(--demo-panel-bg)",
          color: "var(--demo-panel-fg)",
        }}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: tsTotalWidth,
            position: "relative",
          }}
        >
          {virtualRows.map((vRow) => {
            const row = rows[vRow.index];
            if (!row) return null;
            return (
              <div
                key={row.id}
                data-index={vRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vRow.start}px)`,
                  height: ROW_HEIGHT,
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid var(--demo-border)",
                  boxSizing: "border-box",
                  backgroundColor: "var(--demo-panel-bg)",
                  color: "var(--demo-panel-fg)",
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    style={{
                      width: (cell.column.columnDef.size as number) ?? 100,
                      flexShrink: 0,
                      padding: "4px 8px",
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--demo-panel-fg)",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
