# 02 — Mani (Hands) · `/xperiments/hands`

Read `00-shared-rules.md` first; everything there applies. Your folder:
`src/app/(immersive)/xperiments/hands/`. Your assets: `public/hands/`.

## The piece, in one paragraph

The webcam reads the visitor's hands; the camera feed is never shown. In the
dark, a slow drift of prints from the archive — thin paper cards — floats in
space. Two small mono reticles follow the index fingertips. Pinch near a card
and you hold it; move, and it comes with you; let go, and it drifts on with the
velocity you gave it. Hold one card with both hands and pull apart: it tears
along a fibrous edge and the two halves float off separately. An open palm
pushed toward the screen sends a wave that scatters the nearby cards. After a
while the torn halves dim and the print quietly rejoins the drift, whole. That
is the whole vocabulary: **hold, tear, push**.

## What it must prove

Installation-grade interaction from computer vision in the browser: robust
gesture detection, smoothing, coordinate mapping, and a physical scene that
answers the hand within a frame. This is the piece for clients who want a
camera-driven installation — it has to feel *certain*, never twitchy.

## Art direction

- **Space.** `#000` → `#0a0a0c`, no floor, no room, no fog. 12–16 prints as
  unlit paper cards (`meshBasicMaterial` — the print *is* the light), a faint
  warm paper tint, a 1 px darker edge suggesting thickness. They drift slowly
  in a bounded volume a little larger than the viewport at z = 0, soft walls,
  gentle rotation (≤ 6°), slight z parallax (± 0.5 units). Not 3D-showy.
- **Reticles.** Per detected hand, a 10 px ring at the index tip, `--ink-dim`,
  1 px; it contracts and turns `--ink` while pinching. That is the only
  feedback. No skeleton, no video. A debug skeleton overlay toggles with `d`
  (development only, off by default).
- **The tear.** A lighter, fibrous strip (2–4 px) along the torn edge on both
  halves; the tear line is a 1D noise curve. Sell it with that highlight and a
  small rotation kick, nothing more.
- **HUD**, mono lowercase, `--ink-dim`: a bottom-centre legend for 4 s after
  the gate and on `?`: `pinch to hold · two hands to tear · open palm to push`.
  Exit link top-left. Title cover (`Mani` serif / `hands` mono) on the gate
  only.

## Gate and fallbacks

- **Gate** mirrors Tarassaco's `GateScene`: click to enable the camera —
  `getUserMedia` **first, inside the click** (iOS is strict about the gesture
  window), `{ video: { width: 640, height: 480, facingMode: "user" } }`, no
  audio — with the privacy line: the camera is processed locally, nothing is
  recorded, stored or sent. Then MediaPipe init, then a 1 s warm-up while the
  reticles find the hands. The route already has `Permissions-Policy:
  camera=(self)` in `next.config.ts`.
- **Denied / no camera / init timeout (8 s) / `navigator.mediaDevices`
  missing** → **pointer mode**, never a dead gate. Mouse or touch = one hand;
  press-and-hold = pinch; Shift + drag (two-finger spread on touch) = tear;
  double-click / double-tap = push. The gate offers pointer mode explicitly too
  (`or use the pointer`).
- **Keyboard.** Tab cycles the focused card, Space holds / releases, T tears
  the held card, P pushes from the centre, Escape exits.
- **Reduced motion.** No drift, no autonomous rotation — cards rest until
  moved.
- **No WebGL / context lost** → message + exit, as `VortexScene.jsx`.

## Technical plan

- **MediaPipe.** `FilesetResolver.forVisionTasks("/mediapipe/wasm")`, then
  `HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath:
  "/mediapipe/hand_landmarker.task", delegate: "GPU" }, runningMode: "VIDEO",
  numHands: 2 })`. The model is already in `public/mediapipe/` (float16,
  Apache-2.0, from Google's model store). Mirror `useWindPhysics.ts` for the
  init, the console-noise filter (add `hand_landmarker_graph`) and the
  teardown: `close()` the task, stop every track, cancel the rAF, guard with
  `isMounted`. Version pinned: `@mediapipe/tasks-vision@1.0.1`.
- **Detection loop.** A rAF calling `detectForVideo(video, now)` only when
  `video.currentTime` has advanced, throttled to ~30 Hz; results go into a
  ref; the R3F `useFrame` reads the ref. No React state per frame.
- **Landmarks → world.** Mirror x (selfie). "Cover"-map the 4:3 frame onto the
  viewport aspect so a hand can reach every corner. Then world at z = 0 via
  `viewport.getCurrentViewport(camera, [0, 0, 0])`. Smooth tip positions with
  a One-Euro filter (or an EMA with velocity-adaptive alpha); derive hand
  velocity from the smoothed positions. Ignore landmark z.
- **Gestures** — all thresholds relative to hand size
  `s = |wrist(0) − middle MCP(9)|`, all with hysteresis:
  - *pinch*: `|thumb tip(4) − index tip(8)| < 0.30·s` to enter, `> 0.42·s` to
    leave; hold point = their midpoint.
  - *hold*: on pinch-enter, the nearest card within 1.2 × its half-diagonal of
    the hold point becomes held by that hand (one card per hand). Held, the
    card follows with a critically damped spring (≈ one frame of lag) and
    inherits the hand's velocity on release.
  - *tear*: both hands holding the **same** card (a second pinch-enter on a
    held card claims it too) and the distance between the hold points
    exceeding 1.35 × the card's extent along the pull axis → tear on the axis
    perpendicular to the pull, at the midpoint. Each half becomes an
    independent body, held by its hand until released.
  - *push*: four fingers extended (each tip farther from the wrist than its
    PIP joint), palm-centre speed above a threshold → radial impulse from the
    palm centre, radius ≈ 35 % of the viewport, smooth falloff, 600 ms
    cooldown.
- **Cards.** Plain meshes are fine at 16. Each card is **two half-meshes with
  complementary alpha masks** (`step(noiseLine(v), u)` and its complement) so
  the intact card shows no seam and tearing costs no geometry — only separate
  transforms. Torn halves reunite after ~12 s: fade out, respawn whole at a
  free spot. Pick the taped portraits and collage pieces from the archive;
  the tear is *about* those images.
- **Physics.** Velocity + angular velocity, damping, soft-wall spring at the
  bounds, an optional light card–card repulsion so they never stack. Fixed
  step.
- **Video element.** Kept 1 px and off-screen, `playsInline`, `muted`
  (`display: none` can stall decoding in some browsers).
- **Config.** `hands.config.ts`: thresholds, spring constants, bounds, counts,
  timings, print list.
- **Disposal** on unmount: task, tracks, rAF, textures, geometries, materials.
  The camera light must go off within a second of leaving.

## Copy to write (`copy.ts`, EN + IT)

`metaTitle` "Mani — Hands"; `metaDescription`; `aria`; `exit`; `enable`
(`enable the camera`); `pointerMode` (`or use the pointer`); `initializing`;
`privacy`; `legend`; `keyboardHint`; errors (`denied`, `timeout`,
`unsupported`, a body and a button); `noWebgl`; `contextLost`. Remove `wip`.

## Cover

One card held, one torn, both reticles visible → `public/hands/cover.webp`,
800 × 1000, < 120 KB.

## Done when

The shared verification passes; with the real webcam at arm's length in
normal room light, pinch-hold is reliable and does not flicker; a tear happens
on purpose and never by accident; push has its cooldown; pointer mode and
keyboard mode do everything; a denied permission never strands the visitor;
the camera light goes off within a second of exit; the report is in
`reference/briefs/reports/hands.md`.
