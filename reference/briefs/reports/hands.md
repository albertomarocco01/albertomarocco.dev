# Report — 02 · Mani (Hands) · `/xperiments/hands`

Built 2026-09-07 by the `hands` build session. Files only under
`src/app/(immersive)/xperiments/hands/**`, `public/hands/cover.webp` and this
report. No shared file was touched; nothing was installed; no git; no build.

## What was built

The webcam reads the visitor's hands (MediaPipe HandLandmarker, self-hosted
wasm + float16 model from `/public/mediapipe`, never shown). Fourteen prints
from the archive drift as unlit paper cards in a bounded volume at z = 0. Two
10 px mono reticles follow the index tips and contract to `--ink` while
pinching. The vocabulary is exactly **hold, tear, push**:

- **hold** — pinch (thumb tip to index tip < 0.30 × hand size, leave at 0.42,
  two / three consecutive detections) within 1.2 × a card's half-diagonal:
  the card follows a critically damped spring (16 ms lag), rises slightly in
  z, and leaves with the hand's velocity on release.
- **tear** — a second pinch on a held card claims it too; the card then turns
  with the axis between the hands. When the hands are 1.35 × the card's
  extent along the pull apart, it tears on the perpendicular through the
  midpoint of the two hold points, along a 1D-noise curve. Each half is an
  independent body (its own centroid, radius and outline) held by its hand,
  with a lighter fibrous strip on the cut, a small opposite spin and a 4°
  settled tilt. After 12 s unheld the halves dim over 1.4 s and the print
  respawns whole at a free spot.
- **push** — four fingers extended (each tip farther from the wrist than its
  PIP, 3 frames) and the palm centre faster than 5.5 u/s **or** the hand
  growing toward the camera faster than 1.4 /s → a wave front expands to 35 %
  of the viewport over 320 ms and gives every unheld card it crosses a radial
  impulse with a smooth falloff plus a little spin. 600 ms cooldown, and a
  hand must have been present 350 ms first (filter settling never reads as a
  swipe).

Every card is two half-meshes on one geometry and one texture, cut by
complementary masks on the same noise curve: intact, a hard `step` (they tile
exactly, no seam); torn, a 1 px soft alpha and the strip. Tearing costs no
geometry — only separate transforms.

**Gate.** Veil over the drifting prints, title cover (`Mani` serif / `hands`
mono), `enable the camera`, `or use the pointer`, the privacy line.
`getUserMedia` runs synchronously inside the click; the model loads in
parallel (it needs no stream), so the wait is the longer of the two. After the
grant, video + model + first frame must be up within 8 s; then a 1 s warm-up
while the reticles find the hands. The 8 s budget is armed only after the
grant, so a permission prompt left open never times out — deliberate: the
pointer button stays live throughout, so an ignored prompt never strands
anyone.

**Fallbacks.** Any `getUserMedia` rejection (denied, no device, busy, aborted,
insecure origin) / a track ending mid-run / timeout / `mediaDevices` missing /
the model failing to load → a dialog (`the camera isn't available` /
`isn't responding` / `this browser can't read the camera`, body,
`continue with the pointer`, and `try the camera again` unless unsupported)
over the gate, whose camera button is live again. No WebGL2 (three 0.185
creates WebGL2 only; the probe context is released) → message + exit link. `webglcontextlost` → message + exit.
`prefers-reduced-motion` → no drift, no autonomous rotation, no breathing dot,
cuts instead of fades; everything still works. Render only while the tab is
visible (`frameloop="never"` when hidden; the detection loop also skips).

**Pointer mode.** Mouse or touch = one hand; press-and-hold = pinch; hover
moves the reticle. Shift while holding plants a still second hand under the
pointer — drag away and the card tears. Two fingers on a card, spread = tear.
Double-click / double-tap = push (a second finger landing next to the first is
never read as a tap). **Keyboard**, always armed while running: Tab /
Shift+Tab cycle a focus ring (hairline `--ink-dim` outline; past the last
print Tab leaves the stage so the exit link stays reachable), Space holds /
releases, arrows move a held print, T tears it (across its long axis, halves
part), P pushes from the centre, `?` shows the legend + key hint, Escape exits
(also from the gate). A visually hidden live region announces
`print n of total · held / released / torn / pushed` on the keyboard path.
`d` toggles a development-only landmark skeleton overlay (never in
production).

**HUD.** Legend bottom-centre for 4 s after the gate and on `?`, worded per
device (`pinch to hold · two hands to tear · open palm to push` / the pointer
line / the touch line), over a soft dark pool so a drifting print cannot take
the words; on phones it breaks only at the separators.

