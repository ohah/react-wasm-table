import type { CellLayout } from "../types";

/**
 * Install a dev-tools inspector that shows cell info on hover.
 * Attaches a tooltip to the canvas that displays row, col, x, y, w, h on mouseover.
 * Returns a cleanup function to remove the event listeners and tooltip.
 */
export function installInspector(
  canvas: HTMLCanvasElement,
  getLayouts?: () => CellLayout[],
): () => void {
  const tooltip = document.createElement("div");
  Object.assign(tooltip.style, {
    position: "fixed",
    padding: "4px 8px",
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    fontSize: "11px",
    fontFamily: "monospace",
    borderRadius: "3px",
    pointerEvents: "none",
    zIndex: "99999",
    display: "none",
  });
  document.body.appendChild(tooltip);

  const onMouseMove = (e: MouseEvent) => {
    if (!getLayouts) {
      tooltip.style.display = "none";
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const layouts = getLayouts();

    const hit = layouts.find(
      (l) => x >= l.x && x < l.x + l.width && y >= l.y && y < l.y + l.height,
    );

    if (hit) {
      tooltip.textContent = `row:${hit.row} col:${hit.col} x:${hit.x.toFixed(0)} y:${hit.y.toFixed(0)} w:${hit.width.toFixed(0)} h:${hit.height.toFixed(0)}`;
      tooltip.style.left = `${e.clientX + 12}px`;
      tooltip.style.top = `${e.clientY + 12}px`;
      tooltip.style.display = "block";
    } else {
      tooltip.style.display = "none";
    }
  };

  const onMouseLeave = () => {
    tooltip.style.display = "none";
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);

  return () => {
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseleave", onMouseLeave);
    tooltip.remove();
  };
}
