import { useEffect, useRef, useState } from "react";
import type { CellLayout } from "../../types";

/** Absolute-positioned style for editor overlay, constrained to cell bounds. */
export function editorStyle(layout: CellLayout): React.CSSProperties {
  return {
    position: "absolute",
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
    maxWidth: layout.width,
    maxHeight: layout.height,
    boxSizing: "border-box",
    border: "2px solid #1976d2",
    outline: "none",
    padding: "0 8px",
    fontSize: 13,
    fontFamily: "system-ui, sans-serif",
    background: "#fff",
    zIndex: 10,
    pointerEvents: "auto",
    overflow: "hidden",
  };
}

export interface TextEditorProps {
  value: unknown;
  onCommit: (value: unknown) => void;
  onCancel: () => void;
  onCommitAndNavigate: (value: unknown, direction: "next" | "prev") => void;
  layout: CellLayout;
  initialChar: string | null;
}

export function TextEditor({
  value,
  onCommit,
  onCancel,
  onCommitAndNavigate,
  layout,
  initialChar,
}: TextEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  const initialValue = initialChar != null ? initialChar : value == null ? "" : String(value);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (initialChar == null) {
      input.select();
    } else {
      // Place cursor at end
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [initialChar]);

  const getValue = () => inputRef.current?.value ?? "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      committedRef.current = true;
      onCommit(getValue());
    } else if (e.key === "Escape") {
      committedRef.current = true;
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      committedRef.current = true;
      onCommitAndNavigate(getValue(), e.shiftKey ? "prev" : "next");
    }
  };

  const handleBlur = () => {
    if (!committedRef.current) {
      onCommit(getValue());
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialValue}
      style={editorStyle(layout)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}

export interface NumberEditorProps {
  value: unknown;
  onCommit: (value: unknown) => void;
  onCancel: () => void;
  onCommitAndNavigate: (value: unknown, direction: "next" | "prev") => void;
  layout: CellLayout;
  initialChar: string | null;
}

export function NumberEditor({
  value,
  onCommit,
  onCancel,
  onCommitAndNavigate,
  layout,
  initialChar,
}: NumberEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  const initialValue = initialChar != null ? initialChar : value == null ? "" : String(value);

  const toNumber = (raw: string) => {
    const num = Number(raw);
    return Number.isNaN(num) ? raw : num;
  };
  const getValue = () => toNumber(inputRef.current?.value ?? "");

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (initialChar == null) {
      input.select();
    } else {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [initialChar]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      committedRef.current = true;
      onCommit(getValue());
    } else if (e.key === "Escape") {
      committedRef.current = true;
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      committedRef.current = true;
      onCommitAndNavigate(getValue(), e.shiftKey ? "prev" : "next");
    }
  };

  const handleBlur = () => {
    if (!committedRef.current) {
      onCommit(getValue());
    }
  };

  return (
    <input
      ref={inputRef}
      type="number"
      defaultValue={initialValue}
      style={editorStyle(layout)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}

export interface SelectEditorProps {
  value: unknown;
  onCommit: (value: unknown) => void;
  onCancel: () => void;
  onCommitAndNavigate: (value: unknown, direction: "next" | "prev") => void;
  layout: CellLayout;
  options: { label: string; value: unknown }[];
}

export function SelectEditor({
  value,
  onCommit,
  onCancel,
  onCommitAndNavigate,
  layout,
  options,
}: SelectEditorProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const committedRef = useRef(false);

  // Find matching option index for the current value
  const [selected, setSelected] = useState(() => {
    const idx = options.findIndex((o) => o.value === value);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelected(idx);
    committedRef.current = true;
    onCommit(options[idx].value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === "Escape") {
      committedRef.current = true;
      onCancel();
    } else if (e.key === "Enter") {
      committedRef.current = true;
      onCommit(options[selected].value);
    } else if (e.key === "Tab") {
      e.preventDefault();
      committedRef.current = true;
      onCommitAndNavigate(options[selected].value, e.shiftKey ? "prev" : "next");
    }
  };

  const handleBlur = () => {
    if (!committedRef.current) {
      onCommit(options[selected].value);
    }
  };

  return (
    <select
      ref={selectRef}
      value={selected}
      style={editorStyle(layout)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {options.map((opt, i) => (
        <option key={String(opt.value)} value={i}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