**Disposal** on unmount: rAF, task (`close()`), every track, the video
element, the console patch, all textures / geometries / materials / outline
geometries; the canvas is R3F's and goes with it. Headless proof: the track
reads `ended` and no `<video>` is left ~1 s after Escape.

## File map

```
src/app/(immersive)/xperiments/hands/
  page.tsx                 unchanged (server, metadata, canonical)
  client.tsx               unchanged (ssr:false boundary, .hands scope)
  App.tsx                  phase machine: gate → starting → running; mode camera|pointer;
                           error dialog, legend, SR live region, exit; wires the three sources
  copy.ts                  every visitor-facing string, EN + IT, typed once
  hands.config.ts          every tunable (see below)
  hands.css                scoped styles: stage, reticles, gate, legend, error, focus, RM
  components/
    HandsScene.tsx         WebGL detection, <Canvas>, context-lost message, the frame loop
                           (landmarks → world samples → trackers → world; reticle DOM writes)
    Gate.tsx               the gate overlay
    Reticles.tsx           the two rings (DOM, positioned per frame)
    DebugSkeleton.tsx      dev-only landmark overlay (`d`)
  hooks/
    useHandTracker.ts      camera source: getUserMedia in the click, model in parallel,
                           30 Hz detectForVideo loop, slot assignment, console-noise filter, teardown
    usePointerHands.ts     pointer / touch source (hold, shift-anchor tear, two-finger tear, double-tap)
    useKeyboardHands.ts    keyboard commands → the bus (Tab logic, arrows, T, P, ?, Esc, d)
  engine/                  no React in here
    input.ts               HandsInput — the one mutable bus every source writes and the loop reads
    oneEuro.ts             One-Euro filter (scalar + 2D)
    hand.ts                HandTracker: smoothing, velocity, pinch/palm hysteresis, push edge
    geometry.ts            half-plane clip of a rectangle, centroid, radius, extent-along-axis
    cardMaterial.ts        the card ShaderMaterial (tear mask, edge, fibrous strip, tint)
    world.ts               cards, bodies, hold / claim / release, tear, reunite, waves,
                           fixed-step physics (drift, walls, repulsion, tilt), keyboard hand, focus
public/hands/cover.webp    800 × 1000, 4:5, ~48 KB, a real capture (one held, one torn, reticles)
```

`engine/` is the one addition to the folder convention (pure modules, no
JSX); everything at the top level is the scaffolded set.

## Tunables — all in `hands.config.ts`

