import { useMemo } from "react";
import { Grid, createColumnHelper, Box, Text, Badge, Flex } from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type Row = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<Row>();

export function CanvasBox() {
  const data = useMemo(() => generateSmallData() as Row[], []);

  const columns = useMemo(
    () => [
      helper.accessor("name", { header: "Name", size: 100, padding: [0, 8] }),
      helper.accessor("dept", {
        header: "Box + Text",
        size: 140,
        padding: [0, 4],
        cell: (info) => (
          <Box padding={8} borderWidth={1} borderColor="#e0e0e0" backgroundColor="#fafafa">
            <Text value={info.getValue() as string} />
          </Box>
        ),
      }),
      helper.accessor("salary", {
        header: "Box + Badge",
        size: 120,
        padding: [0, 4],
        cell: (info) => (
          <Box padding={[4, 8]} borderWidth={1} borderColor="#ccc">
            <Badge value={`$${info.getValue()}`} style={{ backgroundColor: "#e8f5e9" }} />
          </Box>
        ),
      }),
      helper.accessor("dept", {
        header: "Multi child",
        size: 140,
        padding: [0, 4],
        cell: (info) => (
          <Box padding={6} borderWidth={1} borderColor="#bdbdbd" backgroundColor="#f5f5f5">
            <Text value={info.getValue() as string} fontSize={12} />
            <Badge value="dept" style={{ backgroundColor: "#e3f2fd", color: "#1565c0" }} />
          </Box>
        ),
      }),
      helper.accessor("name", {
        header: "Box → Flex",
        size: 160,
        padding: [0, 4],
        cell: (info) => (
          <Box padding={4} borderWidth={1} borderColor="#90caf9" backgroundColor="#e3f2fd">
            <Flex gap={6} alignItems="center">
              <Text value={info.getValue() as string} />
              <Badge value="OK" style={{ backgroundColor: "#c8e6c9" }} />
            </Flex>
          </Box>
        ),
      }),
      helper.accessor("score", {
        header: "Border only",
        size: 100,
        padding: [0, 4],
        cell: (info) => (
          <Box
            padding={6}
            borderWidth={2}
            borderColor="#1976d2"
            children={<Text value={`${info.getValue()} pts`} />}
          />
        ),
      }),
      helper.accessor("salary", {
        header: "style prop",
        size: 120,
        padding: [0, 4],
        cell: (info) => (
          <Box
            style={{
              padding: 6,
              backgroundColor: "#fff3e0",
              borderWidth: 1,
              borderColor: "#ffb74d",
            }}
          >
            <Text value={`$${info.getValue()}`} />
          </Box>
        ),
      }),
    ],
    [],
  );

  return (
    <>
      <h1>Canvas: Box</h1>
      <p>
        <code>Box</code> is a generic container: <code>padding</code>, <code>margin</code>,{" "}
        <code>borderWidth</code>, <code>borderColor</code>, <code>backgroundColor</code>. Children
        are drawn in the content rect in a vertical stack.
      </p>
      <ul style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
        <li>
          <strong>Box + Text / Box + Badge</strong> — single child with padding and border
        </li>
        <li>
          <strong>Multi child</strong> — vertical stack (Text + Badge)
        </li>
        <li>
          <strong>Box → Flex</strong> — Box wrapping Flex row (Text + Badge)
        </li>
        <li>
          <strong>Border only</strong> — no background, border only
        </li>
        <li>
          <strong>style prop</strong> — <code>style</code> object (individual props override)
        </li>
      </ul>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Grid API</h2>
        <Grid data={data} columns={columns} width={900} height={500} rowHeight={48} />
      </section>
    </>
  );
}
