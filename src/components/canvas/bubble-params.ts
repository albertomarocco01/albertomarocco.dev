/**
 * Live, tunable parameters for the ambient white bubble field.
 *
 * These used to be compile-time `#define`s in the shader and module consts in
 * Aura.tsx. They are lifted here into a single mutable singleton so a small dev
 * controller (BubbleControls.tsx) can tweak the look live while the in-canvas
 * Aura reads the latest values every frame — no React re-render of the canvas,
 * no prop threading. The amber/ember WORK reveals never read any of this (they
 * run the u_white = 0 branch), so this only ever touches the white field.
 *
 * Plumbing:
 *   • brightness → shader u_gain     (FIELD_GAIN: orb-core presence)
 *   • glow       → shader u_opacity  (FIELD_OPACITY: overall field opacity)
 *   • size       → shader u_blobSize (BLOB_SIZE: glow radius vs collision core)
 *   • softness   → shader u_soft     (BLOB_SOFT: gaussian softness)
 *   • speed      → JS physics target-speed multiplier (drift/collision pace)
 *
 * Persisted to localStorage so a tuning session survives reloads; the saved
 * values become the de-facto look until cleared (reset → back to DEFAULTS).
 */

export type BubbleParams = {
  /** physics velocity multiplier — 1 = the original drift; >1 livelier */
  speed: number;
  /** shader FIELD_GAIN — higher = orb cores saturate to a brighter cold-white */
  brightness: number;
  /** shader FIELD_OPACITY — overall opacity of the field (0 invisible … 1 full) */
  glow: number;
  /** shader BLOB_SIZE — visual glow radius as a multiple of the collision core */
  size: number;
  /** shader BLOB_SOFT — gaussian softness; higher = softer, more diffuse orbs */
  softness: number;
};

// Shipped defaults. Movement is a touch faster and the field a touch brighter
// than the first pass (the user asked for both); everything stays tunable below.
export const BUBBLE_DEFAULTS: BubbleParams = {
  speed: 1.35,
  brightness: 1.95,
  glow: 0.85,
  size: 1.3,
  softness: 0.85,
};

/** Slider metadata for the controller — order here is the display order. */
export const BUBBLE_CONTROLS: ReadonlyArray<{
  key: keyof BubbleParams;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "speed", label: "speed", min: 0.2, max: 3, step: 0.05 },
  { key: "brightness", label: "brightness", min: 0.4, max: 4, step: 0.05 },
  { key: "glow", label: "glow", min: 0.15, max: 1, step: 0.01 },
  { key: "size", label: "size", min: 0.6, max: 2.4, step: 0.05 },
  { key: "softness", label: "softness", min: 0.4, max: 1.6, step: 0.05 },
];

const STORAGE_KEY = "am.bubbles.v1";

function load(): BubbleParams {
  if (typeof window === "undefined") return { ...BUBBLE_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...BUBBLE_DEFAULTS };
    const saved = JSON.parse(raw) as Partial<BubbleParams>;
    // Merge over defaults so a new param added later still gets a sane value.
    return { ...BUBBLE_DEFAULTS, ...saved };
  } catch {
    return { ...BUBBLE_DEFAULTS };
  }
}

// The one live object. Reassigned (new identity) on every change so React
// subscribers can rely on referential inequality; the Aura just reads fields.
let current: BubbleParams = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* private mode / quota — tuning still works for the session */
  }
}

/** Read the current params (called every frame by Aura — keep it allocation-free). */
export function getBubbleParams(): BubbleParams {
  return current;
}

/** Set one param and notify subscribers. */
export function setBubbleParam(key: keyof BubbleParams, value: number) {
  if (current[key] === value) return;
  current = { ...current, [key]: value };
  persist();
  listeners.forEach((l) => l());
}

/** Restore the shipped defaults. */
export function resetBubbleParams() {
  current = { ...BUBBLE_DEFAULTS };
  persist();
  listeners.forEach((l) => l());
}

/** Subscribe to changes (for the controller UI). Returns an unsubscribe fn. */
export function subscribeBubbleParams(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
