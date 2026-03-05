/**
 * Extract code examples from demo TSX files and append them as
 * ```tsx code fences in the corresponding MDX files.
 *
 * Usage: bun scripts/extract-code-to-mdx.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const DEMO_DIR = path.resolve("examples/demo/src/pages");
const MDX_EN_DIR = path.resolve("document/docs/en/api/example");
const MDX_KO_DIR = path.resolve("document/docs/ko/api/example");

// Map MDX file names to demo component file names
function findDemoFile(mdxName: string): string | null {
  // MDX name conventions: canvas-badge.mdx → CanvasBadge.tsx, table-api.mdx → TableApiDemo.tsx
  const mappings: Record<string, string> = {
    home: "Home.tsx",
    "table-api": "TableApiDemo.tsx",
    "tanstack-api": "TanStackApi.tsx",
    selection: "Selection.tsx",
    "use-sorting": "UseSortingDemo.tsx",
    "use-filtering": "UseFilteringDemo.tsx",
    "use-selection": "UseSelectionDemo.tsx",
    "column-features": "ColumnFeatures.tsx",
    "column-pinning": "ColumnPinningDemo.tsx",
    "column-dnd-row-pinning": "ColumnDnDAndRowPinningDemo.tsx",
    expanding: "ExpandingDemo.tsx",
    "event-callbacks": "EventCallbacks.tsx",
    "event-middleware": "MiddlewareDemo.tsx",
    clipboard: "ClipboardDemo.tsx",
    export: "ExportDemo.tsx",
    "layout-cache": "LayoutCacheDemo.tsx",
    layers: "LayerDemo.tsx",
    "on-after-draw": "OnAfterDrawDemo.tsx",
    "custom-renderer": "CustomRendererDemo.tsx",
    "touch-events": "TouchEventsDemo.tsx",
    composition: "HookCompositionDemo.tsx",
    "hooks-overview": "HooksOverview.tsx",
    "stress-test": "StressTest.tsx",
    streaming: "StreamingDemo.tsx",
    scrollbar: "Scrollbar.tsx",
    "adapter-di": "AdapterDIDemo.tsx",
    "canvas-text": "CanvasText.tsx",
    "canvas-badge": "CanvasBadge.tsx",
    "canvas-sparkline": "CanvasSparkline.tsx",
    "canvas-flex": "CanvasFlex.tsx",
    "canvas-box": "CanvasBox.tsx",
    "canvas-stack": "CanvasStack.tsx",
    "canvas-progress-bar": "CanvasProgressBar.tsx",
    "canvas-components": "CanvasComponents.tsx",
    "canvas-events": "CanvasEvents.tsx",
    "canvas-chip": "CanvasChip.tsx",
    "canvas-color": "CanvasColor.tsx",
    "canvas-link": "CanvasLink.tsx",
    "canvas-rating": "CanvasRating.tsx",
    "canvas-tag": "CanvasTag.tsx",
    "canvas-input": "CanvasInput.tsx",
    // Layout demos
    "align-items": "AlignItems.tsx",
    "flex-direction": "FlexDirection.tsx",
    "flex-grow": "FlexGrow.tsx",
    "flex-wrap": "FlexWrap.tsx",
    gap: "Gap.tsx",
    "grid-template": "GridTemplate.tsx",
    "justify-content": "JustifyContent.tsx",
    margin: "Margin.tsx",
    overflow: "Overflow.tsx",
    padding: "Padding.tsx",
    position: "Position.tsx",
    "border-style": "BorderStyleDemo.tsx",
    editing: "EditingDemo.tsx",
    pagination: "PaginationDemo.tsx",
    grouping: "GroupingDemo.tsx",
    faceted: "FacetedDemo.tsx",
    "grouped-columns": "GroupedColumnsDemo.tsx",
  };
  return mappings[mdxName] ?? null;
}

function extractCodeFromDemo(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");

  // Pattern 1: const codeExample = `...`
  const codeExampleMatch = content.match(/const\s+codeExample\s*=\s*`([\s\S]*?)`;/);
  if (codeExampleMatch) return codeExampleMatch[1]!.trim();

  // Pattern 2: <details>...<pre>...<code>{`...`}</code></pre></details>
  // or <details>...<pre>{codeExample}</pre></details>

  // Pattern 3: <pre ...>{`...`}</pre> — find the LAST <pre> block with a code snippet
  // Look for the code snippet pattern (multi-line template literals in <pre>)
  const preMatches = [...content.matchAll(/<pre[\s\S]*?>\s*\{[`"]([\s\S]*?)[`"]\}\s*<\/pre>/g)];
  if (preMatches.length > 0) {
    // Use the longest match (most likely the actual code example)
    const longest = preMatches.reduce((a, b) =>
      (a[1]?.length ?? 0) >= (b[1]?.length ?? 0) ? a : b,
    );
    const code = longest[1]?.trim();
    if (code && code.length > 30) return code;
  }

  // Pattern 4: Template literal in <pre> with expression like {`<Grid gap={${var}} ...>`}
  const shortPreMatches = [...content.matchAll(/<pre[\s\S]*?>\s*\{`([\s\S]*?)`\}\s*<\/pre>/g)];
  if (shortPreMatches.length > 0) {
    const longest = shortPreMatches.reduce((a, b) =>
      (a[1]?.length ?? 0) >= (b[1]?.length ?? 0) ? a : b,
    );
    const code = longest[1]?.trim();
    if (code && code.length > 20) {
      // Replace template expressions like ${var} with placeholder
      return code.replace(/\$\{[^}]+\}/g, (m) => m);
    }
  }

  return null;
}

function appendCodeToMdx(mdxPath: string, code: string, lang: string = "tsx"): boolean {
  if (!fs.existsSync(mdxPath)) return false;
  const content = fs.readFileSync(mdxPath, "utf-8");

  // Don't add if already has a code fence
  if (content.includes("```tsx") || content.includes("```ts")) return false;

  const codeBlock = `\n\n## Code\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
  fs.writeFileSync(mdxPath, content.trimEnd() + codeBlock);
  return true;
}

// Main
let processed = 0;
let skipped = 0;

const mdxFiles = fs.readdirSync(MDX_EN_DIR).filter((f) => f.endsWith(".mdx"));

for (const mdxFile of mdxFiles) {
  const mdxName = mdxFile.replace(".mdx", "");
  const demoFileName = findDemoFile(mdxName);

  if (!demoFileName) {
    skipped++;
    continue;
  }

  const demoPath = path.join(DEMO_DIR, demoFileName);
  const code = extractCodeFromDemo(demoPath);

  if (!code) {
    console.log(`SKIP (no code): ${mdxName} → ${demoFileName}`);
    skipped++;
    continue;
  }

  // Add to EN MDX
  const enMdx = path.join(MDX_EN_DIR, mdxFile);
  const enAdded = appendCodeToMdx(enMdx, code);

  // Add to KO MDX if exists
  const koMdx = path.join(MDX_KO_DIR, mdxFile);
  const koAdded = fs.existsSync(koMdx) ? appendCodeToMdx(koMdx, code) : false;

  if (enAdded || koAdded) {
    console.log(`OK: ${mdxName} → ${demoFileName} (en=${enAdded}, ko=${koAdded})`);
    processed++;
  } else {
    console.log(`SKIP (already has code): ${mdxName}`);
    skipped++;
  }
}

console.log(`\nDone: ${processed} processed, ${skipped} skipped`);