| name | what |
|---|---|
| `PRINTS` | the 14 archive prints, in place (`/vortex/images/img_0NN.webp`) |
| `CAMERA_FOV_DEG`, `CAMERA_Z` | 40°, z 12 → viewport ≈ 8.7 world units tall |
| `DPR_RANGE` | [1, 1.5] |
| `VIDEO_CONSTRAINTS`, `VIDEO_ASPECT` | 640 × 480 user-facing, 4:3 |
| `MEDIAPIPE_WASM`, `HAND_MODEL` | `/mediapipe/wasm`, `/mediapipe/hand_landmarker.task` |
| `INIT_TIMEOUT_MS` | 8000 — after the grant: video + model + first frame |
| `WARMUP_MS` | 1000 |
| `DETECT_INTERVAL_MS` | 33 (~30 Hz `detectForVideo`, only on a new video frame) |
| `REACH_GAIN` | 1.15 — stretch on the cover map so corners need no edge-of-frame hand (1 = pure cover) |
| `FILTER_MIN_CUTOFF`, `FILTER_BETA`, `FILTER_D_CUTOFF` | One-Euro: 1.2 Hz, 0.6, 1.0 |
| `VELOCITY_TAU_S` | 0.06 — velocity EMA |
| `RENDER_FOLLOW_TAU_S` | 0.035 — render-side follow of the 30 Hz sample |
| `HAND_LOST_GRACE_MS` | 250 — a hand may vanish this long before its hold drops |
| `PINCH_ENTER`, `PINCH_EXIT` | 0.30 / 0.42 × hand size |
| `PINCH_ENTER_FRAMES`, `PINCH_EXIT_FRAMES` | 2 / 3 consecutive detections |
| `HOLD_RADIUS_FACTOR` | 1.2 × half-diagonal |
| `HOLD_LAG_S` | 0.016 — held-card spring time constant |
| `TEAR_STRETCH` | 1.35 × extent along the pull |
| `TEAR_LINE_MAX_OFFSET` | 0.3 — how far off-centre the line may sit |
| `TEAR_SPIN`, `TEAR_TILT_DEG` | 1.6 rad/s kick, 4° settled tilt |
| `TEAR_PART_SPEED` | 1.1 u/s — keyboard tear parting |
| `REUNITE_MS`, `FADE_MS` | 12000, 1400 |
| `PALM_OPEN_FRAMES` | 3 |
| `PUSH_SPEED`, `PUSH_GROWTH_RATE` | 5.5 u/s palm speed, 1.4 /s hand-size growth (toward the camera) |
| `PUSH_MIN_PRESENCE_MS`, `PUSH_COOLDOWN_MS` | 350, 600 |
| `PUSH_RADIUS_FRAC`, `PUSH_IMPULSE`, `PUSH_SPIN`, `PUSH_WAVE_MS` | 0.35 of the larger viewport side, 5.5, 0.9, 320 |
| `CARD_SCALE` | 0.155 × √(viewport area) = side of a unit-area card |
| `CARD_MIN_SCALE`, `CARD_MAX_COVERAGE` | portrait floor 0.25 × short side; cap so all prints ≤ 40 % of the area |
| `CARD_MAX_ROTATION_DEG` | 6 |
| `CARD_TINT` | [0.94, 0.90, 0.84] — faint warm paper |
| `CARD_EDGE_PX`, `TEAR_STRIP_PX` | 1 px darker edge, 3 px fibrous strip |
| `TEAR_NOISE_AMP`, `TEAR_NOISE_FREQ` | 0.045 of the short side, 5.5 |
| `Z_SPREAD`, `HELD_Z` | ± 0.5, held card at 0.6 |
| `PHYSICS_STEP_S`, `MAX_SUBSTEPS` | 1/120, 6 |
| `DRIFT_SPEED`, `DRIFT_WANDER_HZ` | 0.14 u/s, 0.05 Hz |
| `LINEAR_DAMPING`, `ANGULAR_DAMPING`, `ANGLE_SPRING` | 1.0, 2.2, 4 |
| `WALL_INSET`, `SPAWN_INSET`, `WALL_STIFFNESS` | 0.85 of the radius kept inside, spawn 0.86 of the half-viewport, 9 (critically damped) |
| `REPULSION_STIFFNESS`, `REPULSION_RANGE` | 3.2, 0.85 × (rᵢ + rⱼ) |
| `MAX_SPEED` | 30 u/s |
| `KEYBOARD_SPEED` | 0.55 of the viewport height / s |
| `DOUBLE_TAP_MS`, `DOUBLE_TAP_PX` | 320, 28 |
| `LEGEND_MS` | 4000 |

## Director review (round 2) — the ten defects, fixed

1. A landmark sample that stops being refreshed (detect throwing, `readyState
   < 2`, track ended) now ages out after `HAND_LOST_GRACE_MS` like an absent
   hand (`engine/hand.ts`); explicit sources are exempt. Video tracks get an
   `onended` handler that clears the slots and hands back the gate.
2. Touch pointer-up and the Shift anchor's lift write an explicit
   `pinch=false` sample first (immediate release with the live velocity) and
   clear the slot two frames later, so a double-tap's second tap finds the card
   already released and the wave moves it.
3. `hasWebGL()` probes `webgl2` only and releases the probe context.
4. A camera error returns the phase to the gate (button enabled) under the
   dialog, which now also offers `try the camera again` (not for unsupported).
5. Two coincident anchors (the planted pointer anchor) no longer define a
   rotation axis; the card keeps its angle until it tears.
6. `resize()` runs in the mount effect before `load()`, so cards never spawn
   in the default 16 × 9 world.
7. Every `getUserMedia` rejection maps to `denied`; `unsupported` is reserved
   for the missing API and a model that fails to load.
8. Tab passes through while `total === 0`.
9. The `<p aria-live>` stays mounted; a keyed inner `<span>` is replaced on
   every status, so a repeated identical status is still a childList
   mutation the region reports (a MutationObserver on the `<p>` saw an
   insert + remove pair per P press, four presses 750 ms apart → four
   replacements, the same `<p>` node throughout). `World.push()` applies
   `PUSH_COOLDOWN_MS` to every source (keyboard P, double-click, palm).
10. `stop()` restores the console only once the un-cancellable model load has
    settled (`finally`), so late MediaPipe INFO lines stay filtered.

Plus the two notes: the timeout arming is stated above; the legend sits on a
soft dark pool.

## Verification done

- `npx tsc --noEmit`: clean for this folder. (One error remains in the tree,
  `darkroom/App.tsx` still reading `copy.wip` — the darkroom session's stub,
  not mine.) `npx eslint "src/app/(immersive)/xperiments/hands"`: 0 errors,
  0 warnings, no disables.
