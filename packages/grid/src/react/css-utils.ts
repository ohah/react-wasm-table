import type { CssDimension, CssLength, CssLengthAuto, CssRect, CssGridLine } from "../types";

/** Convert CssDimension to WASM-compatible value (number | string). */
export function resolveDimension(v: CssDimension | undefined): number | string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return v;
  return v; // "auto" or "50%" pass through as string
}

/** Convert CssLength to WASM-compatible value (number | string). */
export function resolveLength(v: CssLength | undefined): number | string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return v;
  return v; // "50%" passes through
}

/** Convert CssLengthAuto to WASM-compatible value. */
export function resolveLengthAuto(v: CssLengthAuto | undefined): number | string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return v;
  return v; // "auto" or "50%"
}

/** Resolve CSS rect shorthand to {top, right, bottom, left}. */
export function resolveRect<T>(
  shorthand: CssRect<T> | undefined,
  top?: T,
  right?: T,
  bottom?: T,
  left?: T,
  resolver: (v: T | undefined) => number | string | undefined = (v) =>
    v as unknown as number | string | undefined,
):
  | {
      top?: number | string;
      right?: number | string;
      bottom?: number | string;
      left?: number | string;
    }
  | undefined {
  let t = resolver(top);
  let r = resolver(right);
  let b = resolver(bottom);
  let l = resolver(left);

  if (shorthand !== undefined) {
    if (Array.isArray(shorthand)) {
      if (shorthand.length === 2) {
        const [vert, horiz] = shorthand as [T, T];
        t = t ?? resolver(vert);
        r = r ?? resolver(horiz);
        b = b ?? resolver(vert);
        l = l ?? resolver(horiz);
      } else if (shorthand.length === 3) {
        const [tVal, hVal, bVal] = shorthand as [T, T, T];
        t = t ?? resolver(tVal);
        r = r ?? resolver(hVal);
        b = b ?? resolver(bVal);
        l = l ?? resolver(hVal);
      } else if (shorthand.length === 4) {
        const [tVal, rVal, bVal, lVal] = shorthand as [T, T, T, T];
        t = t ?? resolver(tVal);
        r = r ?? resolver(rVal);
        b = b ?? resolver(bVal);
        l = l ?? resolver(lVal);
      }
    } else {
      const all = resolver(shorthand as T);
      t = t ?? all;
      r = r ?? all;
      b = b ?? all;
      l = l ?? all;
    }
  }

  if (t === undefined && r === undefined && b === undefined && l === undefined) return undefined;
  return { top: t, right: r, bottom: b, left: l };
}

/** Build padding/margin/border rect from BoxModelProps. */
export function buildLengthRect(
  shorthand: CssRect<CssLength> | undefined,
  top?: CssLength,
  right?: CssLength,
  bottom?: CssLength,
  left?: CssLength,
) {
  return resolveRect(shorthand, top, right, bottom, left, resolveLength);
}

export function buildLengthAutoRect(
  shorthand: CssRect<CssLengthAuto> | undefined,
  top?: CssLengthAuto,
  right?: CssLengthAuto,
  bottom?: CssLengthAuto,
  left?: CssLengthAuto,
) {
  return resolveRect(shorthand, top, right, bottom, left, resolveLengthAuto);
}

/** Resolve CssGridLine to WASM-compatible format. */
export function resolveGridLine(
  v: CssGridLine | undefined,
): number | string | [number | string, number | string] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v;
  return v; // number or string pass through
}
