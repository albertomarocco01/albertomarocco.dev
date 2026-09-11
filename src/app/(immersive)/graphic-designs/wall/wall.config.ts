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
  /**
   * Depth of one die-cast cabinet, front face to rear lip. The wall's body is
   * 72 of these (see `BACK`), so this is also how far the back of the wall
   * sits behind the emissive face.
   */
  bodyDepth: 0.12,
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

/** Derived LED geometry — one source of truth for the shader, the back and the HUD. */
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

/**
 * The room around it — a dark, endless ground and nothing else. There are no
 * walls: the floor runs out past the camera's far plane and everything on it
 * fades to black with distance, so the wall is the only object in the world.
 */
export const ROOM = {
  /** floor plane, metres square — far past `CAMERA.far`, so it never shows an edge */
  floorSize: 400,
  /**
   * Linear fog to black, metres from the camera. Nothing inside `near` is
   * touched — every preset stands closer than that to the wall, so the pool of
   * light keeps its character — and the ground is fully black by `far`. The
   * wall's own materials are custom shaders and stay out of it on purpose.
   */
  fog: { near: 10, far: 40 },
  riserColor: "#08080a",
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
  /**
   * A service light for the back: a second area light of the wall's size,
   * standing this far behind it and shining at the cabinet backs, at this
   * fraction of the front light. Tinted by the loop like the front one, so the
   * back reads as the same room — readable, never bright.
   */
  backLight: {
    ratio: 0.6,
    distance: 2.4,
  },
} as const;

/**
 * The back of the wall — the physical details a client asks about, all driven
 * by `LED_CABINETS` so they stay consistent with the front. Metres.
 */
export const BACK = {
  /** air between neighbouring cabinets */
  gap: 0.004,
  /** the rear lip: a frame standing proud of the cabinet back, this deep and this wide */
  lipDepth: 0.012,
  lipWidth: 0.03,
  /** power + data connector block, lower-right of each cabinet back; offset from the cabinet centre */
  connector: { size: [0.06, 0.032, 0.03] as const, offset: [0.17, -0.19] as const },
  /** handle recess, upper centre */
  handle: { size: [0.11, 0.022, 0.004] as const, offset: [0, 0.2] as const },
  /** cabling: a power and a data lead daisy-chained along each row, then one loom per row to the riser */
  cable: {
    powerRadius: 0.0045,
    dataRadius: 0.0028,
    /** how far a lead droops between two connectors, 500 mm apart */
    sag: 0.05,
    /** the data lead runs this much above the power lead */
    dataLift: 0.022,
    loomRadius: 0.0065,
    /** the six looms descend side by side, this far apart */
    loomSpacing: 0.014,
  },
  /** ground support: square-section uprights behind the wall with outriggers to the floor */
  support: {
    count: 4,
    section: 0.05,
    height: 3.4,
    /** how far behind the face the uprights stand */
    standoff: 0.5,
    /** outriggers leave the upright at this height and reach this far back on the floor */
    outriggerFrom: 2.3,
    outriggerReach: 1.6,
    outriggerSection: 0.04,
    /** two horizontal rails the cabinets hang from */
    railY: [0.55, 3.05] as const,
    railSection: 0.04,
    foot: [0.2, 0.012, 0.2] as const,
    /** a bracket bolting each upright to the riser */
    bracket: [0.06, 0.12, 0.1] as const,
  },
  /** the processor: a 2U case on the floor behind the riser, on the right, where the looms end; one amber pilot light on its back */
  processor: {
    size: [0.44, 0.09, 0.32] as const,
    x: 2.55,
    z: -0.56,
    pilot: [0.007, 0.007, 0.002] as const,
  },
  /**
   * Die-cast aluminium greys, a few stops above the front body's `#0b0b0d`: the
   * back is lit at a fraction of the front, and a near-black albedo under a
   * dim light is simply black. These read as dark metal under the service light.
   */
  colors: {
    cabinet: "#1c1c20",
    lip: "#34343a",
    connector: "#2a2a30",
    handle: "#08080a",
    cable: "#0a0a0b",
    support: "#26262b",
    processor: "#16161a",
    /** the site's amber, as a lit LED (above 1: it blooms a little) */
    pilot: [1.4, 0.82, 0.4] as const,
  },
  /** dark aluminium: matte, but metal */
  roughness: 0.72,
  metalness: 0.5,
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

/** Camera: four presets, a damped orbit that goes all the way round, and a walk. */
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
  /** orbit limits, degrees: polar from +Y; the azimuth is free — walk right round */
  minPolar: 55,
  maxPolar: 100,
  azimuthLimit: Infinity,
  minDistance: 0.6,
  maxDistance: 20,
  /**
   * The eye never goes below this height. At 20 m a 100° polar angle would put
   * the camera under the floor, so the polar limit tightens with distance to
   * keep this much clearance — see `CameraRig`.
   */
  floorClearance: 0.3,
  /** the keyboard walk: `a` / `d` orbit at this many degrees per second … */
  walkDegrees: 40,
  /** … and `w` / `s` dolly at this fraction of the current distance per second */
  walkRate: 0.7,
  /**
   * The aspect the preset distances below were framed for. Anything narrower
   * pushes the wide presets back in proportion, so the wall is composed
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
 * The four presets. `position` / `target` are metres; the target sits at eye
 * height for the three wide views (a level, architectural gaze) and on the
 * lower-left quadrant of the panel for the close one, where the pitch reads.
 */
export interface CameraPreset {
  readonly id: "front" | "oblique" | "close" | "back";
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  /** whether the distance is stretched to fit a narrower viewport */
  readonly fit: boolean;
}

/** The oblique stands to the right of the wall's normal, as the brief had it. */
const OBLIQUE_DEG = 35;
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
  {
    // the service view: 6 m behind the wall, level, looking at its centre
    id: "back",
    position: [0, CAMERA.eye, -6],
    target: [0, CAMERA.eye, 0],
    fit: true,
  },
];

/** HUD cadence: the distance readout is a spec, not an animation. */
export const HUD = {
  /** and how much it has to move before it is rewritten, metres */
  distanceEpsilon: 0.05,
} as const;
