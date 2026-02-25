/**
 * JS-side string cache for canvas rendering.
 * Strings stay in JS — only numbers cross the WASM boundary.
 * Populated once per data change, read during each render frame.
 */
export class StringTable {
  private columns: Map<number, string[]> = new Map();

  /**
   * Build the string table from raw data.
   * Called when data changes (not per-frame).
   *
   * @param data - The original row objects
   * @param columnIds - Ordered column ID strings (same order as WASM column indices)
   */
  populate(data: Record<string, unknown>[], columnIds: string[]): void {
    this.columns.clear();
    for (let colIdx = 0; colIdx < columnIds.length; colIdx++) {
      const key = columnIds[colIdx]!;
      const col: string[] = new Array(data.length);
      for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const v = data[rowIdx]![key];
        col[rowIdx] = v == null ? "" : String(v);
      }
      this.columns.set(colIdx, col);
    }
  }

  /**
   * Get the display string for a cell.
   * @param colIdx - Column index
   * @param rowIdx - Original row index (from view_indices)
   */
  get(colIdx: number, rowIdx: number): string {
    return this.columns.get(colIdx)?.[rowIdx] ?? "";
  }

  clear(): void {
    this.columns.clear();
  }
}
