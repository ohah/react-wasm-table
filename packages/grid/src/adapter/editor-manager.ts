import type { CellCoord, CellLayout } from "../types";

/**
 * Manages DOM overlay editors for inline cell editing.
 * Positions editor elements over canvas cells and handles value commit/cancel.
 */
export class EditorManager {
  /** Open an editor for the given cell. */
  open(_coord: CellCoord, _layout: CellLayout, _editorType: string, _currentValue: unknown): void {
    throw new Error("TODO: EditorManager.open");
  }

  /** Close the active editor and discard changes. */
  cancel(): void {
    throw new Error("TODO: EditorManager.cancel");
  }

  /** Close the active editor and commit the value. */
  commit(): unknown {
    throw new Error("TODO: EditorManager.commit");
  }

  /** Whether an editor is currently open. */
  get isEditing(): boolean {
    return false;
  }
}
