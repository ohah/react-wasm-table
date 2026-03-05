import { useState, useMemo, useCallback } from "react";
import {
  Grid,
  createColumnHelper,
  Text,
  Badge,
  Sparkline,
  Flex,
  Stack,
  ProgressBar,
  Rating,
  Tag,
  Chip,
  Link,
  Color,
  Switch,
  type SortingState,
} from "@ohah/react-wasm-table";
import { useContainerSize } from "../useContainerSize";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

// ── Data ──

type ShowcaseRow = {
  id: number;
  name: string;
  department: string;
  status: string;
  salary: number;
  score: number;
  trend: number[];
  tags: string;
  color: string;
  website: string;
  isActive: boolean;
  approved: boolean;
  rating: number;
};

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Ops",
];
const STATUSES = ["Active", "On Leave", "Inactive", "Probation"];
const STATUS_COLORS: Record<string, string> = {
  Active: "#4caf50",
  "On Leave": "#ff9800",
  Inactive: "#9e9e9e",
  Probation: "#2196f3",
};
const TAG_STYLES: Record<string, { color: string; borderColor: string }> = {
  React: { color: "#0ea5e9", borderColor: "#0ea5e9" },
  Rust: { color: "#b7410e", borderColor: "#b7410e" },
  WASM: { color: "#654ff0", borderColor: "#654ff0" },
  Canvas: { color: "#e65100", borderColor: "#e65100" },
  TypeScript: { color: "#2563eb", borderColor: "#2563eb" },
  Taffy: { color: "#16a34a", borderColor: "#16a34a" },
  Perf: { color: "#dc2626", borderColor: "#dc2626" },
  DX: { color: "#9333ea", borderColor: "#9333ea" },
};
const TAG_OPTIONS = Object.keys(TAG_STYLES);
const CHIP_COLORS: Record<string, { bg: string; fg: string }> = {
  Engineering: { bg: "#1565c0", fg: "#fff" },
  Product: { bg: "#6a1b9a", fg: "#fff" },
  Design: { bg: "#e65100", fg: "#fff" },
  Marketing: { bg: "#2e7d32", fg: "#fff" },
  Sales: { bg: "#c62828", fg: "#fff" },
  HR: { bg: "#00838f", fg: "#fff" },
  Finance: { bg: "#4527a0", fg: "#fff" },
  Ops: { bg: "#37474f", fg: "#fff" },
};
const COLORS = [
  "#e53935",
  "#1e88e5",
  "#43a047",
  "#fb8c00",
  "#8e24aa",
  "#00acc1",
  "#6d4c41",
  "#546e7a",
];
const FIRST = [
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
const LAST = [
  "Kim",
  "Lee",
  "Park",
  "Choi",
  "Smith",
  "Johnson",
  "Brown",
  "Garcia",
  "Miller",
  "Davis",
  "Tanaka",
  "Sato",
];

function generateShowcase(count: number): ShowcaseRow[] {
  const rng = (() => {
    let s = 42;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  })();
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${pick(FIRST)} ${pick(LAST)}`,
    department: pick(DEPARTMENTS),
    status: pick(STATUSES),
    salary: 40000 + Math.floor(rng() * 160000),
    score: Math.floor(rng() * 100),
    trend: Array.from({ length: 10 }, () => Math.floor(rng() * 80 + 20)),
    tags: pick(TAG_OPTIONS),
    color: pick(COLORS),
    website: `https://example.com/user/${i + 1}`,
    isActive: rng() > 0.3,
    approved: rng() > 0.4,
    rating: Math.floor(rng() * 5) + 1,
  }));
}

// ── Component ──

const helper = createColumnHelper<ShowcaseRow>();

