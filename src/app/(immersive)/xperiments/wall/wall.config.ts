/**
 * Parete — LED Wall: every tunable in one place.
 *
 * Units, unless stated otherwise:
 *  - lengths are METRES (1 world unit = 1 m — the room is true to scale);
 *  - angles are degrees in this file and converted where three wants radians;
 *  - times are seconds.
 *
 * The wall is a 6 × 3 m P2.6 cabinet wall on a 0.3 m riser, so its centre sits
 * at y = 0.3 + 1.5 = 1.8 m. Everything else in the room is measured from that.
 */

import type { AuraVariant } from "@/components/canvas/aura-material";

/** The physical panel: size, riser, and where its face sits in the room. */
export const WALL = {
  width: 6,
  height: 3,
  /** matte black riser the wall stands on */
  riserHeight: 0.3,
  riserDepth: 0.6,
  /** the riser overhangs the wall a little on each side */
  riserOverhang: 0.2,
  /** cabinet body behind the emissive face — the wall has depth, seen obliquely */
  bodyDepth: 0.16,
  /** the emissive face sits this far proud of the body, to avoid z-fighting */
  faceOffset: 0.002,
} as const;

/** Wall face centre height: riser + half the panel. */
export const WALL_CENTRE_Y = WALL.riserHeight + WALL.height / 2;

/**
 * The LED surface itself. `pitchMm` is the centre-to-centre spacing of the
 * lamps; everything below (pixel count, dot size, seam width) is derived from
 * it, so changing the pitch changes the whole surface consistently.
 */
export const LED = {
  /** pixel pitch, millimetres — P2.6 is the usual indoor-event choice at this size */
  pitchMm: 2.6,
  /** cabinet edge length, millimetres — 500 mm gives a 12 × 6 grid on 6 × 3 m */
  cabinetMm: 500,
  /** lit dot diameter as a fraction of the cell (0.7 = a 70 % fill factor) */
  fill: 0.7,
  /**
   * How hard the dot structure reads, 0 … 1. The lit/unlit levels below are
   * derived from it so the CELL AVERAGE stays 1 at any setting: the wall keeps
   * exactly the same brightness whether you can resolve the pixels or not.
   */
  contrast: 0.86,
  /** darkest point between dots at contrast 1 (a panel mask is not pure black) */
  offMin: 0.03,
  /** per-LED brightness spread, ± fraction — the sparkle of a real wall */
  jitter: 0.03,
  /** cabinet seam width, in pixel pitches */
  seamLeds: 1,
  /** how much a seam darkens the surface, 0 … 1 */
  seamDarken: 0.45,
  /**
   * The moiré guard. `cells` is how many LED cells fall inside one device
   * pixel; Nyquist is 0.5. The grid (and the per-cell sampling, and the
   * jitter) fades to a flat surface across this band, so it is fully gone
   * before it can alias — no moiré at any distance, at any angle.
   */
  resolveLo: 0.3,
  resolveHi: 0.46,
  /**
   * Emissive gain, applied in LINEAR light. Every step above 1 lifts the
   * shadows of the loop as well as its flares (a linear multiply, seen through
   * the sRGB encode, raises darks far more than highlights), so this is the one
   * number that decides whether the wall keeps the site's amber or washes out
   * into a beige haze. 1.35 is as bright as it goes before the smoke's body
   * stops reading as near-black.
   */
  intensity: 1.35,
  /** off-axis dimming, 0 = none, 1 = full cosine — LEDs lose output off-normal */
  angleFalloff: 0.3,
} as const;

/** Derived LED geometry — one source of truth for the shader and the HUD. */
export const LED_PIXELS: readonly [number, number] = [
  Math.floor((WALL.width * 1000) / LED.pitchMm),
  Math.floor((WALL.height * 1000) / LED.pitchMm),
];
export const LED_CABINETS: readonly [number, number] = [
  Math.round((WALL.width * 1000) / LED.cabinetMm),
  Math.round((WALL.height * 1000) / LED.cabinetMm),
];

/**
 * Lit/unlit levels for the dot mask, solved so that
 * `offFloor · (1 − coverage) + dotGain · coverage = 1`.
 * At `contrast` 0 both are 1 (a flat surface); at 1 the dots are as hard as a
 * real panel. Either way the average is unchanged, which is what keeps the
 * wall from brightening as you back away from it.
 */
