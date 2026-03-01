import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Grid,
  createColumnHelper,
  EventManager,
  SelectionManager,
  EditorManager,
  type NormalizedRange,
} from "@ohah/react-wasm-table";
import { generateSmallData } from "../data";

type SmallRow = { name: string; dept: string; salary: number; score: number };
const helper = createColumnHelper<SmallRow>();

const columns = [
  helper.accessor("name", { header: "Name", size: 180, padding: [0, 8] }),
  helper.accessor("dept", { header: "Department", size: 140, padding: [0, 8] }),
  helper.accessor("salary", { header: "Salary", size: 120, align: "right", padding: [0, 8] }),
  helper.accessor("score", { header: "Score", size: 100, align: "right", padding: [0, 8] }),
];

export function AdapterDIDemo() {
  const data = useMemo(() => generateSmallData(), []);

  // External managers — created once, shared across grids or inspected externally
  const [eventManager] = useState(() => new EventManager());
  const [selectionManager] = useState(() => new SelectionManager());
  const [editorManager] = useState(() => new EditorManager());

  const [useDI, setUseDI] = useState(true);
  const [selectionInfo, setSelectionInfo] = useState<string>("none");
  const [isDragging, setIsDragging] = useState(false);

  // Poll selection manager state for display
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    if (!useDI) {
      setSelectionInfo("none (DI disabled)");
      setIsDragging(false);
      return;
    }
    pollRef.current = setInterval(() => {
      const norm = selectionManager.getNormalized();
      if (norm) {
        setSelectionInfo(`row ${norm.minRow}-${norm.maxRow}, col ${norm.minCol}-${norm.maxCol}`);
      } else {
        setSelectionInfo("none");
      }
      setIsDragging(selectionManager.isDragging);
    }, 100);
    return () => clearInterval(pollRef.current);
  }, [useDI, selectionManager]);

  const clearSelection = useCallback(() => {
    selectionManager.clear();
    setSelectionInfo("none");
  }, [selectionManager]);

  return (
    <>
      <h1>Adapter DI (Step 0-5)</h1>
      <p>
        Inject external <code>EventManager</code>, <code>SelectionManager</code>, and{" "}
        <code>EditorManager</code> instances via props. Useful for sharing state between multiple
        grids, testing, or building custom integrations.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={useDI} onChange={(e) => setUseDI(e.target.checked)} />
          Enable Adapter DI
        </label>
        {useDI && (
          <button
            onClick={clearSelection}
            style={{
              padding: "4px 12px",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Clear Selection (external)
          </button>
        )}
      </div>

      <pre
        style={{
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {useDI
          ? `const [selectionManager] = useState(() => new SelectionManager());

// Grid A: full DI (all 3 managers)
<Grid eventManager={eventManager} selectionManager={selectionManager}
      editorManager={editorManager} ... />

// Grid B: shared SelectionManager only (selecting in one reflects in both)
<Grid selectionManager={selectionManager} ... />`
          : `// Default: each Grid creates internal managers
<Grid data={data} columns={columns} />`}
      </pre>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Grid A</div>
          <Grid
            data={data}
            width={460}
            height={280}
            columns={columns}
            {...(useDI ? { eventManager, selectionManager, editorManager } : {})}
          />
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>
            Grid B (shared SelectionManager)
          </div>
          <Grid
            data={data}
            width={460}
            height={200}
            columns={columns}
            {...(useDI ? { selectionManager } : {})}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 220,
          }}
        >
          <Panel title="Injected Managers">
            <div>
              <code>EventManager</code>:{" "}
              <span style={{ color: useDI ? "#2e7d32" : "#999" }}>
                {useDI ? "external" : "internal (default)"}
              </span>
            </div>
            <div>
              <code>SelectionManager</code>:{" "}
              <span style={{ color: useDI ? "#2e7d32" : "#999" }}>
                {useDI ? "external" : "internal (default)"}
              </span>
            </div>
            <div>
              <code>EditorManager</code>:{" "}
              <span style={{ color: useDI ? "#2e7d32" : "#999" }}>
                {useDI ? "external" : "internal (default)"}
              </span>
            </div>
          </Panel>

          <Panel title="External State (polled)">
            <div>
              <strong>Selection:</strong> {selectionInfo}
            </div>
            <div>
              <strong>Dragging:</strong>{" "}
              <span style={{ color: isDragging ? "#d32f2f" : "#999" }}>
                {isDragging ? "yes" : "no"}
              </span>
            </div>
            {useDI && (
              <div style={{ marginTop: 8, color: "#888", fontSize: 12 }}>
                Reading directly from SelectionManager instance
              </div>
            )}
          </Panel>

          <Panel title="Use Cases">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Share managers between multiple grids</li>
              <li>External state inspection / debugging</li>
              <li>Custom manager subclasses for testing</li>
              <li>Programmatic selection control</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 12,
        background: "#f9f9f9",
        borderRadius: 6,
        border: "1px solid #eee",
        fontSize: 13,
        lineHeight: 1.8,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#333" }}>{title}</div>
      {children}
    </div>
  );
}
