import { Link } from "react-router";

export function HooksOverview() {
  return (
    <>
      <h1>Hooks Architecture (Phase 0)</h1>
      <p>
        Grid.tsx is a thin shell that composes 8 independent hooks. Each hook owns a single
        responsibility and can be tested in isolation.
      </p>

      <pre
        style={{
          background: "var(--demo-code-block-bg)",
          color: "var(--demo-code-block-fg)",
          padding: 16,
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "monospace",
          lineHeight: 1.6,
          overflowX: "auto",
        }}
      >
        {`Grid.tsx (thin shell — ~420 lines)
│
├─ useWasmEngine        WASM init + MemoryBridge
│
├─ useDataIngestion     data[] → WASM columnar store + StringTable
│
├─ useSorting           sorting state (controlled/uncontrolled)
│   └─ onBeforeSortChange guard
│
├─ useSelection         SelectionManager + clipboard + handlers
│   └─ onBeforeSelectionChange guard
│
├─ useEditing           EditorManager + double-click handler
│
├─ useGridScroll        scroll refs + auto-scroll + clamping
│
├─ useEventAttachment   EventManager.attach + callback interception
│   ├─ onCellClick / onCellDoubleClick
│   ├─ onHeaderClick
│   └─ onKeyDown
│
└─ useRenderLoop        RAF + WASM layout + Canvas draw`}
      </pre>

      <h2 style={{ marginTop: 32 }}>Demo Pages</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <DemoCard
          to="/hooks/sorting"
          title="useSorting"
          description="Controlled vs uncontrolled sorting, sort guard (max 2 columns), sort history UI."
        />
        <DemoCard
          to="/hooks/selection"
          title="useSelection"
          description="Controlled selection, onCopy customization (TSV → JSON), selection guard."
        />
        <DemoCard
          to="/hooks/composition"
          title="Hook Composition"
          description="Combining sorting + selection + event callbacks with an external state panel."
        />
        <DemoCard
          to="/event-callbacks"
          title="Event Callbacks (Step 0-3)"
          description="All 6 event callbacks with interactive blocking toggles and event log."
        />
        <DemoCard
          to="/hooks/after-draw"
          title="onAfterDraw (Step 0-4)"
          description="Custom canvas overlays after each frame: watermark, row highlight, crosshair."
        />
        <DemoCard
          to="/hooks/adapter-di"
          title="Adapter DI (Step 0-5)"
          description="Inject external EventManager/SelectionManager/EditorManager for testing or multi-grid sharing."
        />
      </div>

      <h2 style={{ marginTop: 32 }}>Design Principles</h2>
      <ul style={{ fontSize: 14, lineHeight: 1.8, color: "var(--demo-muted-2)" }}>
        <li>
          <strong>Headless first</strong> — Logic and state only, UI decisions are yours
        </li>
        <li>
          <strong>Controlled &amp; Uncontrolled</strong> — Every state follows{" "}
          <code>state + onStateChange</code> (TanStack pattern)
        </li>
        <li>
          <strong>Primitive over Feature</strong> — Composable building blocks, not monolithic
          features
        </li>
        <li>
          <strong>Zero-copy by default</strong> — Direct WASM memory access, copy only when needed
        </li>
        <li>
          <strong>Tree-shakeable</strong> — Unused features stay out of the bundle
        </li>
      </ul>
    </>
  );
}

function DemoCard({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: 16,
        background: "#f8f9fa",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1976d2")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
    >
      <div style={{ fontWeight: 600, fontSize: 15, color: "#1976d2", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--demo-muted)", lineHeight: 1.5 }}>{description}</div>
    </Link>
  );
}
