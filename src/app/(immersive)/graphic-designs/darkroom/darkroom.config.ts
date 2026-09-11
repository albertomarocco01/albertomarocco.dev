/**
 * Camera Oscura — every tunable in one place.
 *
 * Units, unless stated otherwise:
 *  - lengths are fractions of the tray's SHORT side (so a radius reads the same
 *    on a phone and a monitor);
 *  - velocities are simulation texels per second (the velocity grid has square
 *    texels, so this is isotropic on screen);
 *  - times are seconds; dissipations are per fixed step (1/60 s).
 */

/** The twelve prints, in the order they come up in the tray (then it loops). */
export const PRINTS: readonly string[] = [
  "/vortex/images/img_025.webp", // portrait under tape
  "/vortex/images/img_009.webp", // unmade bed, flash
  "/vortex/images/img_005.webp", // pole against the sky
  "/vortex/images/img_042.webp", // two figures, grain
  "/vortex/images/img_031.webp", // sleeper, captioned
  "/vortex/images/img_008.webp", // tree silhouette
  "/vortex/images/img_012.webp", // hood and van, flash
  "/vortex/images/img_007.webp", // lattice over rooftops
  "/vortex/images/img_029.webp", // cut-out figure (alpha)
  "/vortex/images/img_006.webp", // pole and wires
  "/vortex/images/img_001.webp", // house under orange handwriting (alpha)
  "/vortex/images/img_039.webp", // courtyard, old print (alpha)
];

/** Stable fluids: grid sizes, solver, damping. */
export const SIM = {
  /** velocity grid, short side in texels (aspect-corrected → square texels) */
  velocityShort: 256,
  /** developer dye grid, short side in texels */
  dyeShort: 512,
  /** exposure buffer, LONG side cap in texels (display resolution below that) */
  exposureLong: 1024,
  /** fluid grids, LONG side cap in texels — an extreme aspect scales the whole
   *  grid down instead of asking the GPU for a texture it cannot make */
  gridLongMax: 2048,
  /** fixed timestep; long frames are sub-stepped up to `maxSubsteps` */
  dt: 1 / 60,
  maxSubsteps: 3,
  /** Jacobi iterations for the pressure solve */
  pressureIterations: 20,
  /** pressure warm start: last frame's field scaled by this before iterating */
  pressureCarry: 0.8,
  /** per-step multipliers — developer is viscous and slow */
  velocityDissipation: 0.995,
  dyeDissipation: 0.993,
  /** viscosity: per-step blend toward the four-neighbour mean (0 = water) */
  viscosity: 0.15,
  /** vorticity confinement — low on purpose: this is not smoke, and in a fluid
   *  this slow anything above a few units amplifies texel-scale curl */
  vorticity: 3,
} as const;

/** Pointer / touch injection. */
export const STIR = {
  /** velocity splat radius, fraction of the short side (brief: 3–4 %) */
  radius: 0.04,
  /** the developer laid down at the pointer is a little wider than the push, so
   *  a whole-tray sweep with hand-sized row spacing develops the rows between */
  dyeRadius: 0.095,
  /** velocity injected = pointer speed (texels/s) × this, before the clamp */
  velocityGain: 1.35,
  /** max injected velocity magnitude, texels/s */
  velocityMax: 420,
  /** dye per second at the splat centre = speed (texels/s) × this — the rate
   *  follows the speed so ONE PASS deposits the same amount however fast the
   *  hand moves (≈ 2 · radius · gain at the centre line) */
  dyeGain: 0.02,
  /** safety cap on that rate (the buffer clamps dye to 1 anyway) */
  dyeMax: 40,
  /** mousedown / touch doubles the injection */
  pressMultiplier: 2,
  /** the liquid under the pointer relaxes toward its velocity at this rate, 1/s */
  blendRate: 18,
  /** direct development under the pointer: a pass over the paper develops it
   *  whatever the flow does afterwards. Exposure per short-side unit of travel
   *  at the footprint's centre, its radius, and the cap per frame. */
  exposeGain: 4,
  exposeRadius: 0.075,
  exposeMax: 0.3,
} as const;

/** Dye laid down wherever the liquid itself is moving (the wake develops too). */
export const MOTION_DYE = {
  /** below speedLow the wake lays down nothing; full rate from speedHigh up (texels/s) —
   *  the band keeps gentle whole-tray motion (agitation, the current) from developing
   *  everything at once while the pointer's fast wake still develops */
  speedLow: 8,
  speedHigh: 200,
  /** dye per second at full rate */
  rate: 1.0,
} as const;

