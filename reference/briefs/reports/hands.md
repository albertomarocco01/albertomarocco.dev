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
