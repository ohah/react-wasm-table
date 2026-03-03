/** CSS timing function names supported by canvas animations. */
export type TimingFunction = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";

// ── Cubic-bezier solver ────────────────────────────────────────────────

/** Cubic-bezier control points for each named timing function. */
const PRESETS: Record<TimingFunction, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/** Evaluate x(t) for cubic-bezier with control points (x1, x2). */
function sampleCurveX(x1: number, x2: number, t: number): number {
  // Horner form of (1 - 3*x2 + 3*x1)*t^3 + (3*x2 - 6*x1)*t^2 + 3*x1*t
  return (((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t + 3 * x1) * t;
}

/** Evaluate y(t) for cubic-bezier with control points (y1, y2). */
function sampleCurveY(y1: number, y2: number, t: number): number {
  return (((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t + 3 * y1) * t;
}

/** Derivative dx/dt for Newton–Raphson. */
function sampleCurveDerivativeX(x1: number, x2: number, t: number): number {
  return (3 * (1 - 3 * x2 + 3 * x1) * t + 2 * (3 * x2 - 6 * x1)) * t + 3 * x1;
}

/** Solve for t given x using Newton–Raphson with bisection fallback. */
function solveCurveX(x1: number, x2: number, x: number): number {
  // Newton–Raphson (fast for most cases)
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = sampleCurveX(x1, x2, t) - x;
    if (Math.abs(err) < 1e-6) return t;
    const d = sampleCurveDerivativeX(x1, x2, t);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }

  // Bisection fallback
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 20; i++) {
    const xEst = sampleCurveX(x1, x2, t);
    if (Math.abs(xEst - x) < 1e-6) return t;
    if (x > xEst) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return t;
}

/**
 * Evaluate a CSS timing function at progress `p` (0..1).
 * Returns eased value in 0..1.
 */
export function evaluateTimingFunction(name: TimingFunction, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (name === "linear") return p;
  const [x1, y1, x2, y2] = PRESETS[name];
  const t = solveCurveX(x1, x2, p);
  return sampleCurveY(y1, y2, t);
}

// ── Color interpolation ─────────────────────────────────────────────────

/** Parse a hex color (#RGB or #RRGGBB) into [r, g, b]. */
export function parseHex(hex: string): [number, number, number] {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  if (h.length === 3) {
    return [parseInt(h[0]! + h[0]!, 16), parseInt(h[1]! + h[1]!, 16), parseInt(h[2]! + h[2]!, 16)];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Linearly interpolate between two hex colors at ratio t (0..1). Returns hex string. */
export function lerpColor(from: string, to: string, t: number): string {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const [r1, g1, b1] = parseHex(from);
  const [r2, g2, b2] = parseHex(to);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