const DOT_COVERAGE = (Math.PI * LED.fill * LED.fill) / 4;
export const LED_OFF_FLOOR = 1 + (LED.offMin - 1) * LED.contrast;
export const LED_DOT_GAIN = (1 - LED_OFF_FLOOR * (1 - DOT_COVERAGE)) / DOT_COVERAGE;

/**
 * The content: the site's own aura shader, rendered into a render target and
 * used as the wall's texture. `variants` is the switch order; the names are
 * the shared `VARIANT_PALETTE` keys and stay English in both locales.
 */
export const LOOP = {
  /** render-target size — 2:1, matching the wall */
  fboWidth: 1024,
  fboHeight: 512,
  /** the aura is soft and slow: 30 Hz into the target is plenty, and half the cost */
  throttleMs: 33,
  /** matches the site's own pace (Aura.tsx advances u_time by delta × 1) */
  timeScale: 1,
  /** crossfade between palettes when the loop changes */
  switchSeconds: 1.2,
  variants: ["amber", "ember", "teal", "violet"] as const satisfies readonly AuraVariant[],
} as const;

export type LoopVariant = (typeof LOOP.variants)[number];

/** The room around it — implied, never described. */
export const ROOM = {
  /** floor plane, metres square (large enough to run out of frame at max dolly) */
  floorSize: 60,
  /** the backdrop shell: a dark cylinder, unlit, only a gradient */
  backdropRadius: 26,
  backdropHeight: 18,
  /** near-black at the top, a touch lifted where the walls meet the floor */
  backdropTop: [0.0, 0.0, 0.004] as const,
  backdropBottom: [0.07, 0.07, 0.082] as const,
  /** how tightly the lift hugs the floor — below 1 it is a thin band, not a wash */
  backdropCurve: 0.4,
  /** 1.8 m matte figure for scale: a capsule and a sphere, off-centre, in front */
  figure: {
    /**
     * 1.5 m in front of the wall rather than the 3 m the brief suggests: at 3 m
     * the figure is nearer the camera than the panel is, and a 1.8 m person
     * then renders TALLER on screen than the 3 m wall — true perspective, and
     * the exact opposite of what a scale figure is for.
     */
    position: [2.8, 0, 1.5] as const,
    /** capsule: radius, straight length, and the centre height of its axis */
    radius: 0.135,
    length: 1.25,
    centreY: 0.81,
    headRadius: 0.115,
    headY: 1.685,
    color: "#111111",
    roughness: 0.92,
  },
  riserColor: "#08080a",
  bodyColor: "#0b0b0d",
  floorColor: "#7c7c80",
  floorRoughness: 0.86,
  /** a flat bounce so the reflector has something to modulate everywhere */
  ambient: 0.17,
  /** the wall as an area light — the only real source in the room */
  wallLight: {
    enabled: true,
    intensity: 3.6,
    /** the light sits just in front of the face so it does not self-shade */
    offset: 0.05,
  },
} as const;

/** drei MeshReflectorMaterial — the glow on the floor is the hero detail. */
export const REFLECTOR = {
  resolution: 512,
  /**
   * drei's blur is a TEXEL SIZE, so smaller numbers mean MORE blur. The
   * vertical figure is a third of the horizontal on purpose: a reflection in a
   * floor smears along the viewing direction, not across it.
   */
  blur: [400, 120] as [number, number],
  mixBlur: 0.85,
  /** the reflection is bright against a dark floor, so it carries most of the look */
  mixStrength: 9,
  /** how much of the floor is NOT reflection: 1 − mirror. Low base, high contrast. */
  mirror: 0.7,
  mixContrast: 1,
  /** a polished-concrete floor, not a mirror */
  roughness: 0.86,
  metalness: 0.32,
} as const;

/**
 * What the room drops to when WebGL is rasterised on the CPU (SwiftShader,
 * llvmpipe, WARP). Measured on SwiftShader, the full chain runs at 2.8 fps —
 * so the composer comes out, the reflector shrinks, the loop's clock stops and
 * the frameloop goes to demand: a still room that repaints when the visitor
 * moves. Everything still works, nothing is a slideshow.
 */
export const SOFTWARE = {
  reflectorResolution: 192,
  reflectorBlur: [140, 60] as [number, number],
  dpr: 1,
} as const;

