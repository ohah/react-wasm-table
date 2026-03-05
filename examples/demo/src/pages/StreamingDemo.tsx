import { useState, useCallback, useRef } from "react";
import { Grid, createColumnHelper, Text, Badge } from "@ohah/react-wasm-table";
import { useContainerSize } from "../useContainerSize";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

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

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Operations",
];
const TITLES = [
  "Junior Engineer",
  "Senior Engineer",
  "Staff Engineer",
  "Principal Engineer",
  "Engineering Manager",
  "Product Manager",
  "Designer",
  "Marketing Lead",
  "Sales Rep",
  "HR Specialist",
  "Accountant",
  "Ops Manager",
];
const FIRST_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
  "Grace",
  "Hank",
  "Ivy",
  "Jack",
  "Karen",
  "Leo",
  "Mia",
  "Noah",
  "Olivia",
  "Paul",
  "Quinn",
  "Ruby",
  "Sam",
  "Tina",
];
const LAST_NAMES = [
  "Kim",
  "Lee",
  "Park",
  "Choi",
  "Jung",
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Tanaka",
];

/** Deterministic RNG so data is reproducible. */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Generate a batch of employees starting at the given index. */
function generateBatch(startIndex: number, count: number): Employee[] {
  const rand = makeRng(startIndex + 1);
  return Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!;
    const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]!;
    const dept = DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)]!;
    const year = 2015 + Math.floor(rand() * 10);
    const month = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    return {
      id: idx + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@example.com`,
      department: dept,
      title: TITLES[Math.floor(rand() * TITLES.length)]!,
      salary: 40000 + Math.floor(rand() * 160000),
      startDate: `${year}-${month}-${day}`,
      isActive: rand() > 0.15,
      performanceScore: rand() > 0.1 ? Math.round(rand() * 50 + 50) : null,
      teamSize: 1 + Math.floor(rand() * 20),
    };
  });
}

const helper = createColumnHelper<Employee>();
const columns = [
  helper.accessor("id", { header: "ID", size: 70, align: "right", padding: [0, 8] }),
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("email", { header: "Email", size: 260, padding: [0, 8] }),
  helper.accessor("department", {
    header: "Dept",
    size: 130,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  helper.accessor("title", { header: "Title", size: 180, padding: [0, 8] }),
  helper.accessor("salary", {
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
  helper.accessor("startDate", { header: "Start", size: 110, padding: [0, 8] }),
  helper.accessor("isActive", {
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
  helper.accessor("performanceScore", {
    header: "Score",
    size: 80,
    align: "right",
    padding: [0, 8],
    cell: (info) => {
      const val = info.getValue();
      if (val == null) return <Text value="\u2014" color="#999" />;
      return (
        <Text
          value={String(val)}
          fontWeight="bold"
          color={val >= 80 ? "#2e7d32" : val >= 60 ? "#ed6c02" : "#d32f2f"}
        />
      );
    },
  }),
  helper.accessor("teamSize", { header: "Team", size: 80, align: "right", padding: [0, 8] }),
];

const TOTAL_COUNT_OPTIONS = [
  { value: 10_000, label: "10K" },
  { value: 50_000, label: "50K" },
  { value: 100_000, label: "100K" },
  { value: 500_000, label: "500K" },
  { value: 1_000_000, label: "1M" },
] as const;

const BATCH_SIZE_OPTIONS = [
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
] as const;

const LATENCY_OPTIONS = [
  { value: 0, label: "0ms" },
  { value: 50, label: "50ms" },
  { value: 200, label: "200ms" },
  { value: 500, label: "500ms" },
  { value: 1000, label: "1s" },
] as const;

type TimingEntry = {
  fetchNum: number;
  batchSize: number;
  totalRows: number;
  networkMs: number;
  generateMs: number;
  totalMs: number;
};

export function StreamingDemo() {
  const isDark = useDarkMode();
  const [totalCount, setTotalCount] = useState(100_000);
  const [batchSize, setBatchSize] = useState(200);
  const [latency, setLatency] = useState(50);
  const [data, setData] = useState<Employee[]>(() => generateBatch(0, 200));
  const [fetchLog, setFetchLog] = useState<string[]>([]);
  const [timings, setTimings] = useState<TimingEntry[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const fetchCountRef = useRef(0);
  const { ref: containerRef, size } = useContainerSize(500);

  const handleFetchMore = useCallback(
    (startIndex: number, count: number) => {
      fetchCountRef.current += 1;
      const fetchNum = fetchCountRef.current;
      setIsFetching(true);
      const t0 = performance.now();

      const addLog = (msg: string) => {
        setFetchLog((prev) => {
          const next = [`#${fetchNum} ${msg}`, ...prev];
          return next.slice(0, 50);
        });
      };

      addLog(`Fetching rows ${startIndex}..${startIndex + count}`);

      // Simulate network latency
      setTimeout(() => {
        const tNetwork = performance.now();
        const networkMs = tNetwork - t0;

        const tGen0 = performance.now();
        const newRows = generateBatch(startIndex, count);
        const generateMs = performance.now() - tGen0;

        const totalRows = startIndex + count;
        setData((prev) => [...prev, ...newRows]);
        setIsFetching(false);

        const totalMs = performance.now() - t0;

        const entry: TimingEntry = {
          fetchNum,
          batchSize: count,
          totalRows,
          networkMs: Math.round(networkMs * 10) / 10,
          generateMs: Math.round(generateMs * 10) / 10,
          totalMs: Math.round(totalMs * 10) / 10,
        };
        setTimings((prev) => [entry, ...prev].slice(0, 50));

        addLog(
          `Loaded ${count} rows in ${Math.round(totalMs)}ms ` +
            `(net: ${Math.round(networkMs)}ms, gen: ${generateMs.toFixed(1)}ms, total rows: ${totalRows})`,
        );
      }, latency);
    },
    [latency],
  );

  const handleReset = useCallback(() => {
    setData(generateBatch(0, batchSize));
    setFetchLog([]);
    setTimings([]);
    fetchCountRef.current = 0;
    setIsFetching(false);
  }, [batchSize]);

  const progress = Math.min(100, (data.length / totalCount) * 100);

  const gridWidth = size.width > 0 ? size.width : 800;

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
        Streaming Data (Infinite Scroll)
      </h2>
      <p style={{ margin: "0 0 16px", color: "var(--demo-muted)", fontSize: 14 }}>
        Scroll down to trigger <code>onFetchMore</code>. Data is appended incrementally. Scrollbar
        reflects <code>totalCount</code>, not loaded data length.
      </p>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <LabeledSelect
          label="Total Rows"
          value={totalCount}
          options={TOTAL_COUNT_OPTIONS}
          onChange={(v) => {
            setTotalCount(v);
            handleReset();
          }}
        />
        <LabeledSelect
          label="Batch Size"
          value={batchSize}
          options={BATCH_SIZE_OPTIONS}
          onChange={(v) => {
            setBatchSize(v);
          }}
        />
        <LabeledSelect
          label="Simulated Latency"
          value={latency}
          options={LATENCY_OPTIONS}
          onChange={setLatency}
        />
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {/* Status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 12,
          fontSize: 13,
        }}
      >
        <div>
          <strong>Loaded:</strong> {data.length.toLocaleString()} / {totalCount.toLocaleString()}
        </div>
        <div style={{ flex: 1, maxWidth: 300 }}>
          <div
            style={{
              height: 8,
              backgroundColor: "#e0e0e0",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: progress >= 100 ? "#4caf50" : "#1976d2",
                borderRadius: 4,
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
        <div style={{ color: "var(--demo-muted-4)" }}>{progress.toFixed(1)}%</div>
        {isFetching && (
          <div
            style={{
              padding: "2px 10px",
              backgroundColor: "#fff3e0",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              color: "#e65100",
            }}
          >
            Fetching...
          </div>
        )}
      </div>

      {/* Timing Stats */}
      {timings.length > 0 && <TimingStats timings={timings} />}

      {/* Grid */}
      <div ref={containerRef} style={{ width: "100%" }}>
        {size.width > 0 && (
          <div
            style={{ border: "1px solid var(--demo-border)", borderRadius: 8, overflow: "hidden" }}
          >
            <Grid
              data={data as Record<string, unknown>[]}
              columns={columns}
              width={gridWidth}
              height={500}
              totalCount={totalCount}
              onFetchMore={handleFetchMore}
              fetchAhead={batchSize}
              overflowY="scroll"
              overflowX="scroll"
              theme={isDark ? DARK_THEME : LIGHT_THEME}
            />
          </div>
        )}
      </div>

      {/* Fetch log */}
      {fetchLog.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Fetch Log</h3>
          <div
            style={{
              maxHeight: 200,
              overflow: "auto",
              backgroundColor: "var(--demo-code-bg)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
              lineHeight: 1.8,
            }}
          >
            {fetchLog.map((entry, i) => (
              <div key={i} style={{ color: entry.includes("Loaded") ? "#2e7d32" : "#555" }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimingStats({ timings }: { timings: TimingEntry[] }) {
  const last = timings[0]!;
  const avg = (key: keyof TimingEntry) => {
    const vals = timings.map((t) => t[key] as number);
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };
  const max = (key: keyof TimingEntry) =>
    Math.round(Math.max(...timings.map((t) => t[key] as number)) * 10) / 10;

  const statStyle: React.CSSProperties = {
    padding: "4px 12px",
    backgroundColor: "var(--demo-card-bg)",
    borderRadius: 6,
    border: "1px solid var(--demo-border)",
    textAlign: "center",
    minWidth: 80,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--demo-muted-4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "monospace",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 12,
        flexWrap: "wrap",
        alignItems: "stretch",
      }}
    >
      <div style={statStyle}>
        <div style={labelStyle}>Last Total</div>
        <div
          style={{
            ...valueStyle,
            color: last.totalMs > 200 ? "#d32f2f" : last.totalMs > 50 ? "#ed6c02" : "#2e7d32",
          }}
        >
          {last.totalMs}ms
        </div>
      </div>
      <div style={statStyle}>
        <div style={labelStyle}>Network</div>
        <div style={valueStyle}>{last.networkMs}ms</div>
      </div>
      <div style={statStyle}>
        <div style={labelStyle}>Generate</div>
        <div style={valueStyle}>{last.generateMs}ms</div>
      </div>
      <div style={statStyle}>
        <div style={labelStyle}>Batch</div>
        <div style={valueStyle}>{last.batchSize}</div>
      </div>
      <div style={statStyle}>
        <div style={labelStyle}>Total Rows</div>
        <div style={valueStyle}>{last.totalRows.toLocaleString()}</div>
      </div>
      <div style={{ ...statStyle, borderColor: "#e3f2fd", backgroundColor: "#f5f9ff" }}>
        <div style={labelStyle}>Avg Total</div>
        <div style={valueStyle}>{avg("totalMs")}ms</div>
      </div>
      <div style={{ ...statStyle, borderColor: "#fce4ec", backgroundColor: "#fff5f5" }}>
        <div style={labelStyle}>Max Total</div>
        <div style={{ ...valueStyle, color: "#d32f2f" }}>{max("totalMs")}ms</div>
      </div>
      <div style={{ ...statStyle, borderColor: "#e8f5e9", backgroundColor: "#f5fff5" }}>
        <div style={labelStyle}>Fetches</div>
        <div style={valueStyle}>{timings.length}</div>
      </div>
    </div>
  );
}

function LabeledSelect<T extends number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { readonly value: T; readonly label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: "var(--demo-muted-2)" }}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as T)}
        style={{
          padding: "5px 8px",
          fontSize: 13,
          border: "1px solid var(--demo-border-2)",
          borderRadius: 6,
          backgroundColor: "var(--demo-card-bg)",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