- Headless Chrome over CDP, real GPU (ANGLE D3D11, GTX 1660 SUPER), Python
  3.11 driver, unique port + profile per run:
  - **pointer path**: hold + carry + release with momentum, double-click
    push, `?` legend, Tab focus, Space / arrows / T / P, Escape →
    `/graphic-designs`, no `<video>` left. A deterministic Shift-drag tear on
    the card nearest the centre: the card's angle stayed at 0.006 rad through
    the whole stretch (no snap), then `held, held, torn, released, released`.
  - **synthetic hands through the real landmark pipeline** (21-point hands
    written into the bus at 30 Hz): approach → pinch → carry → release (card
    travelled with the hand and slid on with its velocity), two hands claim
    one card and pull → `torn` with an even split, palm sweep → `pushed`
    with the neighbourhood displaced (0.7–5 u), the halves reunited whole
    after 12 s + fade (`halves 0, wholes 14`). A single landmark sample left
    unrefreshed lit the reticle at 120 ms and had aged out by 600 ms.
  - **real webcam** (EMEET C960, fake permission UI): gate → running in
    7.3 s on this headless box (downloads finish in < 1 s; the rest is wasm
    compile + GPU delegate init, cached by Chrome on later visits), Italian
    legend, reticles armed; after Escape the track is `ended`, zero `<video>`.
  - **denied** (getUserMedia rejecting `NotAllowedError`): dialog with the
    pointer button focused, `try the camera again` present, the gate's camera
    button enabled again (`is-gate`); retry → the dialog returns; continue →
    pointer mode running, dialog gone.
  - **no WebGL** (`--disable-3d-apis`): message + exit link. **Software
    WebGL** (SwiftShader): renders, 14 bodies.
  - **reduced motion** (emulated): over 2.5 s every body's position, angle,
    z and opacity are identical to four decimals (the two frames differ in
    four isolated pixels of GPU noise); keyboard hold + arrows still move a
    print.
  - **phone** (390 × 844, touch emulation, `(hover: none)`): touch legend,
    one-finger drag, two-finger spread → `torn`, double-tap → `pushed`.
  - **leaks**: `/graphic-designs` → card → demo → exit, three cycles:
    heap 18 → 23 → 24 → 24 MB after GC, DOM nodes 682 / 682 / 682, listeners
    710 / 710 / 710, one canvas (the site's field), zero videos.
- Manual on the real webcam at arm's length is the one thing I could not do
  from here — see *How to test in two minutes*. The thresholds are the
  brief's; the two knobs to reach for if a real hand disagrees are
  `PINCH_ENTER/EXIT` (ratios) and `FILTER_MIN_CUTOFF/BETA` (steadiness vs lag).

## Known limits

- First camera start on a cold cache compiles ~12 MB of wasm; on a slow
  machine that can approach the 8 s budget after the grant. The pointer
  button is live meanwhile and the dialog offers it again on timeout. The
  budget is the brief's; raise `INIT_TIMEOUT_MS` if the field shows it.
- Landmark z is ignored (per brief); "push toward the screen" is read from
  the hand growing in the frame plus palm speed.
- The tear line sits at the midpoint of the two hold points (clamped to ±30 %
  of the extent), so grabbing both corners tears through the middle; grabbing
  one edge with both hands tears near that edge — by design.
- With numHands 2, a third hand is ignored; if two hands cross, the slot
  matcher keeps each by proximity, which can swap on a fast full crossing.
- Card–card repulsion is light (they can overlap while held or pushed; they
  never stack at rest).
- The dev-only `window.__handsWorld` / `__handsInput` handle exists only under
  `NODE_ENV=development` (used by the headless choreography).

## How to test it in two minutes

1. `http://localhost:3000/xperiments/hands` → `enable the camera` → allow.
   Reticles should appear within ~2 s at your index tips, the legend at the
   bottom.
2. Pinch (thumb + index) over a print, move — it follows without lag; let go
   with a flick — it drifts on. Pinch near a print but not on it: nothing.
3. Pinch a print with both hands, pull apart slowly: it tears at the line
   between your hands with a lighter fibrous edge; each half stays in its
   hand. Release both, wait 12 s: they dim and the print is back whole.
4. Open your palm and push toward the screen (or sweep): the nearby prints
   scatter once; do it again immediately — nothing (600 ms cooldown).
5. Press `?` for the legend; Tab, Space, arrows, T, P for the keyboard path;
   Escape exits and the camera light must be off within a second.
6. Reload, choose `or use the pointer`: press-drag holds, Shift + drag
   tears, double-click pushes. On a phone: two fingers spread = tear.

## For the director

Nothing to change in a shared file. The route header
(`Permissions-Policy: camera=(self)`), the card, the dictionary entries and
the sitemap were already in place and are used as-is.

## Round 2 — hover, close-to-open, sweep-to-close, onboarding

Built 2026-09-11 by the round-2 `hands` session (`reference/briefs/round2/03-hands.md`).
Files only under `src/app/(immersive)/graphic-designs/hands/**` and this report.
Hold, tear, push, the gate, the reticles and the 14 prints are untouched.

### Audit

`npx tsc --noEmit` and eslint were clean on the folder before any change.
Every path in the round-1 "two minutes" was driven in headless Chrome
(ANGLE D3D11 on the AMD GPU of this machine; a fake camera device for the
camera path, synthetic 21-point hands written into the bus at 30 Hz through
the real landmark → tracker → world pipeline). The four suspects:

- *A reticle left lit after the camera stops* — not reproduced. With a hand
  lit, the video track was ended (`ended` dispatched on the track): the
  dialog came up, the video was gone, and the reticle went dark 250–300 ms
  later — the lost-hand grace, counted from the last fresh detection.
- *A pinch that flickers at the threshold* — not reproduced under realistic
  jitter. A hand whose pinch ratio sits at 0.36 (between enter 0.30 and exit
  0.42) with uniform jitter: ±0.03 → 0 flips in 4 s, ±0.06 → 0, ±0.08 → 1,
  ±0.10 → 2. Landmark jitter on a steady hand is ~±0.02–0.04 of hand size;
  the 0.12 band plus the 2 / 3-frame counts hold. The two knobs stay
  `PINCH_ENTER/EXIT` and `PINCH_ENTER_FRAMES/EXIT_FRAMES`.
- *The mouse hover reticle vanishing after the first click* — not
  reproduced with real CDP mouse input: the reticle stayed lit through a
  click, a press-drag hold and a double-click.
- *The legend timer surviving unmount* — not reproduced: the 4 s timer id
  was cleared on Escape (timers instrumented in-page).

One real defect, fixed first in its own commit (`fix(hands): ? explains the
running mode, not the last key`): pressing `?` made the keyboard the last
device, so in camera mode the legend switched to the pointer wording. The
wording now follows `input.mode`.

### What changed and why

**Hover** (`engine/world.ts` → `hover()`, per present hand, camera and
pointer alike — the `HandState` is the same object). A whole, free print
within `HOVER.radius` × its half-diagonal of the index tip answers: z
+0.25, scale ×1.05, up to 5° of tilt so its face turns toward the tip, and
its drift target halved so it stays put to be taken. Falloff is a
smoothstep of distance; the amount and the (direction × amount) vector both
settle on an exponential with `HOVER.lagS`, both ways, so it releases as
softly as it took. Held prints, halves, away prints and touch
(`lastDevice === "touch"`) get none. Reduced motion keeps the lift only.
The tilt is applied in `sync()` as `rotation.x/y` on the group; `resize()`
no longer writes the scale — `sync()` does, every frame, from
`S × scaleMul × (1 + HOVER.scale × hover)`.

**Fist → open** (`engine/hand.ts`). `WorldSample.fingersClosed`: each of
the four tips nearer the wrist than its PIP × `FIST_CURL` (0.95), the
mirror of the open test, computed in `landmarkSample`. The tracker enters
the fist after `FIST_ENTER_FRAMES` (4) consecutive closed detections —
never within `PUSH_MIN_PRESENCE_MS` of the hand appearing — and leaves it
after `FIST_EXIT_FRAMES` (6) open ones. While the fist holds the pinch
machine is frozen; a pinch that was on ends on fist-enter (a normal
`pinchExit`, so the hold releases), and the push test has `!fist` added to
its `!pinching` — its open-palm test is the fist's inverse anyway. The
`HandState` gains `fist`, `fistEnter`, `fistX/Y` (the palm centre at the
edge), `pushDirX/Y` (the sweep's direction), and a `focus` flag the scene
sets each frame. The reticle fills (`is-fist`) while the fist holds.

On `fistEnter` the world opens the body that hand was holding (read before
the releases of the same frame) or, failing that, the nearest whole print
within `HOLD_RADIUS_FACTOR` × half-diagonal of the palm centre. Because the
pinch enters at frame 2 and the fist at frame 4, closing the hand *on* a
print is read as pinch → hold → fist → open; closing it near one goes by
the palm. A fist never pushes (verified: a fist swept at 13 u/s raised no
wave) and a pinch never opens (a 1 s pinch-hold-release raised held /
released only).

**Focus mode** (`engine/world.ts`). Naming: the keyboard focus was already
`focusId` / `focusState()`, so the opened print is `opened: Body | null`
(+ `isOpen()` = opened and not yet leaving); the events are `opened` (with
`bottom`, the print's lower edge as a fraction of the viewport height) and
`closed`, as the brief names them.

- `open(body)`: every hold on it drops; it flies to the centre, upright,
  rising to `OPEN.z` (1.2) and growing to `fitScale()` — aspect-fit to
  `OPEN.heightFrac` (62 %) of the viewport height *as seen at that z*
  (perspective-corrected), at most `OPEN.maxWidthFrac` (70 %) of the width.
  Position, angle and scale settle on one exponential, `OPEN.flightLagS`
  (0.14 s): the hold spring's shape with its own time constant, because a
  16 ms flight reads as a cut. Verified: screen height 0.62 on a 1440 × 900
  and on a 390 × 844 viewport.
- The others get an `Away` record (home position / angle / velocities /
  opacity, an outward direction from the centre, a ±6° spin alternating by
  rank, a start time staggered `OPEN.awayStaggerMs` per rank, nearest
  first) and their physics pause: `transitions()` drives `away.k` 0 → 1
  over `OPEN.awayMs` (700), position = home + dir × `OPEN.awayDist` ×
  easeOut(k), opacity = home × (1 − k). Nothing is disposed; hold / tear /
  push skip away bodies, so do repulsion, waves, hover and the Tab ring;
  `reunite()` pauses (their clocks wait). Holds on other prints drop at the
  open.
- `close(dir)`: ignored while `OPEN.armMs` (450) has not passed since the
  open — a double-click's second press, a hand still in motion — so nothing
  closes by accident. The print gets `leaving` (t0 + unit direction): it
  travels at `OPEN.exitSpeed` (7 u/s) fading over `OPEN.exitMs` (500), and
  after `OPEN.rejoinMs` (1000) `rejoin()` removes the body and
  `spawnWhole()`s the card at a free spot (a new `Body`, like a reunite).
  The others get `target = 0` and come home over `OPEN.returnMs` (600),
  fading in; when k reaches 0 their velocities are restored and physics
  resumes. `opened` stays set until the rejoin, so a second open waits a
  second; `isOpen()` is false as soon as it leaves, so a second Escape
  exits.
- While focused the opened print is not claimable (a pinch / press on it
  does nothing but show the pinch reticle); hover on it still works, at its
  grown radius. `push()` in focus mode *is* the close: the camera sweep
  passes its direction, a double-click / double-tap / keyboard P closes away
  from the centre toward the click (or down when there is none), a flick
  passes the flick's direction.
- Reduced motion: no outward travel, no spin, no exit travel — fades only,
  three times quicker; the flight to the centre stays (a user-triggered
  transition, not a continuous one).

**The sweep** (`engine/hand.ts`). In focus mode the tracker's push fires at
`PUSH_SPEED × PUSH_FOCUS_SPEED_FACTOR` (0.75 → 4.1 u/s) with no per-hand
cooldown, and the world's close has no wave cooldown either. Verified: an
open-palm sweep at ~5 u/s closes in focus mode and raises no wave outside
it (5 < 5.5); the print left along (1, 0) for a rightward sweep.

**Pointer / touch** (`hooks/usePointerHands.ts`). A lone press released
within `CLICK_MS` (250) having moved less than `CLICK_PX` (6, mouse) /
`TAP_PX` (12, touch) queues a *tap* on the bus (`input.taps`); the world
opens the nearest whole print within the hold radius of it (the press
still holds the print for its 60 ms first — a small lift, then the
flight). A pressed pointer moving faster than `FLICK_SPEED` (1.6 short
viewport sides / s) over its last ≤ 90 ms of path, after `FLICK_MIN_PX` of
travel, queues one *flick* per press (`input.flicks`, a unit direction);
the world closes with it when a print is open and ignores it otherwise.
The double-tap push is unchanged; in focus mode it closes (through
`push()`), and its second press lands inside `armMs`, so a double-click
*on a print* opens it and does not immediately close it (verified). Touch:
tap opens, swipe closes, no hover.

**Keyboard** (`hooks/useKeyboardHands.ts`, `isOpen` option). Enter opens
the Tab-focused print; Escape closes an opened print and, pressed again,
exits (`aria` says so); Backspace closes too; P closes as a push would;
Tab passes through to the exit link while a print is open; Space / T do
nothing on the opened print (verified: no hold, no halves). The live region
says `print n of total · opened` / `closed` (`srOpened` / `srClosed`).

**Onboarding card** (`App.tsx`, the `.hands-legend` element, now two lines
+ the keys on `?`). After the gate it stays until the first gesture
succeeds (a `held`, `torn`, `pushed` or `opened` event) or `ONBOARDING_MS`
(10 s), whichever first; `?` re-shows it with the key hint under the same
rule. Wording per running mode / pointer kind: `guideHand`, `guidePointer`,
`guideTouch` (each a `[line, line]` tuple; every line still breaks only at
its ` · ` separators, one segment per line on phones). The old `legend*`
strings are gone — the card replaces the legend. On phones the pool under
the words is deeper (five short lines over a dense drift).

**Caption + hint** (`App.tsx`, `.hands-caption`). On `opened` the scene's
`bottom` becomes the caption's `top` (capped at 86 %), and
`OPEN.captionDelayMs` (900 = flight + a beat) later a caption fades in:
DOM, mono lowercase, `--ink-dim`, letter-spaced, one line (two on a
phone), drawn from `copy.captions` — 14 new one-liners in the Vortex voice
about hands, holding and closing, English in both locales — never the same
index twice in a row. Under it, once per visit, the contextual hint
(`hintCloseHand` / `hintClosePointer` / `hintCloseTouch`, by device) for
`OPEN.hintMs` (3 s). `closed` fades both out; every timer is cleared on
unmount.

### New tunables — `hands.config.ts`

| name | what |
|---|---|
| `HOVER.radius` | 1.6 × the body's half-diagonal around the index tip |
| `HOVER.lift`, `HOVER.scale`, `HOVER.tiltDeg` | +0.25 z, ×1.05, 5° toward the tip (negative flips the tilt) |
| `HOVER.driftDamp` | drift target × (1 − 0.5 × hover) |
| `HOVER.lagS` | 0.14 s exponential settle, both ways |
| `FIST_CURL` | 0.95 — tip nearer the wrist than its PIP × this |
| `FIST_ENTER_FRAMES`, `FIST_EXIT_FRAMES` | 4 / 6 consecutive detections — **the two knobs for the real webcam** |
| `PUSH_FOCUS_SPEED_FACTOR` | 0.75 × `PUSH_SPEED` closes in focus mode, no cooldown |
| `OPEN.z`, `OPEN.heightFrac`, `OPEN.maxWidthFrac` | 1.2, 62 % of the height as seen at that z, ≤ 70 % of the width |
| `OPEN.flightLagS` | 0.14 s — the flight's time constant |
| `OPEN.awayDist`, `OPEN.awaySpinDeg`, `OPEN.awayMs`, `OPEN.awayStaggerMs` | 1.2 u, 6°, 700 ms, 45 ms per rank (nearest first) |
| `OPEN.returnMs` | 600 ms — the others come back |
| `OPEN.exitSpeed`, `OPEN.exitMs`, `OPEN.rejoinMs` | 7 u/s, 500 ms fade, rejoins whole after 1000 ms |
| `OPEN.armMs` | 450 ms — closes ignored this soon after the open |
| `OPEN.captionDelayMs`, `OPEN.hintMs` | 900, 3000 |
| `CLICK_MS`, `CLICK_PX`, `TAP_PX` | 250 ms, 6 px mouse / 12 px touch — a click / tap that opens |
| `FLICK_SPEED`, `FLICK_MIN_PX` | 1.6 short viewport sides per second, after 24 px — a flick / swipe that closes |
| `ONBOARDING_MS` | 10000 — replaces `LEGEND_MS` |

### New known limits

- The fist frame counts and `FIST_CURL` were set on synthetic hands and
  the brief's ratios; the real webcam at arm's length is the test that
  matters (see below). If a loose fist is missed, lower `FIST_CURL` toward
  0.9 before touching the counts; if a relaxed hand reads as a fist, raise
  it.
- Closing the hand on a print reads as pinch → hold → fist → open, so a
  fist made within the hold radius of a print's centre opens it even when
  the palm is a little off it — by design (the brief's "or the body this
  hand is already holding").
- In focus mode a fast open-hand *teleport* of the landmarks (two hands
  crossing and swapping slots, a hand re-acquired far from where it was
  lost) can read as a sweep and close the print; the 450 ms arm covers the
  open itself, not a later swap. Rare with two hands in frame; the
  `HAND_LOST_GRACE_MS` re-acquire is the path to look at if it shows.
- `opened` stays set for `OPEN.rejoinMs` after a close, so a new print
  cannot be opened for one second; a tap / fist in that second does
  nothing (hold and tear still work).
- The onboarding card on a phone is five short lines; on `?` the key hint
  adds seven more (one per segment). Legible over the deeper pool, but it
  is the densest thing on the page.
- Reduced motion keeps the flight to the centre and the fades; it has no
  outward drift, no spin, no tilt and no growth on hover.

### Verification done (round 2)

Headless Chrome, real GPU (ANGLE D3D11, AMD Radeon), fake camera device for
the camera path, synthetic landmarks through the real pipeline, IT locale:

- **camera**: hover (0.74 at the tip, lift 0.25) → pinch (held) → fist →
  `released`, `opened` #9, reticle filled → fist swept at 13 u/s: no event
  → hand opens: reticle back to a ring → caption "let go, and it returns
  to the drift" + hint `spazza per chiudere`, onboarding card gone → open
  palm at ~5 u/s: `closed`, direction (1, 0), the others back, 14 wholes,
  caption gone → the same sweep outside focus mode: no push → a 1 s pinch
  on a print: `held` / `released` only, nothing opened → a fist on a print
  without holding it: opened by the palm.
- **pointer**: hover 0.97 / z +0.24 / ×1.048 / tilt 4°, turning as the
  pointer moves to the other side, back to 0 within 0.7 s of leaving; click
  → `opened`, print at (0, 0), angle 0, scaleMul 2.02, screen height 0.62,
  13 away with staggered opacities; caption at 81 % + hint `trascina di
  scatto per chiudere` after 0.9 s; press on the opened print: not held;
  flick → `closed` along (0.99, 0.10), leaving, the others home at
  opacity 1 within 0.9 s, rejoined whole at 1.3 s (14 wholes); a
  double-click on a print: `held`, `released`, `opened`, second press
  swallowed; a double-click 0.6 s later: `closed` toward the click.
- **keyboard**: Tab → Enter: `opened`, ring on it, live region `stampa 14
  di 14 · aperta`; Escape: `closed`, `chiusa`, still on the page; Backspace
  and P close too; Tab / Space / T while open: nothing; Escape twice 300 ms
  apart: `/graphic-designs`, no `<video>`, no stage.
- **touch** (390 × 844, `pointerType: touch`): press-hold moves the print,
  no hover (`hoverEnabled` false); tap → `opened`, caption on two lines,
  hint `scorri per chiudere`; swipe → `closed` along the swipe; double-tap
  → `pushed`.
- **reduced motion** (emulated): hover lift 0.22 with rotation 0 and scale
  1; open: the others travel 0.001 u and spin 0, fading staggered; caption
  transition 0; close: the print fades in place (x = 0), the others back at
  opacity 1.
- **leaks**: `/graphic-designs` → the card → the demo → Tab, Enter (a
  print opens), `?` (the guide shows; the caption yields to it) → Escape,
  Escape → the index, three cycles (the second through the fake camera):
  DOM nodes 229 / 229 / 230 / 230, `<video>` 0 after every exit, the
  camera track `ended`, one canvas (the site's field). JS heap 25 → 28 →
  39 → 41 MB *without* a forced GC (this session's Chrome had no
  `--expose-gc`; the camera cycle keeps the compiled MediaPipe wasm in the
  module cache) — the round-1 GC'd figures are the reference for the
  GPU-side disposal, which is unchanged.
- Console and page errors: empty in every run (the MediaPipe noise filter
  still covers the fake-device camera start).
- `npx tsc --noEmit`: clean for this folder (the tree has sibling sessions'
  work in flight — darkroom and wall — so `npm run build` was not run).
  `npx eslint "src/app/(immersive)/graphic-designs/hands"`: 0 findings,
  no disables.

### How to test it in two minutes (round 2)

1. `/graphic-designs/hands` → `enable the camera` → allow. The onboarding
   card sits at the bottom until your first gesture lands (or 10 s); `?`
   brings it back with the keys.
2. Move an open hand slowly past a print: it lifts, grows a touch and turns
   toward your fingertip; move on and it settles back. Pinch, carry,
   release — as before.
3. Close your hand on a print (or pinch it first, then close): the reticle
   fills, the print flies to the centre and grows, the others drift off
   and fade; a caption appears under it a beat later, and — the first time
   — `swipe to close`.
4. Sweep an open hand across, any direction: the print leaves that way,
   the others come back where they were, and the print rejoins the drift a
   second later at a free spot. A fist must never scatter the prints; a
   pinch must never open one.
5. Keyboard: Tab, Enter (opens), Escape (closes), Escape again (exits);
   Backspace closes too.
6. Reload, `or use the pointer`: hover with the mouse; click a print to
   open it; a quick flick anywhere or a double-click closes it. On a phone:
   tap opens, swipe closes.
