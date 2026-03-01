import type {
  RenderInstruction,
  FlexContainerStyle,
  BoxModelStyle,
  StackDirection,
  TextStyle,
  BadgeStyle,
  SparklineStyle,
  CssFlexDirection,
  CssFlexWrap,
  CssAlignItems,
  CssAlignContent,
  CssJustifyContent,
  CssDimension,
  CssRect,
  CssLength,
  CssLengthAuto,
  CssBoxSizing,
  CssOverflow,
} from "./types";
import { resolveInstruction } from "./resolve-instruction";
import { Children, isValidElement, type ReactNode, type JSX } from "react";

/**
 * Canvas component return type.
 * At runtime these return RenderInstruction objects, but are typed as JSX.Element
 * so they can be used in JSX expressions: `<Text value="hello" />`.
 * The `resolveInstruction()` function handles unwrapping ReactElements at render time.
 */
type CanvasElement = RenderInstruction & JSX.Element;

// ── Immediately implemented components ──────────────────────────────

/** Props for the Text canvas component. Individual props override style. */
export interface TextProps {
  value: string;
  style?: Partial<TextStyle>;
  color?: string;
  fontWeight?: string;
  fontSize?: number;
}

function pickTextStyle(props: TextProps): Partial<TextStyle> {
  const { style, color, fontWeight, fontSize } = props;
  return {
    ...style,
    ...(color !== undefined && { color }),
    ...(fontWeight !== undefined && { fontWeight }),
    ...(fontSize !== undefined && { fontSize }),
  };
}

/** Canvas text component. Returns a TextInstruction. */
export function Text(props: TextProps): CanvasElement {
  const style = pickTextStyle(props);
  return {
    type: "text",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
  } as CanvasElement;
}

/** Props for the Badge canvas component. Individual props override style. */
export interface BadgeProps {
  value: string;
  style?: Partial<BadgeStyle>;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
}

function pickBadgeStyle(props: BadgeProps): Partial<BadgeStyle> {
  const { style, color, backgroundColor, borderRadius } = props;
  return {
    ...style,
    ...(color !== undefined && { color }),
    ...(backgroundColor !== undefined && { backgroundColor }),
    ...(borderRadius !== undefined && { borderRadius }),
  };
}

/** Canvas badge component. Returns a BadgeInstruction. */
export function Badge(props: BadgeProps): CanvasElement {
  const style = pickBadgeStyle(props);
  return {
    type: "badge",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
  } as CanvasElement;
}

/** Props for the Sparkline canvas component. */
export interface SparklineProps {
  /** Data points (y-values); x is evenly spaced. */
  data: number[];
  style?: Partial<SparklineStyle>;
  color?: string;
  strokeWidth?: number;
  /** "line" = stroke only, "area" = fill under line. @default "line" */
  variant?: "line" | "area";
}

function pickSparklineStyle(props: SparklineProps): Partial<SparklineStyle> {
  const { style, color, strokeWidth, variant } = props;
  return {
    ...style,
    ...(color !== undefined && { color }),
    ...(strokeWidth !== undefined && { strokeWidth }),
    ...(variant !== undefined && { variant }),
  };
}

/** Canvas sparkline component. Draws a mini line chart. Returns a SparklineInstruction. */
export function Sparkline(props: SparklineProps): CanvasElement {
  const style = pickSparklineStyle(props);
  return {
    type: "sparkline",
    data: props.data,
    style: Object.keys(style).length > 0 ? style : undefined,
  } as CanvasElement;
}

/** Props for the Flex canvas component (Taffy-compatible flex container). */
export interface FlexProps {
  /** Child canvas elements (ReactNode; only valid elements are resolved). */
  children: ReactNode;
  /** Flex container style (same as individual props; explicit props override style). */
  style?: Partial<FlexContainerStyle>;
  // Individual style props (override style when both set)
  flexDirection?: CssFlexDirection;
  flexWrap?: CssFlexWrap;
  gap?: CssDimension;
  rowGap?: CssDimension;
  columnGap?: CssDimension;
  alignItems?: CssAlignItems;
  alignContent?: CssAlignContent;
  justifyContent?: CssJustifyContent;
  padding?: CssRect<CssLength>;
  margin?: CssRect<CssLengthAuto>;
  borderWidth?: CssRect<CssLength>;
  boxSizing?: CssBoxSizing;
  overflow?: CssOverflow;
}

