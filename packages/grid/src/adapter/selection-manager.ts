import type { CellRange, NormalizedRange } from "../types";

/**
 * Build a TSV string from a normalized cell range.
 * Pure function — independently testable.
 */
export function buildTSV(
  range: NormalizedRange,
  getText: (row: number, col: number) => string,
): string {
  const lines: string[] = [];
  for (let r = range.minRow; r <= range.maxRow; r++) {
    const cells: string[] = [];
    for (let c = range.minCol; c <= range.maxCol; c++) {
      cells.push(getText(r, c));
    }
    lines.push(cells.join("\t"));
  }
  return lines.join("\n");
}

/**
 * Manages cell range selection state and clipboard copy via hidden textarea.
 *
 * State machine:
 *   start(r,c) → dragging=true, range set, onDirty()
 *   extend(r,c) → endRow/endCol updated (only if changed), onDirty()
 *   finish() → dragging=false (no onDirty — no visual change)
 *   extendTo(r,c) → keeps anchor, updates end, onDirty()
 *   clear() → range=null, onDirty()
 */
export class SelectionManager {
  private range: CellRange | null = null;
  private dragging = false;
  private textarea: HTMLTextAreaElement | null = null;
  private onDirty: (() => void) | null = null;

  /** Set callback invoked when selection visually changes. */
  setOnDirty(cb: () => void): void {
    this.onDirty = cb;
  }

  /** Start drag selection (mousedown). */
  start(row: number, col: number): void {
    this.range = { startRow: row, startCol: col, endRow: row, endCol: col };
    this.dragging = true;
    this.onDirty?.();
  }

  /** Extend selection during drag (mousemove). Only fires onDirty if range actually changed. */
  extend(row: number, col: number): void {
    if (!this.range) return;
    if (this.range.endRow === row && this.range.endCol === col) return;
    this.range.endRow = row;
    this.range.endCol = col;
    this.onDirty?.();
  }

  /** Finish drag (mouseup). No visual change. */
  finish(): void {
    this.dragging = false;
  }

  /** Shift+click: keep anchor, extend to new end. */
  extendTo(row: number, col: number): void {
    if (!this.range) return;
    this.range.endRow = row;
    this.range.endCol = col;
    this.onDirty?.();
  }

  /** Set range from external controlled state. */
  setRange(range: CellRange | null): void {
    if (range === null) {
      this.clear();
      return;
    }
    const changed =
      !this.range ||
      this.range.startRow !== range.startRow ||
      this.range.startCol !== range.startCol ||
      this.range.endRow !== range.endRow ||
      this.range.endCol !== range.endCol;
    if (!changed) return;
    this.range = { ...range };
    this.onDirty?.();
  }

  /** Clear selection. */
  clear(): void {
    if (!this.range) return;
    this.range = null;
    this.onDirty?.();
  }

  /** Get the raw range (nullable). */
  getRange(): CellRange | null {
    return this.range;
  }

  /** Get normalized range with min/max. */
  getNormalized(): NormalizedRange | null {
    if (!this.range) return null;
    return {
      minRow: Math.min(this.range.startRow, this.range.endRow),
      maxRow: Math.max(this.range.startRow, this.range.endRow),
      minCol: Math.min(this.range.startCol, this.range.endCol),
      maxCol: Math.max(this.range.startCol, this.range.endCol),
    };
  }

  /** Check if a cell is within the current selection. */
  contains(row: number, col: number): boolean {
    const norm = this.getNormalized();
    if (!norm) return false;
    return row >= norm.minRow && row <= norm.maxRow && col >= norm.minCol && col <= norm.maxCol;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  get hasSelection(): boolean {
    return this.range !== null;
  }

  /** Create and attach a hidden textarea for clipboard operations. */
  attachClipboard(container: HTMLElement): void {
    const ta = document.createElement("textarea");
    Object.assign(ta.style, {
      position: "absolute",
      left: "-9999px",
      top: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
    });
    ta.tabIndex = -1;
    ta.setAttribute("aria-hidden", "true");
    container.appendChild(ta);
    this.textarea = ta;
  }

  /** Remove the hidden textarea. */
  detachClipboard(): void {
    if (this.textarea) {
      this.textarea.remove();
      this.textarea = null;
    }
  }

  /** Build TSV from selection and write to clipboard. */
  writeToClipboard(getText: (row: number, col: number) => string): void {
    const norm = this.getNormalized();
    if (!norm || !this.textarea) return;
    const tsv = buildTSV(norm, getText);
    this.writeToClipboardText(tsv);
  }

  /** Write pre-built text to clipboard (for onCopy override). */
  writeToClipboardText(text: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): void {
    if (!this.textarea) return;
    this.textarea.value = text;
    this.textarea.select();
    document.execCommand("copy");
  }
}
