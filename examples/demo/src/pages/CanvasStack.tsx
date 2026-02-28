import { useState, useMemo } from "react";
import { Grid, createColumnHelper, Stack, Text, Badge, Box } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";
import type { StackDirection } from "@ohah/react-wasm-table";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

const directionOptions: StackDirection[] = ["row", "column"];

export function CanvasStack() {
  const [direction, setDirection] = useState<StackDirection>("row");
  const [gap, setGap] = useState(6);

  const data = useMemo(() => generateSmallData() as Row[], []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 100, padding: [0, 8] }),
      helper.accessor("dept", {
        header: "Stack (row)",
        size: 200,
        padding: [0, 4],
        cell: (info) => (
          <Stack direction="row" gap={6}>
            <Text value={info.getValue() as string} />
            <Badge value="dept" style={{ backgroundColor: "#e3f2fd", color: "#1565c0" }} />
          </Stack>
        ),
      }),
      helper.accessor("salary", {
        header: "Stack (column)",
        size: 120,
        padding: [0, 4],
        cell: (info) => (
          <Stack direction="column" gap={2}>
            <Text value="Salary" fontSize={11} color="#666" />
            <Text value={`$${info.getValue()}`} />
          </Stack>
        ),
      }),
      helper.accessor("score", {
        header: "Controlled",
        size: 160,
        padding: [0, 4],
        cell: (info) => (
          <Stack direction={direction} gap={gap}>
            <Text value={`${info.getValue()} pts`} />
            <Badge
              value={String(info.getValue() >= 90 ? "High" : "—")}
              style={{ backgroundColor: "#c8e6c9" }}
            />
          </Stack>
        ),
      }),
      helper.accessor("name", {
        header: "Stack in Box",
        size: 180,
        padding: [0, 4],
        cell: (info) => (
          <Box padding={4} borderWidth={1} borderColor="#e0e0e0">
            <Stack direction="row" gap={4}>
              <Text value={info.getValue() as string} />
              <Badge value="OK" style={{ backgroundColor: "#e8f5e9" }} />
            </Stack>
          </Box>
        ),
      }),
    ],
    [direction, gap],
  );

  return (
    <>
      <h1>Canvas: Stack</h1>
      <p>
        <code>Stack</code> lays out children in a <code>direction: "row"</code> (horizontal) or{" "}
        <code>"column"</code> (vertical) with optional <code>gap</code>. No padding from the layout
        buffer — uses full cell rect.
      </p>

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>Direction:</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as StackDirection)}
            style={{ padding: "4px 8px", fontSize: 14 }}
          >
            {directionOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>Gap:</span>
          <input
            type="number"
            min={0}
            max={24}
            value={gap}
            onChange={(e) => setGap(Number(e.target.value) || 0)}
            style={{ width: 48, padding: "4px 8px", fontSize: 14 }}
          />
        </label>
      </div>

      <Grid data={data} columns={columns} width={780} height={340} rowHeight={44} />
    </>
  );
}