function pickFlexStyle(props: FlexProps): Partial<FlexContainerStyle> & {
  flexDirection?: CssFlexDirection;
  alignItems?: CssAlignItems;
  justifyContent?: CssJustifyContent;
} {
  const {
    style,
    flexDirection,
    flexWrap,
    gap,
    rowGap,
    columnGap,
    alignItems,
    alignContent,
    justifyContent,
    padding,
    margin,
    borderWidth,
    boxSizing,
    overflow,
  } = props;
  return {
    ...style,
    flexDirection: flexDirection ?? style?.flexDirection,
    flexWrap: flexWrap ?? style?.flexWrap,
    gap: gap ?? style?.gap,
    rowGap: rowGap ?? style?.rowGap,
    columnGap: columnGap ?? style?.columnGap,
    alignItems: alignItems ?? style?.alignItems,
    alignContent: alignContent ?? style?.alignContent,
    justifyContent: justifyContent ?? style?.justifyContent,
    padding: padding ?? style?.padding,
    margin: margin ?? style?.margin,
    borderWidth: borderWidth ?? style?.borderWidth,
    boxSizing: boxSizing ?? style?.boxSizing,
    overflow: overflow ?? style?.overflow,
  };
}

/** Canvas flex container. Taffy-compatible styles; resolves child ReactElements into RenderInstructions. */
export function Flex(props: FlexProps): CanvasElement {
  const resolved: RenderInstruction[] = [];
  Children.forEach(props.children, (child) => {
    if (isValidElement(child)) {
      resolved.push(resolveInstruction(child));
    }
  });
  const style = pickFlexStyle(props);
  return {
    type: "flex",
    flexDirection: style.flexDirection,
    flexWrap: style.flexWrap,
    gap: style.gap,
    rowGap: style.rowGap,
    columnGap: style.columnGap,
    alignItems: style.alignItems,
    alignContent: style.alignContent,
    justifyContent: style.justifyContent,
    padding: style.padding,
    margin: style.margin,
    borderWidth: style.borderWidth,
    boxSizing: style.boxSizing,
    overflow: style.overflow,
    children: resolved,
  } as CanvasElement;
}

/** Props for the Box canvas component (padding, margin, border; no layout). */
export interface BoxProps {
  children?: ReactNode;
  style?: Partial<BoxModelStyle>;
  padding?: CssRect<CssLength>;
  margin?: CssRect<CssLengthAuto>;
  borderWidth?: CssRect<CssLength>;
  borderColor?: string;
  backgroundColor?: string;
  boxSizing?: CssBoxSizing;
}

function pickBoxStyle(props: BoxProps): Partial<BoxModelStyle> {
  const { style, padding, margin, borderWidth, borderColor, backgroundColor, boxSizing } = props;
  return {
    ...style,
    padding: padding ?? style?.padding,
    margin: margin ?? style?.margin,
    borderWidth: borderWidth ?? style?.borderWidth,
    borderColor: borderColor ?? style?.borderColor,
    backgroundColor: backgroundColor ?? style?.backgroundColor,
    boxSizing: boxSizing ?? style?.boxSizing,
  };
}

/** Canvas box container. Box model only; children drawn in content rect (vertical stack). */
export function Box(props: BoxProps): CanvasElement {
  const resolved: RenderInstruction[] = [];
  if (props.children != null) {
    Children.forEach(props.children, (child) => {
      if (isValidElement(child)) {
        resolved.push(resolveInstruction(child));
      }
    });
  }
  const style = pickBoxStyle(props);
  return {
    type: "box",
    padding: style.padding,
    margin: style.margin,
    borderWidth: style.borderWidth,
    borderColor: style.borderColor,
    backgroundColor: style.backgroundColor,
    boxSizing: style.boxSizing,
    children: resolved,
  } as CanvasElement;
}

// ── Stub components (future support) ────────────────────────────────
// These return StubInstruction objects for not-yet-implemented canvas components.
// They accept an optional `style` object; individual props override style (same as Text/Badge/Flex).
// The renderer ignores them for now; they exist to reserve the API surface.

/** Props for stub canvas components. style is merged with rest; rest overrides style. */
export interface StubProps {
  style?: Record<string, unknown>;
  [key: string]: unknown;
}

function stub(component: string) {
  return (props: StubProps): CanvasElement => {
    const { style, ...rest } = props;
    const merged = { ...style, ...rest } as Record<string, unknown>;
    return {
      type: "stub",
      component,
      props: Object.keys(merged).length > 0 ? merged : undefined,
    } as CanvasElement;
  };
}

/** Props for the Stack canvas component (direction + gap only). */
export interface StackProps {
  children?: ReactNode;
  /** "row" = horizontal, "column" = vertical. @default "row" */
  direction?: StackDirection;
  /** Gap between children in px. @default 4 */
  gap?: number;
  style?: { direction?: StackDirection; gap?: number };
}

/** Canvas stack: lays out children in a row or column with gap. */
export function Stack(props: StackProps): CanvasElement {
  const resolved: RenderInstruction[] = [];
  if (props.children != null) {
    Children.forEach(props.children, (child) => {
      if (isValidElement(child)) {
        resolved.push(resolveInstruction(child));
      }
    });
  }
  const direction = props.direction ?? props.style?.direction ?? "row";
  const gap = props.gap ?? props.style?.gap ?? 4;
  return {
    type: "stack",
    direction,
    gap,
    children: resolved,
  } as CanvasElement;
}

// Layout
// Data display
export const ProgressBar = stub("ProgressBar");
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
