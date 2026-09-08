/**
 * Mani — Hands: every tunable in one place.
 *
 * Units: world units at z = 0 unless a name says px / ms / deg. The camera is
 * set so the viewport is ~8.7 world units tall on any screen; widths follow the
 * aspect. Speeds are units per second, timings in milliseconds.
 */

/* ---- the prints (referenced in place, never copied) ------------------- */
// The tear is *about* these images: the taped portrait, the flash portraits,
// the collage / handwriting pieces, two of the black-and-white photographs.
export const PRINTS = [
  "/vortex/images/img_025.webp", // portrait covered with a strip of tape
  "/vortex/images/img_042.webp", // two figures, flash
  "/vortex/images/img_012.webp", // figure by the van, flash
  "/vortex/images/img_021.webp", // silhouettes in a dark room
  "/vortex/images/img_031.webp", // sleeper, with a handwritten line
  "/vortex/images/img_009.webp", // sheet and figure
  "/vortex/images/img_001.webp", // road with orange handwriting
  "/vortex/images/img_011.webp", // notes in red ink
  "/vortex/images/img_024.webp", // redacted page
  "/vortex/images/img_044.webp", // red stamp on paper
  "/vortex/images/img_050.webp", // collage
  "/vortex/images/img_029.webp", // figure with a white cut-out
  "/vortex/images/img_005.webp", // pole against the sky
  "/vortex/images/img_008.webp", // tree, photocopy
] as const;

/* ---- camera / renderer ------------------------------------------------ */
export const CAMERA_FOV_DEG = 40;
export const CAMERA_Z = 12;
export const DPR_RANGE: [number, number] = [1, 1.5];

/* ---- webcam + MediaPipe ---------------------------------------------- */
export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: 640,
  height: 480,
  facingMode: "user",
};
export const VIDEO_ASPECT = 4 / 3;
export const MEDIAPIPE_WASM = "/mediapipe/wasm";
export const HAND_MODEL = "/mediapipe/hand_landmarker.task";
/** Whole camera path (permission → model → first frame) must be up within this. */
export const INIT_TIMEOUT_MS = 8000;
/** After the model is up, the reticles get this long to find the hands. */
export const WARMUP_MS = 1000;
/** detectForVideo cadence (~30 Hz); the render loop is independent. */
export const DETECT_INTERVAL_MS = 33;
/**
 * The 4:3 frame is "cover"-mapped onto the viewport so a hand can reach every
 * corner; this gain stretches it a little further so the corners are reachable
 * without putting the hand at the very edge of the frame, where the landmarker
 * loses it. 1 = the pure cover map.
 */
export const REACH_GAIN = 1.15;

/* ---- smoothing --------------------------------------------------------- */
/** One-Euro filter on every tracked point (world units / s). */
export const FILTER_MIN_CUTOFF = 1.2;
export const FILTER_BETA = 0.6;
export const FILTER_D_CUTOFF = 1.0;
/** Velocity EMA time constant (s). */
export const VELOCITY_TAU_S = 0.06;
/** Render-side follow of the ~30 Hz sample (s); hides the detection stepping. */
export const RENDER_FOLLOW_TAU_S = 0.035;
/** A hand may vanish for this long before its hold is released. */
export const HAND_LOST_GRACE_MS = 250;

/* ---- gestures (relative to hand size s = |wrist − middle MCP|) --------- */
export const PINCH_ENTER = 0.3;
export const PINCH_EXIT = 0.42;
/** Consecutive detections the condition must hold — the anti-twitch. */
export const PINCH_ENTER_FRAMES = 2;
export const PINCH_EXIT_FRAMES = 3;
/** Nearest body within this × its half-diagonal of the hold point is claimed. */
export const HOLD_RADIUS_FACTOR = 1.2;
/** Critically damped follow, time constant in seconds (≈ one frame of lag). */
export const HOLD_LAG_S = 0.016;
/** Two hands on one card: tear when their distance exceeds this × the extent. */
export const TEAR_STRETCH = 1.35;
/** How far off-centre (fraction of the extent) the tear line may sit. */
export const TEAR_LINE_MAX_OFFSET = 0.3;
/** Rotation kick given to each half (rad / s) and its settled tilt (deg). */
export const TEAR_SPIN = 1.6;
export const TEAR_TILT_DEG = 4;
/** Keyboard / pointer-only tear: parting speed of the halves (units / s). */
export const TEAR_PART_SPEED = 1.1;
/** Torn halves dim and the print rejoins the drift, whole. */
export const REUNITE_MS = 12000;
export const FADE_MS = 1400;

