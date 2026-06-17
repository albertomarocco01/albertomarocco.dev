import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

// The single signature easing — cubic-bezier(0.22, 1, 0.36, 1), slow and settling.
// Expressed as the SVG path CustomEase expects: M0,0 C<x1>,<y1> <x2>,<y2> 1,1
export const FIELD_EASE = "field";
export const FIELD_BEZIER = [0.22, 1, 0.36, 1] as const;

let registered = false;

/** Register GSAP plugins + the named easing exactly once (client-side). */
export function registerGsap() {
  if (registered) return;
  gsap.registerPlugin(CustomEase);
  if (!CustomEase.get(FIELD_EASE)) {
    CustomEase.create(FIELD_EASE, "M0,0 C0.22,1 0.36,1 1,1");
  }
  registered = true;
}

// The signature easing as a plain (t) => y function, for consumers that need a
// function rather than GSAP's CustomEase — e.g. Lenis `scrollTo`. Newton–Raphson
// with a bisection fallback, the same approach browsers use for CSS cubic-bezier.
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solveT = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-5) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const xv = sampleX(t);
      if (Math.abs(xv - x) < 1e-5) break;
      if (x > xv) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  };
}

/** The signature `cubic-bezier(0.22,1,0.36,1)` as a plain easing function. */
export const fieldEasing = cubicBezier(...FIELD_BEZIER);

/** Slow, harmonious in-page nav scroll — Lenis `scrollTo` duration in seconds. */
export const NAV_SCROLL_DURATION = 1.6;

// Interaction timings (seconds) — ported 1:1 from the prototype.
export const TIMING = {
  barHeight: 0.55,
  reveal: 0.85,
  intentOpen: 70, // ms — ignore quick sweeps
  intentClose: 150, // ms — grace before closing
} as const;
