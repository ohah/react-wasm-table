import type { ColumnProps } from "../types";

/**
 * Manages column definitions registered by <Column> components.
 * Converts React declarative column config into data for the WASM layout engine.
 */
export class ColumnRegistry {
  private columns: Map<string, ColumnProps> = new Map();
  private listeners = new Set<() => void>();

  /** Register or update a column definition. */
  register(id: string, props: ColumnProps): void {
    this.columns.set(id, props);
    this.notify();
  }

  /** Replace all columns at once (for object-based column definitions). */
  setAll(columns: ColumnProps[]): void {
    this.columns.clear();
    for (const col of columns) {
      this.columns.set(col.id, col);
    }
    this.notify();
  }

  /** Unregister a column (on unmount). */
  unregister(id: string): void {
    this.columns.delete(id);
    this.notify();
  }

  /** Get all registered columns in insertion order. */
  getAll(): ColumnProps[] {
    return Array.from(this.columns.values());
  }

  /** Get a column by id. */
  get(id: string): ColumnProps | undefined {
    return this.columns.get(id);
  }

  /** Number of registered columns. */
  get size(): number {
    return this.columns.size;
  }

  /** Subscribe to column changes. Returns unsubscribe function. */
  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) {
      cb();
    }
  }
}
