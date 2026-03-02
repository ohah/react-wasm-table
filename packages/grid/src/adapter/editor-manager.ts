import type { CellCoord, CellLayout } from "../types";

/**
 * Manages DOM overlay editors for inline cell editing.
 * Positions editor elements over canvas cells and handles value commit/cancel.
 */
export class EditorManager {
  private container: HTMLDivElement | null = null;
  private activeInput: HTMLInputElement | null = null;
  private activeCoord: CellCoord | null = null;
  /** Called after a successful commit with the cell coordinate and committed value. */
  onCommit?: (coord: CellCoord, value: unknown) => void;
  /** Called on Tab/Shift+Tab after commit, with the origin coord and direction. */
  onNavigate?: (coord: CellCoord, direction: "next" | "prev") => void;

  /** Set the container div for editor overlays. */
  setContainer(div: HTMLDivElement): void {
    this.container = div;
  }

  /** Open an editor for the given cell. */
  open(coord: CellCoord, layout: CellLayout, editorType: string, currentValue: unknown): void {
    if (!this.container) return;
    this.cleanup();

    const input = document.createElement("input");
    input.type = editorType === "number" ? "number" : "text";
    input.value = currentValue == null ? "" : String(currentValue);

    Object.assign(input.style, {
      position: "absolute",
      left: `${layout.x}px`,
      top: `${layout.y}px`,
      width: `${layout.width}px`,
      height: `${layout.height}px`,
      boxSizing: "border-box",
      border: "2px solid #1976d2",
      outline: "none",
      padding: "0 8px",
      fontSize: "13px",
      fontFamily: "system-ui, sans-serif",
      background: "#fff",
      zIndex: "10",
      pointerEvents: "auto",
    });

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        this.commit();
      } else if (e.key === "Escape") {
        this.cancel();
      } else if (e.key === "Tab") {
        e.preventDefault();
        const direction = e.shiftKey ? ("prev" as const) : ("next" as const);
        const coordBeforeCommit = this.activeCoord;
        this.commit(); // commit value + fire onCommit
        if (coordBeforeCommit && this.onNavigate) {
          this.onNavigate(coordBeforeCommit, direction);
        }
      }
    });

    input.addEventListener("blur", () => {
      // Commit on blur
      this.commit();
    });

    this.container.appendChild(input);
    this.activeInput = input;
    this.activeCoord = coord;

    // Focus and select all text
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  /** Close the active editor and discard changes. */
  cancel(): void {
    this.cleanup();
  }

  /** Close the active editor and commit the value. */
  commit(): unknown {
    if (!this.activeInput) return undefined;
    const input = this.activeInput;
    const coord = this.activeCoord;
    const value = input.type === "number" ? Number(input.value) : input.value;
    this.cleanup(); // nulls activeInput first, then removes — blur re-entry is a no-op
    if (coord && this.onCommit) this.onCommit(coord, value);
    return value;
  }

  /** Whether an editor is currently open. */
  get isEditing(): boolean {
    return this.activeInput !== null;
  }

  private cleanup(): void {
    const input = this.activeInput;
    // Null out state FIRST to guard against re-entrant commit from synchronous blur
    this.activeInput = null;
    this.activeCoord = null;
    if (input) {
      input.remove();
    }
  }
}
