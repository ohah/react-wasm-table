import type {
  RenderInstruction,
  FlexContainerStyle,
  BoxModelStyle,
  StackDirection,
  TextStyle,
  BadgeStyle,
  SparklineStyle,
  ColorStyle,
  TagStyle,
  RatingStyle,
  ChipStyle,
  LinkStyle,
  ImageStyle,
  SwitchStyle,
  InputStyle,
  CanvasEventHandlers,
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
  CssObjectFit,
  ReferrerPolicy,
} from "./types";
import type { ChangeEvent, FocusEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { resolveInstruction } from "./resolve-instruction";
import { Children, isValidElement, type ReactNode, type JSX } from "react";

/**
 * Canvas component return type.
 * At runtime these return RenderInstruction objects, but are typed as JSX.Element
 * so they can be used in JSX expressions: `<Text value="hello" />`.
 * The `resolveInstruction()` function handles unwrapping ReactElements at render time.
 */
type CanvasElement = RenderInstruction & JSX.Element;

// ── Event handler extraction ────────────────────────────────────────

const EVENT_KEYS = [
  "onClick",
  "onDoubleClick",
  "onMouseDown",
  "onMouseUp",
  "onMouseEnter",
  "onMouseLeave",
  "onTouchStart",
  "onTouchEnd",
] as const;

/** Extract CanvasEventHandlers from props. Returns undefined when none are set. */
function pickEventHandlers(props: CanvasEventHandlers): CanvasEventHandlers | undefined {
  let handlers: CanvasEventHandlers | undefined;
  for (const key of EVENT_KEYS) {
    if (props[key]) {
      if (!handlers) handlers = {};
      (handlers as Record<string, unknown>)[key] = props[key];
    }
  }
  return handlers;
}

// ── Immediately implemented components ──────────────────────────────

/** Props for the Text canvas component. Individual props override style. */
export interface TextProps extends CanvasEventHandlers {
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
  const _handlers = pickEventHandlers(props);
  return {
    type: "text",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Badge canvas component. Individual props override style. */
export interface BadgeProps extends CanvasEventHandlers {
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
  const _handlers = pickEventHandlers(props);
  return {
    type: "badge",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Sparkline canvas component. */
export interface SparklineProps extends CanvasEventHandlers {
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
  const _handlers = pickEventHandlers(props);
  return {
    type: "sparkline",
    data: props.data,
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Flex canvas component (Taffy-compatible flex container). */
export interface FlexProps extends CanvasEventHandlers {
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
  const _handlers = pickEventHandlers(props);
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
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Box canvas component (padding, margin, border; no layout). */
export interface BoxProps extends CanvasEventHandlers {
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
  const _handlers = pickEventHandlers(props);
  return {
    type: "box",
    padding: style.padding,
    margin: style.margin,
    borderWidth: style.borderWidth,
    borderColor: style.borderColor,
    backgroundColor: style.backgroundColor,
    boxSizing: style.boxSizing,
    children: resolved,
    ...(_handlers && { _handlers }),
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
export interface StackProps extends CanvasEventHandlers {
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
  const _handlers = pickEventHandlers(props);
  return {
    type: "stack",
    direction,
    gap,
    children: resolved,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

// Layout
// Data display
export const ProgressBar = stub("ProgressBar");

/** Props for the Color canvas component. */
export interface ColorProps extends CanvasEventHandlers {
  value: string;
  style?: Partial<ColorStyle>;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

function pickColorStyle(props: ColorProps): Partial<ColorStyle> {
  const { style, borderColor, borderWidth, borderRadius } = props;
  return {
    ...style,
    ...(borderColor !== undefined && { borderColor }),
    ...(borderWidth !== undefined && { borderWidth }),
    ...(borderRadius !== undefined && { borderRadius }),
  };
}

/** Canvas color swatch component. Returns a ColorInstruction. */
export function Color(props: ColorProps): CanvasElement {
  const style = pickColorStyle(props);
  const _handlers = pickEventHandlers(props);
  return {
    type: "color",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Tag canvas component. */
export interface TagProps extends CanvasEventHandlers {
  value: string;
  style?: Partial<TagStyle>;
  color?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
}

function pickTagStyle(props: TagProps): Partial<TagStyle> {
  const { style, color, borderColor, borderRadius, fontSize } = props;
  return {
    ...style,
    ...(color !== undefined && { color }),
    ...(borderColor !== undefined && { borderColor }),
    ...(borderRadius !== undefined && { borderRadius }),
    ...(fontSize !== undefined && { fontSize }),
  };
}

/** Canvas tag component. Returns a TagInstruction. */
export function Tag(props: TagProps): CanvasElement {
  const style = pickTagStyle(props);
  const _handlers = pickEventHandlers(props);
  return {
    type: "tag",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Rating canvas component. */
export interface RatingProps extends CanvasEventHandlers {
  value: number;
  style?: Partial<RatingStyle>;
  max?: number;
  color?: string;
  emptyColor?: string;
  size?: number;
}

function pickRatingStyle(props: RatingProps): Partial<RatingStyle> {
  const { style, max, color, emptyColor, size } = props;
  return {
    ...style,
    ...(max !== undefined && { max }),
    ...(color !== undefined && { color }),
    ...(emptyColor !== undefined && { emptyColor }),
    ...(size !== undefined && { size }),
  };
}

/** Canvas rating component. Returns a RatingInstruction. */
export function Rating(props: RatingProps): CanvasElement {
  const style = pickRatingStyle(props);
  const _handlers = pickEventHandlers(props);
  return {
    type: "rating",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Chip canvas component. */
export interface ChipProps extends CanvasEventHandlers {
  value: string;
  style?: Partial<ChipStyle>;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  closable?: boolean;
}

function pickChipStyle(props: ChipProps): Partial<ChipStyle> {
  const { style, color, backgroundColor, borderRadius, closable } = props;
  return {
    ...style,
    ...(color !== undefined && { color }),
    ...(backgroundColor !== undefined && { backgroundColor }),
    ...(borderRadius !== undefined && { borderRadius }),
    ...(closable !== undefined && { closable }),
  };
}

/** Canvas chip component. Returns a ChipInstruction. */
export function Chip(props: ChipProps): CanvasElement {
  const style = pickChipStyle(props);
  const _handlers = pickEventHandlers(props);
  return {
    type: "chip",
    value: props.value,
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Link canvas component. */
export interface LinkProps extends CanvasEventHandlers {
  value: string;
  href?: string;
  style?: Partial<LinkStyle>;
  color?: string;
  fontSize?: number;
  underline?: boolean;
}

function pickLinkStyle(props: LinkProps): Partial<LinkStyle> {
  const { style, color, fontSize, underline } = props;
  return {
    ...style,
    ...(color !== undefined && { color }),
    ...(fontSize !== undefined && { fontSize }),
    ...(underline !== undefined && { underline }),
  };
}

/** Canvas link component. Returns a LinkInstruction. */
export function Link(props: LinkProps): CanvasElement {
  const style = pickLinkStyle(props);
  const _handlers = pickEventHandlers(props);
  return {
    type: "link",
    value: props.value,
    ...(props.href !== undefined && { href: props.href }),
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

export const Icon = stub("Icon");

/** Props for the Image canvas component. */
export interface ImageProps extends CanvasEventHandlers {
  /** Image URL (required). */
  src: string;
  /** Alt text rendered on load error. */
  alt?: string;
  /** Explicit render width in px. */
  width?: number;
  /** Explicit render height in px. */
  height?: number;
  /** CORS setting. */
  crossOrigin?: "anonymous" | "use-credentials";
  /** Referrer policy for the image fetch. */
  referrerPolicy?: ReferrerPolicy;
  /** Decoding hint. */
  decoding?: "sync" | "async" | "auto";
  /** Fetch priority hint. */
  fetchPriority?: "high" | "low" | "auto";
  style?: Partial<ImageStyle>;
  objectFit?: CssObjectFit;
  borderRadius?: number;
  opacity?: number;
}

function pickImageStyle(props: ImageProps): Partial<ImageStyle> {
  const { style, objectFit, borderRadius, opacity } = props;
  return {
    ...style,
    ...(objectFit !== undefined && { objectFit }),
    ...(borderRadius !== undefined && { borderRadius }),
    ...(opacity !== undefined && { opacity }),
  };
}

/** Canvas image component. Returns an ImageInstruction. */
export function Image(props: ImageProps): CanvasElement {
  const style = pickImageStyle(props);
  const _handlers = pickEventHandlers(props);
  return {
    type: "image",
    src: props.src,
    ...(props.alt !== undefined && { alt: props.alt }),
    ...(props.width !== undefined && { width: props.width }),
    ...(props.height !== undefined && { height: props.height }),
    ...(props.crossOrigin !== undefined && { crossOrigin: props.crossOrigin }),
    ...(props.referrerPolicy !== undefined && { referrerPolicy: props.referrerPolicy }),
    ...(props.decoding !== undefined && { decoding: props.decoding }),
    ...(props.fetchPriority !== undefined && { fetchPriority: props.fetchPriority }),
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

export const Avatar = stub("Avatar");

/** Props for the Checkbox canvas component (headless container). */
export interface CheckboxProps extends CanvasEventHandlers {
  checked: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

/** Canvas checkbox component. Headless container — children provide visuals. */
export function Checkbox(props: CheckboxProps): CanvasElement {
  const resolved: RenderInstruction[] = [];
  if (props.children != null) {
    Children.forEach(props.children, (child) => {
      if (isValidElement(child)) {
        resolved.push(resolveInstruction(child));
      }
    });
  }
  const _handlers = pickEventHandlers(props);
  return {
    type: "checkbox",
    checked: props.checked,
    ...(props.disabled !== undefined && { disabled: props.disabled }),
    children: resolved,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

/** Props for the Input canvas component (DOM overlay). */
export interface InputProps extends CanvasEventHandlers {
  /** HTML input type attribute. @default "text" */
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  style?: Partial<InputStyle>;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

function pickInputStyle(props: InputProps): Partial<InputStyle> {
  const {
    style,
    fontSize,
    fontFamily,
    color,
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius,
  } = props;
  return {
    ...style,
    ...(fontSize !== undefined && { fontSize }),
    ...(fontFamily !== undefined && { fontFamily }),
    ...(color !== undefined && { color }),
    ...(backgroundColor !== undefined && { backgroundColor }),
    ...(borderColor !== undefined && { borderColor }),
    ...(borderWidth !== undefined && { borderWidth }),
    ...(borderRadius !== undefined && { borderRadius }),
  };
}

/** Canvas input component. Renders a DOM overlay <input> positioned by Taffy layout. */
export function Input(props: InputProps): CanvasElement {
  const style = pickInputStyle(props);
  const _handlers = pickEventHandlers(props);
  const _domHandlers: Record<string, unknown> = {};
  if (props.onChange) _domHandlers.onChange = props.onChange;
  if (props.onFocus) _domHandlers.onFocus = props.onFocus;
  if (props.onBlur) _domHandlers.onBlur = props.onBlur;
  if (props.onKeyDown) _domHandlers.onKeyDown = props.onKeyDown;
  return {
    type: "input",
    ...(props.type !== undefined && { inputType: props.type }),
    ...(props.value !== undefined && { value: props.value }),
    ...(props.placeholder !== undefined && { placeholder: props.placeholder }),
    ...(props.disabled !== undefined && { disabled: props.disabled }),
    ...(props.readOnly !== undefined && { readOnly: props.readOnly }),
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(Object.keys(_domHandlers).length > 0 && { _domHandlers }),
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

export const NumberInput = stub("NumberInput");
export const Select = stub("Select");

/** Props for the Switch canvas component. */
export interface SwitchProps extends CanvasEventHandlers {
  checked: boolean;
  disabled?: boolean;
  style?: Partial<SwitchStyle>;
  trackColor?: string;
  activeTrackColor?: string;
  thumbColor?: string;
  width?: number;
  height?: number;
  /** Transition duration in ms. @default 150 */
  transitionDuration?: number;
  /** CSS timing function. @default "ease" */
  transitionTimingFunction?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
}

function pickSwitchStyle(props: SwitchProps): Partial<SwitchStyle> {
  const {
    style,
    trackColor,
    activeTrackColor,
    thumbColor,
    width,
    height,
    transitionDuration,
    transitionTimingFunction,
  } = props;
  return {
    ...style,
    ...(trackColor !== undefined && { trackColor }),
    ...(activeTrackColor !== undefined && { activeTrackColor }),
    ...(thumbColor !== undefined && { thumbColor }),
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    ...(transitionDuration !== undefined && { transitionDuration }),
    ...(transitionTimingFunction !== undefined && { transitionTimingFunction }),
  };
}

/** Canvas switch (toggle) component. Returns a SwitchInstruction. */
export function Switch(props: SwitchProps): CanvasElement {
  const style = pickSwitchStyle(props);
  const _handlers = pickEventHandlers(props);
  return {
    type: "switch",
    checked: props.checked,
    ...(props.disabled !== undefined && { disabled: props.disabled }),
    style: Object.keys(style).length > 0 ? style : undefined,
    ...(_handlers && { _handlers }),
  } as CanvasElement;
}

export const DatePicker = stub("DatePicker");
export const Dropdown = stub("Dropdown");
