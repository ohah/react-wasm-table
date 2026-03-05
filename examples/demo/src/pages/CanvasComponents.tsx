import { Link } from "react-router";
import { useDarkMode, LIGHT_THEME, DARK_THEME } from "../useDarkMode";

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
  const isDark = useDarkMode();
  return (
    <>
      <h1>Canvas Components</h1>
      <p>
        One page per component. All support optional <code>style</code> and individual props. See{" "}
        <code>docs/canvas-components.md</code>.
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
        <li>
          <Link to="/canvas-switch" style={linkStyle}>
            Switch
          </Link>
        </li>
        <li>
          <Link to="/canvas-avatar" style={linkStyle}>
            Avatar
          </Link>
        </li>
      </ul>

      <h2 style={{ marginTop: 24, fontSize: 16 }}>Interactive (DOM overlay)</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li>
          <Link to="/canvas-progress-bar" style={linkStyle}>
            ProgressBar
          </Link>
        </li>
        <li>
          <Link to="/canvas-datepicker" style={linkStyle}>
            DatePicker
          </Link>
        </li>
        <li>
          <Link to="/canvas-dropdown" style={linkStyle}>
            Dropdown
          </Link>
        </li>
      </ul>
    </>
  );
}
