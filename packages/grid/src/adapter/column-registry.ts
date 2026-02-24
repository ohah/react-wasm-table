import type { ColumnProps } from "../types";

/**
 * Manages column definitions registered by <Column> components.
 * Converts React declarative column config into data for the WASM layout engine.
 */
export class ColumnRegistry {
  private columns: Map<string, ColumnProps> = new Map();

  /** Register or update a column definition. */
  register(_id: string, _props: ColumnProps): void {
    throw new Error("TODO: ColumnRegistry.register");
  }

  /** Unregister a column (on unmount). */
  unregister(_id: string): void {
    throw new Error("TODO: ColumnRegistry.unregister");
  }

  /** Get all registered columns in insertion order. */
  getAll(): ColumnProps[] {
    throw new Error("TODO: ColumnRegistry.getAll");
  }

  /** Get a column by id. */
  get(_id: string): ColumnProps | undefined {
    throw new Error("TODO: ColumnRegistry.get");
  }

  /** Number of registered columns. */
  get size(): number {
    return this.columns.size;
  }
}
