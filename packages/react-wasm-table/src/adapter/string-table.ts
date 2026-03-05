/**
 * JS-side string cache for canvas rendering.
 * Strings stay in JS — only numbers cross the WASM boundary.
 * Populated once per data change, read during each render frame.
 * Keyed by column ID (string) so lookups are independent of column order.
 */
export class StringTable {
  private columns: Map<string, string[]> = new Map();

  /**
   * Build the string table from raw data.
   * Called when data changes (not per-frame).
   *
   * @param data - The original row objects
   * @param columnIds - Column ID strings
   */
  populate(data: Record<string, unknown>[], columnIds: string[]): void {
    this.columns.clear();
    for (const key of columnIds) {
      const col: string[] = new Array(data.length);
      for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const v = data[rowIdx]![key];
        col[rowIdx] = v == null ? "" : String(v);
      }
      this.columns.set(key, col);
    }
  }

  /**
   * Append new rows to existing data (streaming optimization).
   * Only processes rows from startIndex onward — O(delta) instead of O(n).
   *
   * @param data - The full data array (including previously loaded rows)
   * @param columnIds - Column ID strings
   * @param startIndex - Index of the first new row to process
   */
  append(data: Record<string, unknown>[], columnIds: string[], startIndex: number): void {
    for (const key of columnIds) {
      let col = this.columns.get(key);
      if (!col) {
        col = [];
        this.columns.set(key, col);
      }
      for (let i = startIndex; i < data.length; i++) {
        const v = data[i]![key];
        col[i] = v == null ? "" : String(v);
      }
    }
  }

  /**
   * Get the display string for a cell.
   * @param colId - Column ID
   * @param rowIdx - Original row index (from view_indices)
   */
  get(colId: string, rowIdx: number): string {
    return this.columns.get(colId)?.[rowIdx] ?? "";
  }

  clear(): void {
    this.columns.clear();
  }
}