/** Open palm: four tips farther from the wrist than their PIP, held this many frames. */
export const PALM_OPEN_FRAMES = 3;
/** Push: palm-centre speed (units / s) OR hand-size growth (fraction / s, the
 *  hand coming toward the camera) above threshold, with the palm open. */
export const PUSH_SPEED = 5.5;
export const PUSH_GROWTH_RATE = 1.4;
/** A hand must have been present this long before it may push (filter settle). */
export const PUSH_MIN_PRESENCE_MS = 350;
export const PUSH_COOLDOWN_MS = 600;
/** Radius of the wave as a fraction of the larger viewport dimension. */
export const PUSH_RADIUS_FRAC = 0.35;
export const PUSH_IMPULSE = 5.5;
export const PUSH_SPIN = 0.9;
/** The wave front takes this long to reach the radius. */
export const PUSH_WAVE_MS = 320;

/* ---- cards ------------------------------------------------------------ */
/** Card scale: side of a unit-area card = this × √(viewport area). */
export const CARD_SCALE = 0.155;
/** On portrait screens, never smaller than this × the short side (phones)… */
export const CARD_MIN_SCALE = 0.25;
/** …capped so all the prints together cover at most this share of the viewport. */
export const CARD_MAX_COVERAGE = 0.4;
export const CARD_MAX_ROTATION_DEG = 6;
/** Faint warm paper tint multiplied into the print. */
export const CARD_TINT: [number, number, number] = [0.94, 0.9, 0.84];
/** Darker edge, in screen pixels. */
export const CARD_EDGE_PX = 1;
/** Lighter fibrous strip along the torn edge, in screen pixels. */
export const TEAR_STRIP_PX = 3;
/** Amplitude of the tear's 1D noise curve (fraction of the card's short side). */
export const TEAR_NOISE_AMP = 0.045;
export const TEAR_NOISE_FREQ = 5.5;
/** z parallax: cards sit within ± this of z = 0. A held card rises to HELD_Z. */
export const Z_SPREAD = 0.5;
export const HELD_Z = 0.6;

/* ---- physics (fixed step) --------------------------------------------- */
export const PHYSICS_STEP_S = 1 / 120;
export const MAX_SUBSTEPS = 6;
/** Autonomous drift speed and how slowly its direction wanders. */
export const DRIFT_SPEED = 0.14;
export const DRIFT_WANDER_HZ = 0.05;
/** Velocity relaxes toward the drift at this rate (1 / s) — a throw settles in ~1.5 s. */
export const LINEAR_DAMPING = 1.0;
export const ANGULAR_DAMPING = 2.2;
/** Spring pulling each card back toward its rest tilt. */
export const ANGLE_SPRING = 4;
/** Soft walls: fraction of the body radius that must stay inside the viewport… */
export const WALL_INSET = 0.85;
/** New cards spawn this far inside the walls (fraction of the half-viewport). */
export const SPAWN_INSET = 0.86;
/** …and the spring pushing it back (1 / s²). */
export const WALL_STIFFNESS = 9;
/** Light card–card repulsion so they never stack. */
export const REPULSION_STIFFNESS = 3.2;
export const REPULSION_RANGE = 0.85;
/** Anything faster than this is clamped (units / s). */
export const MAX_SPEED = 30;

/* ---- keyboard --------------------------------------------------------- */
/** Arrow keys move a held card at this speed (fraction of viewport height / s). */
export const KEYBOARD_SPEED = 0.55;

/* ---- pointer ---------------------------------------------------------- */
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_PX = 28;

/* ---- HUD --------------------------------------------------------------- */
export const LEGEND_MS = 4000;
