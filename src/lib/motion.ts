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

// Interaction timings (seconds) — ported 1:1 from the prototype.
export const TIMING = {
  barHeight: 0.55,
  reveal: 0.85,
  intentOpen: 70, // ms — ignore quick sweeps
  intentClose: 150, // ms — grace before closing
} as const;
