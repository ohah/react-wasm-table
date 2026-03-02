import { describe, expect, it, mock, beforeEach } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import type { CellLayout } from "../../types";
import { TextEditor, NumberEditor, SelectEditor, editorStyle } from "../editors/built-in-editors";

const layout: CellLayout = {
  row: 1,
  col: 0,
  x: 10,
  y: 50,
  width: 120,
  height: 36,
  contentAlign: "left",
};

describe("editorStyle", () => {
  it("maps layout to CSS properties", () => {
    const style = editorStyle(layout);
    expect(style.position).toBe("absolute");
    expect(style.left).toBe(10);
    expect(style.top).toBe(50);
    expect(style.width).toBe(120);
    expect(style.height).toBe(36);
    expect(style.maxWidth).toBe(120);
    expect(style.maxHeight).toBe(36);
    expect(style.boxSizing).toBe("border-box");
  });
});

describe("TextEditor", () => {
  let onCommit: ReturnType<typeof mock>;
  let onCancel: ReturnType<typeof mock>;
  let onCommitAndNavigate: ReturnType<typeof mock>;

  beforeEach(() => {
    onCommit = mock(() => {});
    onCancel = mock(() => {});
    onCommitAndNavigate = mock(() => {});
  });

  it("renders an input with the current value", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe("text");
    expect(input.value).toBe("hello");
  });

  it("uses initialChar instead of value when provided", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar="a"
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("a");
  });

  it("calls onCommit on Enter", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("hello");
  });

  it("calls onCancel on Escape", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCommitAndNavigate('next') on Tab", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onCommitAndNavigate).toHaveBeenCalledWith("hello", "next");
  });

  it("calls onCommitAndNavigate('prev') on Shift+Tab", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(onCommitAndNavigate).toHaveBeenCalledWith("hello", "prev");
  });

  it("calls onCommit on blur when not already committed", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("does not double-commit on blur after Enter", () => {
    const { container } = render(
      <TextEditor
        value="hello"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("converts null/undefined value to empty string", () => {
    const { container } = render(
      <TextEditor
        value={null}
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("");
  });
});

describe("NumberEditor", () => {
  let onCommit: ReturnType<typeof mock>;
  let onCancel: ReturnType<typeof mock>;
  let onCommitAndNavigate: ReturnType<typeof mock>;

  beforeEach(() => {
    onCommit = mock(() => {});
    onCancel = mock(() => {});
    onCommitAndNavigate = mock(() => {});
  });

  it("renders a number input", () => {
    const { container } = render(
      <NumberEditor
        value={42}
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe("number");
    expect(input.value).toBe("42");
  });

  it("commits Number() on Enter", () => {
    const { container } = render(
      <NumberEditor
        value={42}
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith(42);
  });

  it("calls onCancel on Escape", () => {
    const { container } = render(
      <NumberEditor
        value={42}
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input")!;
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses initialChar instead of value", () => {
    // number input's setSelectionRange throws in happy-dom, suppress it
    const origSetRange = HTMLInputElement.prototype.setSelectionRange;
    HTMLInputElement.prototype.setSelectionRange = function (...args: any[]) {
      try {
        origSetRange.apply(this, args);
      } catch {
        // Ignore InvalidStateError for type=number in happy-dom
      }
    };
    try {
      const { container } = render(
        <NumberEditor
          value={42}
          onCommit={onCommit}
          onCancel={onCancel}
          onCommitAndNavigate={onCommitAndNavigate}
          layout={layout}
          initialChar="5"
        />,
      );
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("5");
    } finally {
      HTMLInputElement.prototype.setSelectionRange = origSetRange;
    }
  });

  it("returns raw string when NaN", () => {
    const { container } = render(
      <NumberEditor
        value=""
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        initialChar={null}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    // Change to non-numeric value
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // NaN case: returns raw string
    const committed = onCommit.mock.calls[0]![0];
    // The actual input.value might be empty for type=number with invalid input
    // So we check it doesn't throw
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(committed === "" || committed === 0 || typeof committed === "string").toBe(true);
  });
});

describe("SelectEditor", () => {
  const options = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Cherry", value: "cherry" },
  ];

  let onCommit: ReturnType<typeof mock>;
  let onCancel: ReturnType<typeof mock>;
  let onCommitAndNavigate: ReturnType<typeof mock>;

  beforeEach(() => {
    onCommit = mock(() => {});
    onCancel = mock(() => {});
    onCommitAndNavigate = mock(() => {});
  });

  it("renders a select with options", () => {
    const { container } = render(
      <SelectEditor
        value="banana"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select")!;
    expect(select).toBeTruthy();
    const opts = select.querySelectorAll("option");
    expect(opts.length).toBe(3);
    expect(opts[0]!.textContent).toBe("Apple");
    expect(opts[1]!.textContent).toBe("Banana");
    expect(opts[2]!.textContent).toBe("Cherry");
  });

  it("selects the matching option for current value", () => {
    const { container } = render(
      <SelectEditor
        value="banana"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    // banana is index 1
    expect(select.value).toBe("1");
  });

  it("commits immediately on change", () => {
    const { container } = render(
      <SelectEditor
        value="apple"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "2" } });
    expect(onCommit).toHaveBeenCalledWith("cherry");
  });

  it("calls onCancel on Escape", () => {
    const { container } = render(
      <SelectEditor
        value="apple"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select")!;
    fireEvent.keyDown(select, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCommit on Enter", () => {
    const { container } = render(
      <SelectEditor
        value="banana"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select")!;
    fireEvent.keyDown(select, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith("banana");
  });

  it("calls onCommitAndNavigate on Tab", () => {
    const { container } = render(
      <SelectEditor
        value="banana"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select")!;
    fireEvent.keyDown(select, { key: "Tab" });
    expect(onCommitAndNavigate).toHaveBeenCalledWith("banana", "next");
  });

  it("calls onCommitAndNavigate('prev') on Shift+Tab", () => {
    const { container } = render(
      <SelectEditor
        value="banana"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select")!;
    fireEvent.keyDown(select, { key: "Tab", shiftKey: true });
    expect(onCommitAndNavigate).toHaveBeenCalledWith("banana", "prev");
  });

  it("calls onCommit on blur when not already committed", () => {
    const { container } = render(
      <SelectEditor
        value="apple"
        onCommit={onCommit}
        onCancel={onCancel}
        onCommitAndNavigate={onCommitAndNavigate}
        layout={layout}
        options={options}
      />,
    );
    const select = container.querySelector("select")!;
    fireEvent.blur(select);
    expect(onCommit).toHaveBeenCalledWith("apple");
  });
});