/** @react-three/postprocessing — glow, not haze. */
export const BLOOM = {
  intensity: 0.75,
  /**
   * Far below the brief's 0.6, and it has to be. The aura is not an HDR image:
   * measured through `LED.intensity` 1.35, its flares peak at ~0.10 of linear
   * luminance and the body of the smoke sits at ~0.012. A 0.6 threshold would
   * never fire at all, and raising the intensity until it did would lift the
   * smoke's blacks into beige long before the flares reached 1. So the
   * threshold is set between the two measured levels instead: the flares glow,
   * the body does not — which is what "glow, not haze" actually asks for.
   */
  luminanceThreshold: 0.045,
  luminanceSmoothing: 0.12,
  mipmapBlur: true,
  /** SMAA instead of MSAA: the composer runs on a HalfFloat buffer at DPR 1.5 */
  smaa: true,
} as const;

/** Camera: three presets, damped orbit inside architectural limits. */
export const CAMERA = {
  fov: 45,
  near: 0.05,
  far: 120,
  /** standing eye height — every preset looks level, so verticals stay vertical */
  eye: 1.6,
  /** damping: slower when a preset flies, quicker under the hand */
  smoothTime: 0.6,
  draggingSmoothTime: 0.18,
  dollySpeed: 0.42,
  /** orbit limits, degrees: polar from +Y, azimuth from the wall normal */
  minPolar: 70,
  maxPolar: 100,
  azimuthLimit: 60,
  minDistance: 0.6,
  /**
   * 14, not the brief's 12: a narrow viewport (a phone held upright) has to
   * back further off before the whole 6 m wall is inside a 45° frame — see
   * `fitAspect` and `CameraRig`.
   */
  maxDistance: 14,
  /**
   * The aspect the preset distances below were framed for. Anything narrower
   * pushes the two wide presets back in proportion, so the wall is composed
   * rather than cropped; anything wider is left alone.
   */
  fitAspect: 1.6,
  /** idle drift: starts after this long without input … */
  idleSeconds: 8,
  /** … then breathes ± this many degrees of azimuth over `driftPeriod` seconds */
  driftDegrees: 4,
  driftPeriod: 20,
  /** a third of that on the polar axis, on a longer beat, so it never loops visibly */
  driftPolarRatio: 0.3,
  driftPolarPeriod: 31,
  /** how long the drift takes to reach full amplitude once it starts */
  driftEase: 4,
} as const;

/**
 * The three presets. `position` / `target` are metres; the target sits at eye
 * height for the two wide views (a level, architectural gaze) and on the
 * lower-left quadrant of the panel for the close one, where the pitch reads.
 */
export interface CameraPreset {
  readonly id: "front" | "oblique" | "close";
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  /** whether the distance is stretched to fit a narrower viewport */
  readonly fit: boolean;
}

/**
 * Negative — the oblique view stands to the LEFT of the wall's normal, so the
 * scale figure (which stands right of centre) is on the far side of the room
 * from the camera. From the right it would be closer to the lens than the wall
 * is, and a 1.8 m person would fill the frame.
 */
const OBLIQUE_DEG = -35;
/**
 * 6.5 m, not the brief's 5. At 5 m and 35° the near corner of the wall falls
 * outside a 45° frame — the panel is cropped on the right and the riser runs
 * off the bottom, which reads as a viewer rather than as a rendering. 6.5 m is
 * the nearest distance that holds the whole 6 × 3 m wall, its riser and a
 * stretch of reflected floor inside the frame.
 */
const OBLIQUE_R = 6.5;

export const PRESETS: readonly CameraPreset[] = [
  {
    id: "front",
    position: [0, CAMERA.eye, 7],
    target: [0, CAMERA.eye, 0],
    fit: true,
  },
  {
    id: "oblique",
    position: [
      OBLIQUE_R * Math.sin((OBLIQUE_DEG * Math.PI) / 180),
      CAMERA.eye,
      OBLIQUE_R * Math.cos((OBLIQUE_DEG * Math.PI) / 180),
    ],
    target: [0, CAMERA.eye, 0],
    fit: true,
  },
  {
    id: "close",
    position: [-WALL.width / 4, WALL.riserHeight + WALL.height / 4, 0.9],
    target: [-WALL.width / 4, WALL.riserHeight + WALL.height / 4, 0],
    // never stretched: this view is about the pitch, not about the composition
    fit: false,
  },
];

/** HUD cadence: the distance readout is a spec, not an animation. */
export const HUD = {
  /** and how much it has to move before it is rewritten, metres */
  distanceEpsilon: 0.05,
} as const;