/** Space — agitate (rock the tray). */
export const AGITATE = {
  /** radial burst on the key press, texels/s² at the centre */
  burst: 500,
  /** burst decay time constant, s */
  burstDecay: 0.35,
  /** held: continuous gentle swirl, texels/s² */
  holdSwirl: 25,
  /** held: rocking sway, texels/s² */
  holdRock: 20,
  /** held: rocking period, s */
  rockPeriod: 3.6,
  /** a rocked tray develops evenly: developer laid down everywhere, per second held … */
  holdDye: 0.012,
  /** … and per press (scaled by the burst's decay) */
  burstDye: 0.008,
} as const;

/** Autonomous current — nothing is required to see something. */
export const AUTO = {
  /** seconds without input — on any print, touched or not — before the current
   *  starts (or resumes); the next input cancels it again. A print always
   *  finishes by itself once the visitor stops. */
  idleDelay: 6,
  /** strength relative to a natural stir when it starts (brief: ~20 %) … */
  strength: 0.15,
  /** … ramping to full over this many seconds of continued idleness, so any
   *  print finishes in bounded time once the visitor stops */
  rampTime: 36,
  /** direct development along the current's path (see STIR.exposeGain) */
  exposeGain: 1.5,
  exposeRadius: 0.08,
  /** the current orbits an ellipse on the print's extents, breathing between
   *  these fractions of them (1 = the print's edge) */
  orbitMin: 0.3,
  orbitMax: 0.95,
  /** one revolution, s */
  orbitPeriod: 9,
  /** breathing period, s */
  breathePeriod: 17,
  /** splat radius for the current, short-side fraction */
  radius: 0.07,
  /** velocity of the current at the splat, texels/s (before `strength`) */
  speed: 150,
  /** dye per second at the splat centre (before `strength`) */
  dye: 0.3,
} as const;

/** Development, fixing, draining. */
export const DEVELOP = {
  /** exposure += dye × rate × dt */
  rate: 1.6,
  /** coverage (mean exposure over the print) that fixes the print */
  fixThreshold: 0.85,
  /** the remainder eases to 1 over this many seconds */
  fixEase: 1.2,
  /** `fixed` holds this long before the tray drains */
  fixedHold: 2.5,
  /** the drain — black rising over the print */
  drain: 1.6,
  /** coverage is measured on the GPU every … seconds */
  coverageInterval: 0.25,
  /** … into an RGBA8 target of this many texels a side (16 taps each) */
  coverageSize: 32,
} as const;

/** Reduced motion / no half-float targets: the pointer paints exposure. */
export const BRUSH = {
  /** brush radius, short-side fraction */
  radius: 0.075,
  /** exposure per unit of pointer travel (short-side units) at the centre */
  gain: 2.2,
  /** cap per event */
  max: 0.28,
  /** Space paints the whole print evenly: exposure per press / per second held */
  spacePress: 0.09,
  spaceHold: 0.25,
} as const;

/** The look — composite pass. */
export const LOOK = {
  /** print margin inside the tray, fraction of each axis */
  printMargin: 0.04,
  /** refraction: UV offset = velocity × velTexel × this */
  refraction: 0.016,
  /** the slosh after a rock: a visual wobble of the refraction, UV amplitude, decay s, Hz */
  slosh: 0.006,
  sloshDecay: 1.2,
  sloshFreq: 2,
  /** specular whisper: additive cap (brief: ≤ 0.08) and the speed it saturates at */
  specular: 0.08,
  specularSpeed: 260,
  /** grain on developed areas, ± this (brief: ± 3 %) */
  grain: 0.03,
  /** paper texture in the paper-white, ± this */
  paperTexture: 0.02,
  /** paper white (linear reflectance) and its warm tint under the safelight */
  paperWhite: 0.9,
  /** safelight: peak alpha at the core (sRGB compositing) and the radius it dies at */
  safelightAlpha: 0.1,
  safelightRadius: 0.62,
  /** vignette depth at the corners */
  vignette: 0.28,
  /** developer dye darkening over the print (almost invisible) */
  dyeShade: 0.05,
  /** development curve — see composite shader */
  curve: {
    /** how fast the paper's brightness comes up: lift = 1 − (1 − e)^lift */
    lift: 1.6,
    /** soft knee from foggy/flat (kneeMin) to full contrast (kneeMax) */
    kneeMin: 0.22,
    kneeMax: 9,
    /** shadows come up last: Dmax = 1 − (1 − e)^dmax */
    dmax: 2.4,
  },
} as const;

/** Chrome timings mirrored from the CSS (kept here so JS and CSS agree). */
export const UI = {
  /** HUD publishes at most this often, s (phase changes publish immediately) */
  hudInterval: 0.12,
} as const;
