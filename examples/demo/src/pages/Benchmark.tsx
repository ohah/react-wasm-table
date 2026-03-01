import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Grid, createColumnHelper, Text, Badge, type SortingState } from "@ohah/react-wasm-table";
import {
  createColumnHelper as createTanStackColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  { value: 10_000, label: "10K" },
  { value: 50_000, label: "50K" },
  { value: 100_000, label: "100K" },
  { value: 500_000, label: "500K" },
  { value: 1_000_000, label: "1M" },
] as const;

// ── react-wasm-table columns (same as StressTest) ──
const wasmHelper = createColumnHelper<Employee>();
const wasmColumns = [
  wasmHelper.accessor("id", {
    header: "ID",
    size: 70,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
  wasmHelper.accessor("name", { header: "Name", size: 180, enableSorting: true, padding: [0, 8] }),
  wasmHelper.accessor("email", {
    header: "Email",
    size: 260,
    enableSorting: true,
    padding: [0, 8],
  }),
  wasmHelper.accessor("department", {
    header: "Dept",
    size: 130,
    enableSorting: true,
    padding: [0, 8],
    cell: (info) => (
      <Badge value={info.getValue()} color="#333" backgroundColor="#e0e0e0" borderRadius={4} />
    ),
  }),
  wasmHelper.accessor("title", {
    header: "Title",
    size: 180,
    enableSorting: true,
    padding: [0, 8],
  }),
  wasmHelper.accessor("salary", {
    header: "Salary",
    size: 110,
    enableSorting: true,
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
  wasmHelper.accessor("startDate", {
    header: "Start",
    size: 110,
    enableSorting: true,
    padding: [0, 8],
  }),
  wasmHelper.accessor("isActive", {
    header: "Active",
    size: 80,
    enableSorting: true,
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
    enableSorting: true,
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
  wasmHelper.accessor("teamSize", {
    header: "Team",
    size: 80,
    enableSorting: true,
    align: "right",
    padding: [0, 8],
  }),
];

// ── @tanstack/react-table columns (plain DOM, same schema) ──
const tanStackHelper = createTanStackColumnHelper<Employee>();
const tanStackColumns: ColumnDef<Employee, unknown>[] = [
  tanStackHelper.accessor("id", { header: "ID", cell: (c) => c.getValue(), size: 70 }),
  tanStackHelper.accessor("name", { header: "Name", cell: (c) => c.getValue(), size: 180 }),
  tanStackHelper.accessor("email", { header: "Email", cell: (c) => c.getValue(), size: 260 }),
  tanStackHelper.accessor("department", { header: "Dept", cell: (c) => c.getValue(), size: 130 }),
  tanStackHelper.accessor("title", { header: "Title", cell: (c) => c.getValue(), size: 180 }),
  tanStackHelper.accessor("salary", {
    header: "Salary",
    cell: (c) => `$${Number(c.getValue()).toLocaleString()}`,
    size: 110,
  }),
  tanStackHelper.accessor("startDate", { header: "Start", cell: (c) => c.getValue(), size: 110 }),
  tanStackHelper.accessor("isActive", {
    header: "Active",
    cell: (c) => (c.getValue() ? "Yes" : "No"),
    size: 80,
  }),
  tanStackHelper.accessor("performanceScore", {
    header: "Score",
    cell: (c) => c.getValue() ?? "—",
    size: 80,
  }),
  tanStackHelper.accessor("teamSize", { header: "Team", cell: (c) => c.getValue(), size: 80 }),
];

const totalTanStackWidth = tanStackColumns.reduce((s, c) => s + (c.size as number) || 100, 0);

export function Benchmark() {
  const [rowCountOption, setRowCountOption] = useState<(typeof ROW_COUNT_OPTIONS)[number]>(
    ROW_COUNT_OPTIONS[1],
  );
  const [data, setData] = useState<Employee[] | null>(null);
  const [wasmRenderMs, setWasmRenderMs] = useState<number | null>(null);
  const [tanStackRenderMs, setTanStackRenderMs] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const wasmMountedRef = useRef(false);
  const tanStackMountedRef = useRef(false);
  const { ref: containerRef, size } = useContainerSize(520);

  const count = rowCountOption.value;

  const runBenchmark = useCallback(() => {
    setIsGenerating(true);
    setData(null);
    setWasmRenderMs(null);
    setTanStackRenderMs(null);
    wasmMountedRef.current = false;
    tanStackMountedRef.current = false;

    const generated = generateEmployees(count) as Employee[];
    requestAnimationFrame(() => {
      setData(generated);
      setIsGenerating(false);
    });
  }, [count]);

  // Measure react-wasm-table first paint
  useEffect(() => {
    if (!data || wasmMountedRef.current) return;
    const t0 = performance.now();
    const id = requestAnimationFrame(() => {
      const ms = performance.now() - t0;
      wasmMountedRef.current = true;
      setWasmRenderMs(Math.round(ms));
    });
    return () => cancelAnimationFrame(id);
  }, [data]);

  const tableHeight = size.height > 0 ? size.height : 400;
  const tableWidth = size.width > 0 ? Math.max(size.width, 800) : 800;

  return (
    <>
      <h1 style={{ marginBottom: 8 }}>Benchmark</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        동일 데이터·동일 컬럼으로 Canvas(WASM) 그리드와 DOM 기반 TanStack React Table + 가상
        스크롤을 비교합니다. 행 수를 선택한 뒤 &quot;벤치마크 실행&quot;을 누르면 초기 렌더 시간이
        측정됩니다. 스크롤 시 상단 FPS 카운터로 스크롤 성능을 확인할 수 있습니다.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>행 수:</span>
          <select
            value={rowCountOption.value}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRowCountOption(
                ROW_COUNT_OPTIONS.find((o) => o.value === v) ?? ROW_COUNT_OPTIONS[1]!,
              );
            }}
            disabled={!!data}
            style={{ padding: "6px 12px", fontSize: 14 }}
          >
            {ROW_COUNT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} rows
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={runBenchmark}
          disabled={isGenerating}
          style={{
            padding: "8px 20px",
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: isGenerating ? "not-allowed" : "pointer",
          }}
        >
          {isGenerating ? "데이터 생성 중…" : "벤치마크 실행"}
        </button>
        {data && (
          <span style={{ fontSize: 14, color: "#666" }}>
            {data.length.toLocaleString()} rows 로드됨
          </span>
        )}
      </div>

      {!data && !isGenerating && (
        <p style={{ color: "#888" }}>
          위에서 행 수를 선택하고 &quot;벤치마크 실행&quot;을 눌러주세요.
        </p>
      )}

      {isGenerating && (
        <p style={{ color: "#666" }}>데이터 생성 중… (수만~수백만 행이라 수 초 걸릴 수 있습니다)</p>
      )}

      {data && size.width > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "stretch" }}>
          {/* react-wasm-table (Canvas) */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: 18, margin: 0 }}>react-wasm-table (Canvas + WASM)</h2>
              {wasmRenderMs != null && (
                <span
                  style={{
                    padding: "4px 12px",
                    backgroundColor: "#e8f5e9",
                    color: "#2e7d32",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  초기 렌더: {wasmRenderMs} ms
                </span>
              )}
            </div>
            <div
              ref={containerRef}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                overflow: "hidden",
                height: tableHeight,
              }}
            >
              <Grid
                data={data as Record<string, unknown>[]}
                width={tableWidth}
                height={tableHeight}
                columns={wasmColumns}
                sorting={sorting}
                onSortingChange={setSorting}
                overflowY="scroll"
                overflowX="scroll"
              />
            </div>
          </section>

          {/* TanStack React Table (DOM + virtual) */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: 18, margin: 0 }}>@tanstack/react-table (DOM + virtual)</h2>
              {tanStackRenderMs != null && (
                <span
                  style={{
                    padding: "4px 12px",
                    backgroundColor: "#fff3e0",
                    color: "#e65100",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  초기 렌더: {tanStackRenderMs} ms
                </span>
              )}
            </div>
            <TanStackTablePanel
              data={data}
              columns={tanStackColumns}
              width={tableWidth}
              height={tableHeight}
              onRenderMs={setTanStackRenderMs}
              mountedRef={tanStackMountedRef}
            />
          </section>
        </div>
      )}

      {data && (wasmRenderMs != null || tanStackRenderMs != null) && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <strong>측정 요약</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>초기 렌더: 마운트 후 첫 프레임까지 소요 시간(ms). 낮을수록 좋음.</li>
            <li>
              스크롤 FPS: 페이지 우측 상단 FPS를 보며 각 테이블 영역을 스크롤해 비교할 수 있습니다.
            </li>
          </ul>
        </div>
      )}
    </>
  );
}

