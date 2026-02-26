import type { CellCoord, CellLayout } from "../types";

/**
 * Manages DOM overlay editors for inline cell editing.
 * Positions editor elements over canvas cells and handles value commit/cancel.
 */
export class EditorManager {
  private container: HTMLDivElement | null = null;
  private activeInput: HTMLInputElement | null = null;
  private activeCoord: CellCoord | null = null;

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
    });

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        this.commit();
      } else if (e.key === "Escape") {
        this.cancel();
      }
    });

    input.addEventListener("blur", () => {
      // Commit on blur
      this.commit();
    });

    this.container.style.pointerEvents = "auto";
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
    const value =
      this.activeInput.type === "number" ? Number(this.activeInput.value) : this.activeInput.value;

    this.cleanup();
    return value;
  }

  /** Whether an editor is currently open. */
  get isEditing(): boolean {
    return this.activeInput !== null;
  }

  private cleanup(): void {
    if (this.activeInput && this.container) {
      this.activeInput.remove();
      this.container.style.pointerEvents = "none";
    }
    this.activeInput = null;
    this.activeCoord = null;
  }
}
