/**
 * Generates favicon.ico from assets/logo.svg.
 * Run: bun scripts/generate-favicon.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import toIco from "to-ico";

const root = path.join(import.meta.dir, "..");
const svgPath = path.join(root, "assets", "logo.svg");
const outPath = path.join(root, "assets", "favicon.ico");

const svg = fs.readFileSync(svgPath, "utf-8");

async function main() {
  const sizes = [16, 32, 48] as const;
  const pngs = sizes.map((size) => {
    const resvg = new Resvg(svg, {
      fitTo: { mode: "zoom", value: size / 64 },
    });
    const rendered = resvg.render();
    return rendered.asPng();
  });

  const ico = await toIco(pngs);
  fs.writeFileSync(outPath, ico);
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