// ── TanStack table + useVirtualizer (virtualized body) ──
function TanStackTablePanel({
  data,
  columns,
  width,
  height,
  onRenderMs,
  mountedRef,
}: {
  data: Employee[];
  columns: ColumnDef<Employee, unknown>[];
  width: number;
  height: number;
  onRenderMs: (ms: number) => void;
  mountedRef: React.MutableRefObject<boolean>;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (mountedRef.current) return;
    const t0 = performance.now();
    const id = requestAnimationFrame(() => {
      const ms = performance.now() - t0;
      mountedRef.current = true;
      onRenderMs(Math.round(ms));
    });
    return () => cancelAnimationFrame(id);
  }, [data, onRenderMs, mountedRef]);

  const rows = table.getRowModel().rows;
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        overflow: "hidden",
        height,
        width,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <table
        style={{
          width: totalTanStackWidth,
          borderCollapse: "collapse",
          tableLayout: "fixed",
          flexShrink: 0,
        }}
      >
        <thead style={{ backgroundColor: "#f5f5f5" }}>
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
                    borderBottom: "1px solid #e0e0e0",
                    fontSize: 12,
                    fontWeight: 600,
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
        }}
      >
        <div
          style={{
            height: totalSize,
            width: totalTanStackWidth,
            position: "relative",
          }}
        >
          {virtualRows.map((vRow) => {
            const row = rows[vRow.index]!;
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
                  borderBottom: "1px solid #eee",
                  boxSizing: "border-box",
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
