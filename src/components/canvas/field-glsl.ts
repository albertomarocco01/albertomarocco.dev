/**
 * What every shader that paints the white field's orbs has to agree on: the
 * orb count, and the hash + look constants as one GLSL block. Compiled into the
 * field's own material (aura-material.ts) and into the /about figure's
 * (figure-material.ts), which repaints the field's near orbs over the cut-out
 * and has to match it exactly at the silhouette edge — shared text, so a
 * retune here can't desync the two.
 *
 * Its own module, with no three or drei in it, on purpose: importing a
 * constant from aura-material.ts made the figure's lazy chunk carry the whole
 * field material (and its `extend()`) just to share a number.
 */

// Number of soft orbs. Single source of truth: the JS physics sim (Aura.tsx)
// sizes its array from it, the published frame (field-state.ts) its buffer,
// and both shaders interpolate it into their `#define` and `u_blobs[]` length,
// so the loop bound and the uniform always match. Keep small — the loop runs
// per pixel. 14: dense enough to cover the field without dark gaps between
// orbs, while keeping regular visible collisions.
export const BLOB_COUNT = 14;

/**
 * BLOB_SIZE / BLOB_SOFT / FIELD_GAIN / FIELD_OPACITY are the u_blobSize /
 * u_soft / u_gain / u_opacity uniforms (live-tunable, bubble-params.ts); the
 * rest stay compile-time #defines — structural, not aesthetic knobs.
 */
export const FIELD_GLSL = /* glsl */ `
  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  #define DISP_STRENGTH 0.11   // cursor parallax max (fraction of normalized space)
  #define BLOB_DENOM_EPS 1e-4  // floor on the gaussian denominator so a degenerate (zero/NaN) orb radius can't divide-by-zero -> NaN field -> nothing paints. Far below any valid denom (min ~0.021), so it never affects real orbs.
  #define DEPTH_BASE 0.55      // per-orb parallax depth floor (each orb leans a touch differently for a hint of depth)
  #define DEPTH_VARY 0.9       // per-orb parallax depth spread added on top of DEPTH_BASE via the per-orb hash
  #define DIM_COLOR vec3(0.10, 0.11, 0.14) // gap/halo colour — just above the void (#0a0a0c ~ 0.04) so low-presence regions read true-dark, not a milky grey wash
  #define ORB_COLOR vec3(0.85, 0.87, 0.93) // orb core colour — cold white
  #define VIG_XSQUASH 0.45 // horizontal squash of the vignette ellipse. Small enough that wide-screen (16:9+) side orbs survive the falloff instead of being clipped to black, while portrait p.x is tiny either way → the mobile look is untouched. (was 0.8 — which killed every landscape side orb.)
  #define VIG_OUT 0.55     // vignette outer radius: vig = 0 beyond this (soft screen corners stay dark)
  #define VIG_IN  0.35     // vignette inner radius: vig = 1 within this (full-presence core over the hero)
`;
