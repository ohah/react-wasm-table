interface CodeSnippetProps {
  title?: string;
  children: string;
}

const preStyle: React.CSSProperties = {
  background: "#1e1e1e",
  color: "#d4d4d4",
  padding: 16,
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 1.5,
  overflowX: "auto",
  margin: 0,
  fontFamily: "ui-monospace, monospace",
};

export function CodeSnippet({ title = "예제 코드", children }: CodeSnippetProps) {
  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 8 }}>{title}</h3>
      <pre style={preStyle}>
        <code>{children.trim()}</code>
      </pre>
    </section>
  );
}
