import { Link } from "react-router";

const linkStyle: React.CSSProperties = {
  display: "block",
  padding: "8px 12px",
  borderRadius: 4,
  background: "var(--demo-code-bg)",
  color: "var(--demo-code-fg)",
  color: "#1565c0",
  textDecoration: "none",
  fontSize: 14,
  marginBottom: 8,
};
export function CanvasComponents() {
  return (
    <>
      <h1>Canvas Components</h1>
      <p>
        One page per component. All support optional <code>style</code> and individual props. See{" "}
        <code>docs/canvas-components.md</code> and <code>docs/canvas-component-list.md</code>.
      </p>

      <h2 style={{ marginTop: 24, fontSize: 16 }}>Supported (drawn on canvas)</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <Link to="/canvas-text" style={linkStyle}>
            Text
          </Link>
        </li>
        <li>
          <Link to="/canvas-badge" style={linkStyle}>
            Badge
          </Link>
        </li>
        <li>
          <Link to="/canvas-flex" style={linkStyle}>
            Flex
          </Link>
        </li>
        <li>
          <Link to="/canvas-box" style={linkStyle}>
            Box
          </Link>
        </li>
        <li>
          <Link to="/canvas-stack" style={linkStyle}>
            Stack
          </Link>
        </li>
        <li>
          <Link to="/canvas-sparkline" style={linkStyle}>
            Sparkline
          </Link>
        </li>
      </ul>

      <h2 style={{ marginTop: 24, fontSize: 16 }}>Planned — interactive (DOM overlay)</h2>
      <p style={{ fontSize: 13, color: "var(--demo-muted)", marginBottom: 8 }}>
        Stub only; will use DOM overlay (e.g. <code>&lt;input type="range"&gt;</code>) when
        implemented.
      </p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <Link to="/canvas-progress-bar" style={linkStyle}>
            ProgressBar
          </Link>
        </li>
      </ul>
    </>
  );
}