export function Home() {
  const [data, setData] = useState(() => generateShowcase(10_000));
  const [sorting, setSorting] = useState<SortingState>([]);
  const { ref, size } = useContainerSize(700);
  const isDark = useDarkMode();

  // ── Event handlers (mutate data in-place for perf) ──

  const toggleSwitch = useCallback((rowIdx: number) => {
    setData((prev) => {
      const next = [...prev];
      const row = { ...next[rowIdx]! };
      row.isActive = !row.isActive;
      next[rowIdx] = row;
      return next;
    });
  }, []);

  const toggleApproved = useCallback((rowIdx: number) => {
    setData((prev) => {
      const next = [...prev];
      const row = { ...next[rowIdx]! };
      row.approved = !row.approved;
      next[rowIdx] = row;
      return next;
    });
  }, []);

  const updateScore = useCallback((rowIdx: number, value: number) => {
    setData((prev) => {
      const next = [...prev];
      const row = { ...next[rowIdx]! };
      row.score = value;
      next[rowIdx] = row;
      return next;
    });
  }, []);

  const cycleRating = useCallback((rowIdx: number) => {
    setData((prev) => {
      const next = [...prev];
      const row = { ...next[rowIdx]! };
      row.rating = (row.rating % 5) + 1;
      next[rowIdx] = row;
      return next;
    });
  }, []);

  // ── Columns (inside component to close over handlers) ──

  const columns = useMemo(
    () => [
      helper.accessor("id", {
        header: "#",
        size: 55,
        align: "right",
        enableSorting: true,
        padding: [0, 8],
      }),

      // Text — varied colors/weights per row
      helper.accessor("name", {
        header: "Name (Text)",
        size: 160,
        enableSorting: true,
        padding: [0, 8],
        cell: (info) => {
          const idx = info.row.index;
          const colors = ["#1a1a1a", "#1565c0", "#c62828", "#2e7d32"];
          const weights: Array<"normal" | "bold" | "600"> = ["bold", "600", "normal", "bold"];
          return (
            <Text
              value={info.getValue()}
              color={isDark ? "#e0e0e0" : colors[idx % colors.length]}
              fontWeight={weights[idx % weights.length]}
              fontSize={idx % 5 === 0 ? 14 : 13}
            />
          );
        },
      }),

      // Badge — per-status color + varied borderRadius
      helper.accessor("status", {
        header: "Status (Badge)",
        size: 120,
        enableSorting: true,
        padding: [0, 6],
        cell: (info) => {
          const v = info.getValue();
          return (
            <Badge
              value={v}
              color="#fff"
              backgroundColor={STATUS_COLORS[v] ?? "#999"}
              borderRadius={v === "Active" ? 12 : v === "Probation" ? 2 : 6}
            />
          );
        },
      }),

      // Tag — unique color per tag value
      helper.accessor("tags", {
        header: "Tag",
        size: 110,
        padding: [0, 8],
        cell: (info) => {
          const v = info.getValue();
          const s = TAG_STYLES[v] ?? { color: "#666", borderColor: "#999" };
          return (
            <Tag
              value={v}
              color={s.color}
              borderColor={s.borderColor}
              borderRadius={4}
              fontSize={11}
            />
          );
        },
      }),

      // Chip — unique color per department
      helper.accessor("department", {
        header: "Dept (Chip)",
        size: 130,
        enableSorting: true,
        padding: [0, 6],
        cell: (info) => {
          const v = info.getValue();
          const c = CHIP_COLORS[v] ?? { bg: "#455a64", fg: "#fff" };
          return <Chip value={v} backgroundColor={c.bg} color={c.fg} borderRadius={12} />;
        },
      }),

      // Flex — salary with $ prefix, color/size by range
      helper.accessor("salary", {
        header: "Salary (Flex)",
        size: 170,
        enableSorting: true,
        align: "right",
        padding: [0, 10],
        cell: (info) => {
          const v = info.getValue();
          const high = v >= 150000;
          const mid = v >= 80000;
          return (
            <Flex flexDirection="row" gap={4} alignItems="center" justifyContent="flex-end">
              <Text
                value="$"
                color={high ? "#2e7d32" : isDark ? "#999" : "#888"}
                fontSize={11}
                fontWeight={high ? "bold" : "normal"}
              />
              <Text
                value={v.toLocaleString()}
                fontWeight="bold"
                fontSize={high ? 14 : 13}
                color={high ? "#2e7d32" : mid ? "#1565c0" : isDark ? "#ccc" : "#666"}
              />
            </Flex>
          );
        },
      }),

      // ProgressBar + Stack — drag to change value, color/height by score
      helper.accessor("score", {
        header: "Score (Progress)",
        size: 190,
        enableSorting: true,
        padding: [0, 8],
        cell: (info) => {
          const v = info.getValue();
          const c = v >= 80 ? "#4caf50" : v >= 50 ? "#ff9800" : "#f44336";
          return (
            <Stack direction="row" gap={6}>
              <ProgressBar
                value={v}
                max={100}
                color={c}
                backgroundColor={v >= 80 ? "#e8f5e9" : v >= 50 ? "#fff3e0" : "#ffebee"}
                height={v >= 80 ? 12 : 8}
                borderRadius={v >= 80 ? 6 : 4}
                onChange={(newVal) => updateScore(info.row.index, newVal)}
              />
              <Text value={`${v}%`} fontSize={11} fontWeight="600" color={c} />
            </Stack>
          );
        },
      }),

      // Sparkline — varied variant/color per row
      helper.accessor("trend", {
        header: "Trend (Sparkline)",
        size: 140,
        cell: (info) => {
          const idx = info.row.index;
          const variants: Array<"line" | "area" | "bar"> = ["area", "line", "bar"];
          const colors = ["#1976d2", "#e53935", "#43a047", "#ff9800"];
          return (
            <Sparkline
              data={info.getValue()}
              variant={variants[idx % variants.length]!}
              color={colors[idx % colors.length]!}
              strokeWidth={idx % 3 === 1 ? 2 : 1.5}
            />
          );
        },
      }),

      // Rating — click to cycle, color by value
      helper.accessor("rating", {
        header: "Rating",
        size: 110,
        enableSorting: true,
        padding: [0, 6],
        cell: (info) => {
          const v = info.getValue();
          const c = v >= 4 ? "#f59e0b" : v >= 2 ? "#fb923c" : "#94a3b8";
          return (
            <Rating
              value={v}
              max={5}
              color={c}
              size={15}
              onClick={() => cycleRating(info.row.index)}
            />
          );
        },
      }),

      // Color — varied borderRadius
      helper.accessor("color", {
        header: "Color",
        size: 55,
        align: "center",
        cell: (info) => {
          const idx = info.row.index;
          return (
            <Color
              value={info.getValue()}
              borderRadius={idx % 3 === 0 ? 999 : idx % 3 === 1 ? 4 : 0}
            />
          );
        },
      }),

      // Switch — click to toggle, varied activeTrackColor
      helper.accessor("isActive", {
        header: "Switch",
        size: 65,
        align: "center",
        cell: (info) => {
          const idx = info.row.index;
          const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
          return (
            <Switch
              checked={info.getValue()}
              activeTrackColor={colors[idx % colors.length]!}
              onClick={() => toggleSwitch(idx)}
            />
          );
        },
      }),

      // Approved — click to toggle badge
      helper.accessor("approved", {
        header: "OK",
        size: 55,
        align: "center",
        cell: (info) => {
          const v = info.getValue();
          return (
            <Badge
              value={v ? "✓" : "✗"}
              color={v ? "#fff" : "#999"}
              backgroundColor={v ? "#4caf50" : isDark ? "#333" : "#eee"}
              borderRadius={v ? 10 : 3}
              onClick={() => toggleApproved(info.row.index)}
            />
          );
        },
      }),

      // Link — varied labels
      helper.accessor("website", {
        header: "Link",
        size: 85,
        padding: [0, 8],
        cell: (info) => {
          const idx = info.row.index;
          const labels = ["Visit", "Profile", "Page", "Open"];
          return (
            <Link
              value={labels[idx % labels.length]!}
              href={info.getValue()}
              color={isDark ? "#60a5fa" : "#2563eb"}
              underline
            />
          );
        },
      }),
    ],
    [isDark, toggleSwitch, toggleApproved, updateScore, cycleRating],
  );

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <>
      <h1>react-wasm-table Showcase</h1>
      <p style={{ color: "var(--demo-panel-fg, inherit)" }}>
        Rendering <strong>{data.length.toLocaleString()}</strong> rows &middot;{" "}
        <strong>13 canvas components</strong> with interactive events
        {sorting.length > 0 && (
          <span style={{ marginLeft: 8, opacity: 0.7 }}>
            | Sort: {sorting[0]!.id} ({sorting[0]!.desc ? "desc" : "asc"})
          </span>
        )}
      </p>
      <p style={{ color: "var(--demo-muted, #666)", fontSize: 13 }}>
        Try: click <strong>Switch</strong> to toggle &middot; drag <strong>Progress bar</strong> to
        change score &middot; click <strong>Rating</strong> stars to cycle &middot; click{" "}
        <strong>OK</strong> badge to toggle &middot; click headers to sort
      </p>
      <div ref={ref} style={{ width: "100%", height: 700 }}>
        {size.width > 0 && (
          <Grid
            data={data as Record<string, unknown>[]}
            width={size.width}
            height={size.height}
            columns={columns}
            sorting={sorting}
            onSortingChange={setSorting}
            overflowY="scroll"
            overflowX="scroll"
            theme={theme}
          />
        )}
      </div>
    </>
  );
}
