import { useState, useMemo, useCallback } from "react";
import { Grid, createColumnHelper, Input, Text } from "@ohah/react-wasm-table";

type Row = {
  id: number;
  product: string;
  price: number;
  quantity: number;
  discount: number;
};

const helper = createColumnHelper<Row>();

const btnBase: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "#1976d2",
  color: "#fff",
  border: "1px solid #1976d2",
};

const PRODUCTS = [
  "Laptop",
  "Keyboard",
  "Mouse",
  "Monitor",
  "Headphones",
  "Webcam",
  "USB Hub",
  "SSD 1TB",
  "RAM 16GB",
  "Charger",
  "Cable Pack",
  "Desk Lamp",
  "Chair Mat",
  "Mic Stand",
  "Speaker",
];

function generateData(): Row[] {
  return PRODUCTS.map((product, i) => ({
    id: i,
    product,
    price: Math.round((10 + Math.random() * 990) * 100) / 100,
    quantity: Math.floor(1 + Math.random() * 50),
    discount: Math.round(Math.random() * 30),
  }));
}

export function CanvasNumberInput() {
  const [data, setData] = useState(generateData);
  const [disabled, setDisabled] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const handleChange = useCallback(
    (rowIndex: number, field: keyof Row, value: number) => {
      setData((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)));
      addLog(`Row ${rowIndex} ${field} → ${value}`);
    },
    [addLog],
  );

  const columns = useMemo(
    () => [
      helper.accessor("product", {
        header: "Product",
        size: 120,
        padding: [0, 8],
      }),
      helper.display({
        id: "priceInput",
        header: "Price ($)",
        size: 140,
        cell: (info) => (
          <Input
            type="number"
            value={String(info.row.original.price)}
            min={0}
            max={9999}
            step={0.01}
            disabled={disabled}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) handleChange(info.row.index, "price", v);
            }}
          />
        ),
      }),
      helper.display({
        id: "qtyInput",
        header: "Quantity",
        size: 120,
        cell: (info) => (
          <Input
            type="number"
            value={String(info.row.original.quantity)}
            min={0}
            max={999}
            step={1}
            disabled={disabled}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) handleChange(info.row.index, "quantity", v);
            }}
          />
        ),
      }),
      helper.display({
        id: "discountInput",
        header: "Discount (%)",
        size: 130,
        cell: (info) => (
          <Input
            type="number"
            value={String(info.row.original.discount)}
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) handleChange(info.row.index, "discount", v);
            }}
          />
        ),
      }),
      helper.display({
        id: "total",
        header: "Total",
        size: 120,
        padding: [0, 8],
        cell: (info) => {
          const { price, quantity, discount } = info.row.original;
          const total = price * quantity * (1 - discount / 100);
          return <Text value={`$${total.toFixed(2)}`} />;
        },
      }),
    ],
    [disabled, handleChange],
  );

  return (
    <>
      <h1>Canvas: Number Input</h1>
      <p>
        <code>{'<Input type="number" min={0} max={100} step={5} />'}</code> renders a native number
        input as a DOM overlay. Use <code>min</code>, <code>max</code>, <code>step</code> to
        constrain values. The browser provides built-in spinner arrows and validation.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div>
          <strong>disabled:</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[false, true].map((v) => (
              <button
                key={String(v)}
                style={disabled === v ? btnActive : btnBase}
                onClick={() => setDisabled(v)}
              >
                {String(v)}
              </button>
            ))}
          </div>
        </div>
        <button style={btnBase} onClick={() => setData(generateData())}>
          Reset Data
        </button>
        <button style={btnBase} onClick={() => setLogs([])}>
          Clear Logs
        </button>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Product Inventory ({data.length} rows)</h2>
        <Grid
          data={data}
          columns={columns}
          width={650}
          height={400}
          rowHeight={40}
          overflowX="auto"
          overflowY="auto"
        />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Event Log</h2>
        <pre
          style={{
            background: "#f5f5f5",
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            maxHeight: 160,
            overflow: "auto",
          }}
        >
          {logs.length > 0 ? logs.join("\n") : "(no events yet — edit a number to see logs)"}
        </pre>
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Current Data</h2>
        <pre
          style={{
            background: "#f5f5f5",
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          {JSON.stringify(
            data.map((r) => ({
              product: r.product,
              price: r.price,
              quantity: r.quantity,
              discount: r.discount,
              total: +(r.price * r.quantity * (1 - r.discount / 100)).toFixed(2),
            })),
            null,
            2,
          )}
        </pre>
      </section>
    </>
  );
}
