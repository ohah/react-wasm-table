import type { CellCoord, CellLayout } from "../types";

/**
 * Pure state manager for cell editing.
 * No DOM creation — React components render the editor via createPortal.
 */
export class EditorManager {
  private _activeCoord: CellCoord | null = null;
  private _activeLayout: CellLayout | null = null;
  private _editorType: string | null = null;
  private _currentValue: unknown = undefined;
  private _initialChar: string | null = null;

  /** Called after a successful commit with the cell coordinate and committed value. */
  onCommit?: (coord: CellCoord, value: unknown) => void;
  /** Called on Tab/Shift+Tab after commit, with the origin coord and direction. */
  onNavigate?: (coord: CellCoord, direction: "next" | "prev") => void;
  /** Called whenever editing state changes (open/commit/cancel). Used by React to sync state. */
  onStateChange?: () => void;

  /** Open an editor for the given cell (sets state, does not create DOM). */
  open(
    coord: CellCoord,
    layout: CellLayout,
    editorType: string,
    currentValue: unknown,
    initialChar?: string | null,
  ): void {
    // Close any existing editor first (without firing onCommit)
    if (this._activeCoord) {
      this.clearState();
    }
    this._activeCoord = coord;
    this._activeLayout = layout;
    this._editorType = editorType;
    this._currentValue = currentValue;
    this._initialChar = initialChar ?? null;
    this.onStateChange?.();
  }

  /** Commit a value (provided by the React editor component) and close. */
  commitValue(value: unknown): void {
    if (!this._activeCoord) return;
    const coord = this._activeCoord;
    this.clearState();
    this.onStateChange?.();
    this.onCommit?.(coord, value);
  }

  /** Commit a value then navigate to the next/prev editable cell. */
  commitAndNavigate(value: unknown, direction: "next" | "prev"): void {
    if (!this._activeCoord) return;
    const coord = this._activeCoord;
    this.clearState();
    this.onStateChange?.();
    this.onCommit?.(coord, value);
    this.onNavigate?.(coord, direction);
  }

  /** Close the active editor without committing. */
  cancel(): void {
    if (!this._activeCoord) return;
    this.clearState();
    this.onStateChange?.();
  }

  /** Whether an editor is currently open. */
  get isEditing(): boolean {
    return this._activeCoord !== null;
  }

  get activeCoord(): CellCoord | null {
    return this._activeCoord;
  }

  get activeLayout(): CellLayout | null {
    return this._activeLayout;
  }

  get editorType(): string | null {
    return this._editorType;
  }

  get currentValue(): unknown {
    return this._currentValue;
  }

  get initialChar(): string | null {
    return this._initialChar;
  }

  private clearState(): void {
    this._activeCoord = null;
    this._activeLayout = null;
    this._editorType = null;
    this._currentValue = undefined;
    this._initialChar = null;
  }
}
