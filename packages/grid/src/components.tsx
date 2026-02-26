import type { RenderInstruction } from "./types";
import { resolveInstruction } from "./resolve-instruction";
import { Children, isValidElement, type ReactElement } from "react";

/**
 * Canvas component return type.
 * At runtime these return RenderInstruction objects, but are typed as JSX.Element
 * so they can be used in JSX expressions: `<Text value="hello" />`.
 * The `resolveInstruction()` function handles unwrapping ReactElements at render time.
 */
type CanvasElement = RenderInstruction & JSX.Element;

// ── Immediately implemented components ──────────────────────────────

/** Canvas text component. Returns a TextInstruction. */
export function Text(props: {
  value: string;
  color?: string;
  fontWeight?: string;
  fontSize?: number;
}): CanvasElement {
  return {
    type: "text",
    value: props.value,
    style: {
      ...(props.color !== undefined && { color: props.color }),
      ...(props.fontWeight !== undefined && { fontWeight: props.fontWeight }),
      ...(props.fontSize !== undefined && { fontSize: props.fontSize }),
    },
  } as CanvasElement;
}

/** Canvas badge component. Returns a BadgeInstruction. */
export function Badge(props: {
  value: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
}): CanvasElement {
  return {
    type: "badge",
    value: props.value,
    style: {
      ...(props.color !== undefined && { color: props.color }),
      ...(props.backgroundColor !== undefined && {
        backgroundColor: props.backgroundColor,
      }),
      ...(props.borderRadius !== undefined && {
        borderRadius: props.borderRadius,
      }),
    },
  } as CanvasElement;
}

/** Canvas flex container. Resolves children ReactElements into RenderInstructions. */
export function Flex(props: {
  children: ReactElement | ReactElement[];
  direction?: "row" | "column";
  gap?: number;
  align?: string;
  justify?: string;
}): CanvasElement {
  const resolved: RenderInstruction[] = [];
  Children.forEach(props.children, (child) => {
    if (isValidElement(child)) {
      resolved.push(resolveInstruction(child));
    }
  });
  return {
    type: "flex",
    direction: props.direction,
    gap: props.gap,
    align: props.align,
    justify: props.justify,
    children: resolved,
  } as CanvasElement;
}

// ── Stub components (future support) ────────────────────────────────
// These return StubInstruction objects for not-yet-implemented canvas components.
// The renderer ignores them for now; they exist to reserve the API surface.

function stub(component: string) {
  return (props: Record<string, unknown>): CanvasElement =>
    ({
      type: "stub",
      component,
      props,
    }) as CanvasElement;
}

// Layout
export const Box = stub("Box");
export const Stack = stub("Stack");
export const HStack = stub("HStack");
export const VStack = stub("VStack");

// Data display
export const ProgressBar = stub("ProgressBar");
export const Sparkline = stub("Sparkline");
export const Rating = stub("Rating");
export const Icon = stub("Icon");
export const Image = stub("Image");
export const Avatar = stub("Avatar");
export const Tag = stub("Tag");
export const Chip = stub("Chip");
export const Link = stub("Link");
export const Color = stub("Color");

// Interactive (DOM overlay)
export const Input = stub("Input");
export const NumberInput = stub("NumberInput");
export const Select = stub("Select");
export const Checkbox = stub("Checkbox");
export const Switch = stub("Switch");
export const DatePicker = stub("DatePicker");
export const Dropdown = stub("Dropdown");
