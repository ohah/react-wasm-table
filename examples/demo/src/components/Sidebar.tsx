import { NavLink } from "react-router";

const sections = [
  {
    title: "Basic",
    links: [
      { to: "/", label: "Home (50k rows)" },
      { to: "/stress-test", label: "Stress Test (1M rows)" },
      { to: "/tanstack-api", label: "TanStack API" },
      { to: "/selection", label: "Selection" },
      { to: "/event-callbacks", label: "Event Callbacks" },
      { to: "/column-features", label: "Column Features" },
    ],
  },
  {
    title: "Hooks",
    links: [
      { to: "/hooks", label: "Overview" },
      { to: "/hooks/sorting", label: "useSorting" },
      { to: "/hooks/filtering", label: "useFiltering" },
      { to: "/hooks/selection", label: "useSelection" },
      { to: "/hooks/composition", label: "Composition" },
      { to: "/hooks/after-draw", label: "onAfterDraw" },
      { to: "/hooks/adapter-di", label: "Adapter DI" },
    ],
  },
  {
    title: "Grid Container",
    links: [{ to: "/grid-template", label: "grid-template-columns" }],
  },
  {
    title: "Flex Container",
    links: [
      { to: "/flex-direction", label: "flex-direction" },
      { to: "/flex-wrap", label: "flex-wrap" },
      { to: "/gap", label: "gap" },
      { to: "/justify-content", label: "justify-content" },
      { to: "/align-items", label: "align-items" },
    ],
  },
  {
    title: "Flex Items",
    links: [
      { to: "/flex-grow", label: "flex-grow / shrink / basis" },
      { to: "/position", label: "position + inset" },
    ],
  },
  {
    title: "Box Model",
    links: [
      { to: "/padding", label: "padding" },
      { to: "/margin", label: "margin" },
      { to: "/overflow", label: "overflow" },
      { to: "/scrollbar", label: "scrollbar" },
    ],
  },
];

const linkStyle: React.CSSProperties = {
  display: "block",
  padding: "6px 16px",
  textDecoration: "none",
  color: "#555",
  fontSize: 14,
  borderRadius: 4,
};

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: "#1976d2",
  backgroundColor: "#e3f2fd",
  fontWeight: 600,
};

export function Sidebar() {
  return (
    <nav
      style={{
        width: 220,
        minWidth: 220,
        borderRight: "1px solid #e0e0e0",
        padding: "16px 0",
        overflowY: "auto",
        backgroundColor: "#fafafa",
      }}
    >
      <div style={{ padding: "0 16px 12px", fontWeight: 700, fontSize: 16 }}>react-wasm-table</div>
      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 12 }}>
          <div
            style={{
              padding: "4px 16px",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#999",
              letterSpacing: 0.5,
            }}
          >
            {section.title}
          </div>
          {section.links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
