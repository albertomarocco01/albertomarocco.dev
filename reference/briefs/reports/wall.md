# 03 — Parete (LED Wall) · build report

Route `/xperiments/wall` · folder `src/app/(immersive)/xperiments/wall/` ·
cover `public/wall/cover.webp` (800 × 1000, 31 KB) · built 2026-09-07 on the
GTX 1660 SUPER, Next 16.3.4 / React 19.2 / three 0.185 / R3F 9.6 / drei 10.7 /
@react-three/postprocessing 3.0.

No shared file was touched, and none needs to change. Nothing was installed.

## What was built

A dark room, one unit to the metre. A 6 × 3 m P2.6 LED wall stands on a 0.3 m
matte black riser, its cabinets a shallow box behind the emissive face. It runs
the site's own **Liminal Field** shader live — `AuraMaterial`, imported
read-only from `@/components/canvas/aura-material` and not edited in any way —
and it lights the room: a `RectAreaLight` of exactly the panel's dimensions
throws the loop's own colour onto the floor, and drei's `MeshReflectorMaterial`
lays a blurred reflection of the wall, the riser and the figure under it. A
1.8 m matte silhouette stands 1.5 m in front, right of centre, for scale. The
walls of the room are implied by a dark vertical gradient on a cylinder and
nothing else — no environment map, no HDRI, no props.

The visitor orbits inside architectural limits (polar 70°–100°, azimuth ± 60°,
no truck), dollies 0.6–14 m, and switches between three framed presets and four
loops. Left alone for 8 s the camera breathes ± 4° of azimuth over 20 s (and a
third of that on the polar axis, on a 31 s beat, so the two never re-phase);
any input drops the drift and restarts the count. A mono HUD reads like a spec
sheet — `led wall · 6 × 3 m · pitch 2.6 mm · 12 × 6 cabinets · loop: liminal
field / amber · distance 7.0 m`, the last figure live.

### The loop, reused rather than re-implemented

`AuraMaterial` is a **fullscreen-triangle** material: its vertex shader writes
`position.xy` straight to clip space and ignores the camera, so it cannot be
hung on a wall. `components/loop-source.ts` owns a three-vertex triangle in a
scene of its own and renders it, untouched, into a drei `useFBO(1024, 512,
{ depthBuffer: false })` at `useFrame` priority −1, with `u_white 0` (the work
branch), `u_fade 1`, `u_res (2, 1)`. `u_time` advances at the site's own pace
(`timeScale` 1, exactly what `Aura.tsx` does) in real time, but the target is
only redrawn every 33 ms — 30 Hz into a soft, slow smoke is free of tells and
costs half of 60. Switching loops crossfades `u_hot` / `u_mid` between
`VARIANT_PALETTE` entries over 1.2 s on a smoothstep; one material, one target,
no second loop. The tweened accent is also the `RectAreaLight`'s colour, so the
room changes hue with the wall.

### The surface, and the moiré guard

`components/wall-material.ts` samples that texture and adds everything that
makes it a wall rather than a video:

- **the lamps** — 2307 × 1153 of them at 2.6 mm pitch, a round dot at a 0.7 fill
  factor, analytically anti-aliased;
- **per-lamp brightness spread** of ± 3 %, the sparkle of a real panel;
- **cabinet seams** — a 12 × 6 grid of 500 mm cabinets, one pitch wide;
- **off-axis falloff**, so the panel dims as you orbit past it — and, because it
  is computed from `cameraPosition`, it does the same in the floor reflection.

Nyquist is the one rule the surface has to obey: at 7 m a 2.6 mm cell is a
fifth of a screen pixel, and drawing it there would be nothing but moiré.
`fwidth(uv)` gives the screen-space size of a cell every frame, and everything
periodic — the per-lamp sampling, the dots, the jitter — dissolves into a flat
surface across `resolveLo … resolveHi` (0.30 → 0.46 cells per device pixel),
well inside the 0.5 limit. The dot mask is normalised so its **cell average is
exactly 1** (`LED_OFF_FLOOR` and `LED_DOT_GAIN` are solved from `LED.contrast`
and the dot's coverage), so the wall does not change brightness as the
structure fades in or out, and backing away is a dissolve rather than a
dimming. The seams are deliberately left analytic: once a seam is thinner than
a pixel the smoothstep returns partial coverage, so it reads as a faint
dimming instead of a crawling hairline. Verified at 0.9 m, through the whole
band to 3.6 m, and at the azimuth limit where the far half of the wall is
grazing — the dots resolve on the near side and dissolve toward the far side
with no beating anywhere (`31b-grazing-crop.png` in the session scratchpad).

### Colour

One thing had to be got right for the wall, its reflection and the bloom to
agree. `AuraMaterial` has no `<colorspace_fragment>`, so on the home page it
writes **display-referred** values straight to the framebuffer — those exact
bytes land in the render target here. The wall shader therefore decodes them to
linear, applies the emissive gain and the LED mask in linear light, and ends on
`#include <colorspace_fragment>`, which is a no-op into a render target and the
sRGB encode on the way to the screen. That makes the wall identical to the
site's aura at gain 1, keeps the mirror render (a linear HalfFloat target) and
the composer (also linear) correct without a second code path, and means the
reflection is never a stop brighter than the thing it reflects. The backdrop
shader does the same.

## File map

| file | what it is |
|---|---|
| `page.tsx`, `client.tsx` | untouched scaffold — metadata + the `ssr:false` boundary |
| `copy.ts` | every visitor-facing string, EN + IT, parity compiler-enforced |
| `wall.config.ts` | every tunable, and the LED maths derived from the pitch |
| `wall.css` | scoped under `.wall`; exit link, title cover, spec sheet, controls |
| `App.tsx` | WebGL2 probe, context loss, keys, the frameloop, the chrome |
| `components/WallCanvas.tsx` | the `<Canvas>`, capability probe, the composer |
| `components/WallScene.tsx` | the room: floor, riser, cabinets, face, figure, lights |
| `components/CameraRig.tsx` | `CameraControls`, the presets, the aspect fit, the drift |
| `components/loop-source.ts` | the aura rendered into a target; the palette crossfade |
| `components/wall-material.ts` | the LED surface (lamps, seams, jitter, falloff, colour) |
| `components/backdrop-material.ts` | the implied walls: one vertical gradient |
| `components/room-light.ts` | the wall as a `RectAreaLight`; the one addons import |
| `components/capabilities.ts` | software-rasteriser detection |
| `components/wall-bus.ts` | the live distance readout, DOM-written, and the "someone is here" stamp |
| `components/Hud.tsx` | title cover, spec sheet, view pager, loop switcher |
| `hooks/useReducedMotion.ts`, `hooks/useTabVisible.ts` | the two media/visibility stores |

## Every tunable

All of them are in **`wall.config.ts`**, and nothing outside it is a magic
number. Grouped as they appear:

- **`WALL`** — `width` 6, `height` 3, `riserHeight` 0.3, `riserDepth` 0.6,
  `riserOverhang` 0.2, `bodyDepth` 0.16, `faceOffset` 0.002. `WALL_CENTRE_Y` is
  derived (1.8).
- **`LED`** — `pitchMm` 2.6, `cabinetMm` 500, `fill` 0.7, `contrast` 0.86,
  `offMin` 0.03, `jitter` 0.03, `seamLeds` 1, `seamDarken` 0.45,
  `resolveLo` 0.30, `resolveHi` 0.46, `intensity` 1.35, `angleFalloff` 0.3.
  Derived: `LED_PIXELS` (2307 × 1153), `LED_CABINETS` (12 × 6),
  `LED_OFF_FLOOR`, `LED_DOT_GAIN`.
- **`LOOP`** — `fboWidth` 1024, `fboHeight` 512, `throttleMs` 33, `timeScale` 1,
  `switchSeconds` 1.2, `variants` (amber, ember, teal, violet).
- **`ROOM`** — `floorSize` 60, `backdropRadius` 26, `backdropHeight` 18,
  `backdropTop`, `backdropBottom`, `backdropCurve` 0.4, `figure` (`position`
  `[2.8, 0, 1.5]`, `radius` 0.135, `length` 1.25, `centreY` 0.81,
  `headRadius` 0.115, `headY` 1.685, `color`, `roughness`), `riserColor`,
  `bodyColor`, `floorColor`, `floorRoughness`, `ambient` 0.17,
  `wallLight` (`enabled`, `intensity` 3.6, `offset` 0.05).
- **`REFLECTOR`** — `resolution` 512, `blur` `[400, 120]`, `mixBlur` 0.85,
  `mixStrength` 9, `mirror` 0.7, `mixContrast` 1, `roughness` 0.86,
  `metalness` 0.32.
- **`SOFTWARE`** — `reflectorResolution` 192, `reflectorBlur` `[140, 60]`,
  `dpr` 1.
- **`BLOOM`** — `intensity` 0.75, `luminanceThreshold` 0.045,
  `luminanceSmoothing` 0.12, `mipmapBlur` true, `smaa` true.
- **`CAMERA`** — `fov` 45, `near` 0.05, `far` 120, `eye` 1.6, `smoothTime` 0.6,
  `draggingSmoothTime` 0.18, `dollySpeed` 0.42, `minPolar` 70, `maxPolar` 100,
  `azimuthLimit` 60, `minDistance` 0.6, `maxDistance` 14, `fitAspect` 1.6,
  `idleSeconds` 8, `driftDegrees` 4, `driftPeriod` 20, `driftPolarRatio` 0.3,
  `driftPolarPeriod` 31, `driftEase` 4.
- **`PRESETS`** — the three compositions, plus `OBLIQUE_DEG` (−35) and
  `OBLIQUE_R` (6.5) above them.
- **`HUD`** — `distanceMs` 160, `distanceEpsilon` 0.05.

**The three knobs worth touching first**, by eye on real hardware:
`LED.intensity` (how emissive the wall is before its blacks lift into beige),
`REFLECTOR.mixStrength` against `ROOM.ambient` (how hard the floor glows against
how dark it starts), and `LED.contrast` (how hard the lamps read up close).

## Deviations from the brief, and why

1. **Oblique preset at 6.5 m, not 5 m, and to the left, not the right.** At 5 m
   and 35° the wall's near corner falls outside a 45° frame: the panel is
   cropped on the right and the riser runs off the bottom, which reads as a
   viewer rather than a rendering. 6.5 m is the nearest distance that holds the
   whole wall, its riser and a stretch of reflected floor. The azimuth is
   negative so the camera stands on the opposite side of the room from the scale
   figure — from the same side the figure would be nearer the lens than the wall
   and would fill the frame.
2. **The scale figure stands 1.5 m in front, not 3 m.** At 3 m it is closer to
   the camera than the panel is, so a 1.8 m person renders *taller* on screen
   than a 3 m wall — true perspective, and the exact opposite of what a scale
   figure is for.
3. **`luminanceThreshold` 0.045, not 0.6.** The aura is not an HDR image.
   Measured through `LED.intensity` 1.35 its flares peak at ~0.10 of linear
   luminance and the body of the smoke sits at ~0.012; a 0.6 threshold never
   fires, and raising the gain until it did would lift the smoke's blacks into
   beige long before the flares reached 1. The threshold sits between the two
   measured levels instead, which is what "glow, not haze" actually asks for.
4. **`maxDistance` 14, not 12**, and the two wide presets stretch their distance
   on a viewport narrower than 16:10 (`CAMERA.fitAspect`, capped at
   `maxDistance`). A 6 m wall does not fit a phone held upright at 7 m; without
   this the whole left half of the panel is off-screen on a phone.
5. **A software-rasteriser path**, which the brief does not ask for. Measured on
   SwiftShader the full chain runs at **2.8 fps** — a slideshow. On that path
   the composer is disabled (`enabled={false}` drops it to render priority 0 and
   R3F's own render takes over), the reflector shrinks to 192 with a light blur,
   DPR goes to 1 and the frameloop goes to `demand`: a still room that repaints
   only when the visitor moves it, fully navigable. Same deal reduced motion
   gets. This mirrors the site's existing decision for the ambient field.
6. **A live `distance` figure was added to the spec line.** Pitch and viewing
   distance are the pair a client actually asks about, and the relationship
   between them is the sales point of the piece. It is written straight into its
   span by the camera rig through `WallBus`, throttled to 160 ms and dead-banded
   at 5 cm — it never costs a React render.

## Verification

`npx tsc --noEmit` clean (my folder; two errors in `darkroom/` belong to that
session). `npx eslint "src/app/(immersive)/xperiments/wall"` — **zero
findings**, no disables anywhere.

Headless Chrome over CDP on the real GPU (`ANGLE (NVIDIA GTX 1660 SUPER,
D3D11)`), 1600 × 900 at DPR 1.5 (drawing buffer 2400 × 1350):

| | fps | p50 | p95 | max | draws/frame |
|---|---|---|---|---|---|
| front | 75 | 13.3 ms | 13.5 ms | 13.7 ms | 36 |
| oblique | 75 | 13.3 ms | 13.5 ms | 13.8 ms | 36 |
| close (grid resolved) | 75 | 13.3 ms | 13.5 ms | 13.8 ms | 33 |

75 is the headless vsync ceiling, not the engine's — **no frame anywhere
exceeded 13.8 ms**, so 60 fps has ~3 ms of headroom with the bloom, the SMAA
pass and the reflector all in the chain.

- **Hidden tab: 0 rAF frames, 0 draw calls**, and it resumes cleanly.
- **Reduced motion: 0 frames and 0 draws at rest.** Presets cut instead of
  flying (pressing `3` reads 0.9 m within 400 ms), the loop still switches
  (one repainted frame), a drag still moves the camera.
- **Software WebGL (SwiftShader): 0 frames at rest**, and a preset key still
  reframes the room. Renders identically minus the bloom.
- **No WebGL** (`getContext('webgl2')` stubbed to null): message + exit link, no
  HUD, no canvas. **Context loss** (`WEBGL_lose_context`): message + exit.
- **Keyboard only.** Tab order: exit → front → oblique → close → previous loop →
  next loop. Enter and Space both activate; the live region reads
  `loop ember · camera view close`; Escape leaves to `/graphic-designs`.
- **Phone, 390 × 844 at DPR 2** (clamped to 1.5, buffer 585 × 1266), touch
  emulation, `hover: none` matching, Italian locale: one-finger swipe orbits,
  pinch dollies (14.0 → 11.9 m), a tap on the loop arrow switches. The spec line
  drops its cabinet and loop segments and wraps to two lines; the pager and the
  switcher sit on one row with 44 px targets.
- **Idle drift**, measured by tracking the wall's left edge in a one-pixel row of
  the frame: still until 8 s, then a ± 4° sine with a ~20 s period (edge x
  242 … 269, which is ± 4.0° to the arc-minute at 7 m). After any input the edge
  holds still for at least 4 s.
- **`/graphic-designs` → the card → the demo → exit → the index**, three times
  over: heap 25.9 → 27.1 → 27.6 MB (decelerating, i.e. dev churn, not a leak), a
  fresh WebGL2 context still obtainable afterwards, no console errors beyond
  R3F's own one-per-mount `THREE.Clock` deprecation notice.

## How to test it in two minutes

1. `http://localhost:3000/graphic-designs` → the **Parete — LED Wall** card →
   the demo. It opens on the front view at 7 m; the title cover and the key line
   sit at the top until you touch something.
2. Press **2**. The camera settles into the oblique; watch the floor — the pool
   of light and the reflection of the wall and the figure are the piece.
3. Press **3**. You are 0.9 m from the lower-left quadrant: the lamps and a
   cabinet seam resolve. Now **scroll out slowly** and watch the grid dissolve
   into a flat surface somewhere around 1.5 m without a flicker of moiré, then
   scroll back in.
4. **← / →** four times: amber → ember → teal → violet and back. The wall
   crossfades over 1.2 s and the light it throws on the floor changes with it.
5. **Drag** to orbit to the azimuth limit and look along the wall — the lamps
   resolve on the near side and dissolve toward the far side. Then let go and
   **wait 8 s**: the room starts breathing.
6. Two checks worth 20 s: switch to another tab and back (nothing renders while
   it is hidden), and turn on DevTools → Rendering → emulate
   `prefers-reduced-motion: reduce` and reload — the room is a still, and every
   key, button and drag still works.
7. **Esc** leaves, or the exit link top-left.

## Known limits

- **drei's `MeshReflectorMaterial` never disposes its own two 512² render
  targets or its blur pass** — it creates them in a `useMemo` with no cleanup.
  Its three textures are freed when the context goes (R3F calls
  `forceContextLoss` on unmount, and the three-cycle test confirms a fresh
  context is still obtainable), but the framebuffer handles are drei's to leak,
  not reachable from here. Everything this demo owns — the render target, the
  offscreen scene, all four materials and the triangle geometry — is disposed
  explicitly.
- **A window resize does not re-frame a preset.** The aspect fit is applied when
  a preset is chosen, deliberately: re-running it on resize would yank a visitor
  who had orbited away. Pressing the preset again re-frames.
- **The close view depends on what the loop is doing.** At 0.9 m you are looking
  at roughly a metre of a wall whose content is mostly near-black; if a flare is
  not passing, the lamps are dim. They are always *there* — the structure reads
  at any brightness — but the view is at its best a few seconds either side of a
  wisp.
- **The wall is emissive at 1.35× the site's own values, not 5×.** The aura's
  dynamic range is about 65:1 in display values, so any gain large enough to
  clip the flares to white lifts the smoke's body to a light grey first. The
  piece keeps the shader's colour instead of chasing a blown-out highlight; if a
  more dazzling wall is ever wanted, `LED.intensity` is the knob and
  `BLOOM.luminanceThreshold` has to move with it.
- **Pinch-dolly on a real phone was not tested by hand** — only through CDP touch
  emulation, which does drive it correctly. `CAMERA.dollySpeed` is the knob if it
  feels wrong under a thumb.

## For the director

Nothing to change in a shared file. The route folder, `public/wall/cover.webp`
and this report are the whole diff. The cover is a real capture of the finished
piece (oblique, amber, 10.0 m, chrome hidden), 800 × 1000, 31 KB, and it holds up
at the card's 220 px.

## Round 2 — the room, the back of the wall, the camera

Brief `round2/04-wall-room.md`, built 2026-09-11. Route is now
`/graphic-designs/wall`, folder `src/app/(immersive)/graphic-designs/wall/`.
Two commits: `fix(wall): keep the eye above the floor at long dolly` (the audit
fix) and `feat(wall): endless ground, no figure, the back — cabinets, cabling,
support`. No shared file touched, nothing installed.

**Measured on a different machine than round 1** — an AMD Radeon integrated GPU
(`ANGLE (AMD, AMD Radeon(TM) Graphics, D3D11)`), not the GTX 1660 SUPER. The
absolute frame rates below are that GPU's, and they are compared against the
same demo's round-1 code on the same GPU, measured in the same session.

### Audit

Every path in "How to test it in two minutes" was driven over CDP in headless
Chrome on the real GPU before anything changed. Of the brief's four suspects:

- **The idle drift and a HUD click** — not a defect. Tracked the wall's left
  edge across timed frames: drifting (516 → 526 px over 1.5 s), then after a
  click on the loop arrow the edge holds at 526 for the next 4.5 s. The click
  drops the drift and restarts the 8 s count, which is the documented contract.
- **The `RectAreaLight` lights nothing behind the wall** — true, and it is §3's
  work, not a fix.
- **drei's reflector leak** — documented, untouched.
- **Resize not re-framing** — by design, untouched.

One real defect, fixed in its own commit: **at the far end of the dolly a drag
to the polar limit put the eye under the floor.** At 14 m and 100° the camera
sits at y = −0.83 m; the ground plane is single-sided and simply vanishes,
leaving the room seen from beneath. `CameraRig` now tightens the polar limit
with distance so the eye keeps `CAMERA.floorClearance` (0.3 m) above the ground,
and — because camera-controls only clamps when asked — nudges an out-of-range
polar back with its own damping. Verified at 20 m: a full drag up stops with the
floor still under the camera.

### What changed, and why

1. **No figure.** `ROOM.figure` and both meshes are gone. Scale now comes from
   the riser, the cabinets, the cabling, the support and the ground.
2. **An endless ground.** The floor is 400 m square and the room has no walls:
   `scene.fog` is a linear fog to black from 10 to 40 m, so every preset (all
   inside 7 m) keeps the pool of light untouched, and by 40 m the ground is
   gone. drei's `MeshReflectorMaterial` injects at `emissivemap_fragment` and
   leaves `<fog_fragment>` in place, so the floor honours the fog in both the
   main and the mirrored render — verified at 20 m: the horizon is black, no
   edge anywhere. `LedWallMaterial` and the pilot light are not opted in, so the
   face stays bright at any distance while the ground under it fades. The
   backdrop cylinder and `backdrop-material.ts` are deleted. The optional floor
   grid was **not** added: with the cabinets, the rig and the pool of light the
   ground does not read as a void, and a grid would have read as a UI.
3. **The camera goes round the back.** Azimuth is unlimited, polar 55°–100°,
   dolly 0.6–20 m, truck still off. A keyboard walk: `a` / `d` orbit at 40°/s,
   `w` / `s` dolly at 70 % of the current distance per second, held keys, fed
   through camera-controls' own damping so a release glides to a stop. The keys
   are tracked in `App` (keydown / keyup, cleared on window blur so an alt-tab
   never leaves a key stuck), cross to the rig through `WallBus.setWalk`, and a
   held key holds the idle count at zero so the drift never starts under your
   hand. Under reduced motion the walk still works, without the damping tail.
4. **A fourth preset, `back` (key `4`, `retro` in Italian):** 6 m behind the
   wall, eye height, level, `fit: true`. In the pager and in `aria`.
5. **The back is modelled**, all of it laid out from `LED_CABINETS` so it can
   never disagree with the front (`components/wall-back.ts`):
   - the 72 cabinets are now the wall's body — one merged geometry (body, a
     rear lip standing 12 mm proud, a connector block lower-right, a handle
     recess upper centre) coloured per part by vertex colour, instanced 72
     times, one draw call. The bodies are a full pitch wide so they touch —
     the 4 mm gap lives in the lips, where it is seen. (A first cut left the
     gap in the bodies too, and from behind the lit floor in front showed
     through the wall as a bright slit.)
   - a power and a data lead droop between neighbouring connectors along each
     row — one quadratic-bezier tube pair, instanced 66 times, one draw;
   - one loom per row leaves the left-hand cabinet, drops to the riser, runs
     along it and steps down to the processor — six Catmull-Rom tubes merged,
     one draw;
   - ground support: four square-section uprights behind the wall, an
     outrigger from each to the floor, feet, a bracket bolting each upright to
     the riser's back, and two horizontal rails — 22 instances of one unit
     box, one draw;
   - a processor case on the floor behind the riser at the right, with one
     amber pilot light on its back (two draws).
   Six draw calls for the whole back; `dispose()` frees every geometry and
   material.
6. **A service light.** A second `RectAreaLight` of the wall's size stands
   2.4 m behind it and shines at the cabinet backs, tinted by the loop like the
   front one, at 60 % of the front's intensity. See the deviation below.
7. **The oblique preset is back on the right** (+35°, as the brief had it) now
   there is no figure to keep out of the frame; it still holds the whole wall.
8. **Spec line:** `ground support · daisy-chain` added, in the trade's English
   in both locales. The line reserves 33 rem for the four-button pager so it
   never runs under the controls; at 1600 px it wraps to two lines.
9. **Cover** re-captured: oblique, amber, 13 m, chrome hidden — the figure was
   in the old one. 800 × 1000, 8 KB.

### Deviations, and why

- **The back is lit at 60 % of the front, not 10 %, and its greys are lifted.**
  At `#0b0b0d` (linear ≈ 0.003) under a 10 % light the back was black — the
  first screenshot showed nothing but the pilot light. A near-black albedo
  under a dim light is simply black; there is no exposure that reads. The
  cabinets are now die-cast greys (`#1c1c20` body, `#34343a` lip, `#2a2a30`
  connectors, `#26262b` support) at metalness 0.5, and the light at 0.6. It
  reads as a dark service side — the front pool is still five stops brighter.
  `ROOM.backLight.ratio` and `BACK.colors` are the knobs.
- **The processor is on the floor behind the riser, not on it.** On the riser
  top a 2U case intersects the bottom row of cabinets; behind the riser it sits
  where a real one would, and the looms step down to it.
- **The phone presets now land at 20 m, not 14.** `maxDistance` rose to 20 for
  the walk, and the aspect fit is capped at it. On a 390 px phone the whole
  wall is now inside the frame with black either side (78 % of the width),
  where round 1 filled the width with the outer edges cropped. The composed
  version is the more honest one; if the larger crop is wanted back, a separate
  fit cap is a two-line change in `applyPreset`.
- **The back preset targets eye height, not the wall's geometric centre.** 1.6
  against 1.8 m — 2° of tilt over 6 m — so the gaze stays level like the other
  wide views and verticals stay vertical.

### New tunables

All in `wall.config.ts`:

- `ROOM.floorSize` 400 · `ROOM.fog` `{ near 10, far 40 }` ·
  `ROOM.backLight` `{ ratio 0.6, distance 2.4 }`. `ROOM.backdrop*` and
  `ROOM.figure` are gone.
- `WALL.bodyDepth` is now the cabinet depth, 0.12.
- `BACK` — `gap`, `lipDepth`, `lipWidth`, `connector`, `handle`, `cable`
  (`powerRadius`, `dataRadius`, `sag`, `dataLift`, `loomRadius`,
  `loomSpacing`), `support` (`count`, `section`, `height`, `standoff`,
  `outriggerFrom`, `outriggerReach`, `outriggerSection`, `railY`,
  `railSection`, `foot`, `bracket`), `processor` (`size`, `x`, `z`, `pilot`),
  `colors`, `roughness`, `metalness`.
- `CAMERA` — `minPolar` 55, `azimuthLimit` `Infinity`, `maxDistance` 20,
  `floorClearance` 0.3, `walkDegrees` 40, `walkRate` 0.7.
- `PRESETS[3]` (`back`).

### Verification

CDP, headless Chrome on the real GPU (AMD Radeon iGPU), 1600 × 900 at DPR 1.5,
draw calls counted by wrapping the four `draw*` entry points:

| | fps (round 1 code, same GPU) | fps (now) | draws / frame |
|---|---|---|---|
| front | 43 | 43–55 | 41.5 |
| oblique | 42 | 42–59 | 41.5 |
| close | 22 | 23–28 | 38 |
| back | — | 36–49 | 41 |
| 20 m | — | 61 | — |

Two runs are quoted because the sibling sessions were driving their own
browsers on the same GPU at the time; in every pair the new build was no
slower than round 1's on the same view. Draw calls are under the 60 budget
everywhere (the composer and the reflector's mirror pass are inside the count).

- **A full 360° drag** from the oblique, three screen-widths of it, and a 360°
  from the back: no edge, no seam, no console error. `wasd`: `a` held 2 s
  orbits to the wall's end; `w` held 1.5 s dollies 7 → 1.1 m; `d` + `s` land
  at 12.4 m from the front.
- **Max dolly, 20 m:** black horizon; a full drag up stops with the floor still
  under the camera.
- **Reduced motion:** 0 draws at rest; `4` cuts to the back within 500 ms; a
  held `a` walks; a loop switch repaints once and goes quiet (0 draws in the
  following second).
- **Software (SwiftShader):** 0 draws at rest, the back preset reframes, the
  back renders without bloom.
- **Phone, 390 × 844 at DPR 2, touch:** front lands at 20 m with the whole
  wall in frame; a one-finger swipe orbits to the wall's end; a pinch-open
  dollies 20 → 15.4 m; a tap on `retro` goes to the back. The spec line drops
  its wide segments (cabinets, rig, loop) as before.
- **Exit / re-enter ×3** from `/graphic-designs`: heap 29.9 → 33.9 → 33.6 MB on
  the three entries (flat after the first), one canvas on each exit, a fresh
  WebGL2 context obtainable afterwards, no errors, no warnings beyond R3F's
  `THREE.Clock` notice.
- `npx tsc --noEmit` clean; `npx eslint` on the folder zero findings.
  `npm run build` was **not** run — the darkroom and hands sessions were live in
  the same tree throughout.

### How to test it in two minutes (round 2)

1. Open the demo. Press **4**: the camera swings round to 6 m behind the
   wall — cabinet backs, lips, the two leads drooping between every pair of
   connectors, the six looms dropping on the left and running to the processor
   on the floor at the right with its amber pilot, the uprights, the
   outriggers, the rails. **Scroll in** to a cabinet back.
2. Hold **a** or **d** and walk right round; hold **w** / **s** to close in
   and back off. Let go: the camera glides to a stop.
3. Press **1**, then **scroll out to 20 m**: the ground fades to black with no
   edge, the wall the only thing in the world. Drag up as far as it goes — the
   floor stays under you.
4. Press **2**: the oblique from the right, the reflection under it, one
   outrigger foot just showing past the wall's end.
5. **← / →** with the back in view: the service light changes hue with the loop.

### Known limits (new)

- **At 0.6 m behind the wall the camera is inside the support** — between the
  rails and the uprights. Nothing clips badly, but the view is two cabinet backs
  and a lip. It is the visitor's own choice; `CAMERA.minDistance` is the knob.
- **The handle recess is a dark plate, not a cut** (`ponytail:` in
  `wall-back.ts`). Past arm's length it reads identically; a real recess would
  need a hole in the body and a second material.
- **The looms are one tube per row, not a power and a data lead each.** Two
  leads run between the connectors; from the row's end down and along the
  riser they are one loom. Real installs tape them together there.
- **No collision with the geometry.** The camera can pass through an upright
  or an outrigger when orbiting close behind the wall.

### For the director (07-release)

- The **hands** session's commit `b36bf6a` swept this folder's
  `components/backdrop-material.ts` deletion into itself — I had `git rm`'d it
  and the sessions share one index. At that revision `WallScene.tsx` still
  imports the file, so `b36bf6a` alone does not compile; the tree is consistent
  again from `feat(wall): …` onward. Nothing to do unless bisecting.
- Nothing to change in a shared file.

## Round 2b — the loops and their colours, visible

Brief `round2/05-wall-loops.md`, built 2026-09-11 on the same AMD Radeon
integrated GPU as round 2a (`ANGLE (AMD, AMD Radeon(TM) Graphics, D3D11)`).
Two commits: `fix(wall): phone pager no longer wraps a label in two` (the audit
fix) and `feat(wall): palette row, cabinet wipe on switch`. No shared file
touched, nothing installed; `VARIANT_PALETTE` is still imported read-only.

### Audit

`npx tsc --noEmit` clean and eslint zero findings before any change. Driven
with agent-browser on the real GPU, console captured: front, back (`4`), eight
loop switches, `1`, the Tab order, Esc → index → card three times (heap 38.8 /
31.3 / 33.0 MB on the three entries, one canvas each, no errors), reduced
motion (0 draws at rest, after a preset cut and after a loop switch), and a
390 × 844 phone at DPR 2 in Italian.

One real defect: **on the phone the pager broke `da vicino` onto two lines.**
The four views and the loop switcher shared one 358 px row. Fixed in its own
commit: labels are `nowrap`, the pager takes the full width with the loop under
it, the spec line moves up. The feature commit then turns that second row into
the palette.

### What changed, and why

1. **A palette row instead of `← amber →`.** Bottom-right, one button per
   `LOOP.variants` entry: a lamp (a 7 px disc in the variant's `hot` colour,
   from `VARIANT_PALETTE` as sRGB, unconverted) with the name under it. The
   current one is ringed in `--ink`, the others in `--ink-dim`: an `outline`
   3 px off the disc, so the ring floats around the lamp. Same `wall-key`
   register as the pager: mono lowercase, `--ink-ghost` → `--ink` on hover,
   focus and selection, the amber underline on `:focus-visible`,
   `aria-pressed`, group label `loop palette` / `palette del loop`. The names
   sit on the pager's baseline, the lamps stand above them. Click or tap
   selects; ← / → still cycle. The spec line still reads
   `loop: liminal field / amber`.
   - **Layout.** One row beside the pager above 1280 px; stacked under the
     pager, right-aligned, up to 1280 px; on a phone two rows of four in equal
     columns, so each view sits over a palette. Under `pointer: coarse` every
     key is at least 44 × 44 px.
   - **Copy.** `prevLoop` / `nextLoop` went with the arrows. `loopAria` is now
     `loop palette` / `palette del loop`; the stage `aria` says the left and
     right arrows or the swatches change the palette, and the key line reads
     `← → palette`.
   - **No fifth "white" loop.** The site's white field is not another palette
     of the smoke: it is `AuraMaterial`'s other branch, orbs whose centres come
     from the JS physics sim in `Aura.tsx` through `u_blobs`. Putting it on the
     wall means porting that sim into the loop source, which is out of scope, as
     the brief says.

2. **A switch is a wipe across the cabinets.**
   - **No blit: two targets trade places.** `WallScene` allocates a second
     `useFBO(1024, 512)`, once, and drei disposes it with the first on unmount.
     The loop draws into one target; at a switch the other becomes live, and
     the frame that was on the wall stays behind, untouched, as the snapshot.
     That is the brief's memory budget with nothing copied at all. three's
     `copyTextureToTexture` reaches a render-target source through
     `copyTexSubImage2D` out of a HalfFloat framebuffer, a path I did not want
     to depend on across GPUs, and a swap leaves no hitch to measure. The newly
     live target is painted in the same frame, before the wall samples it.
   - **The front.** `LedWallMaterial` gains `uSnapshot`, `uWipe`, `uWipeDir`
     and `uWipeWidth`: the live content uncovers the snapshot along a
     `smoothstep` front one cabinet wide (`LOOP.wipeCabinets`), crossing the
     wall in `LOOP.switchSeconds` (1.2 s, eased in and out). It reads each lamp's
     own sample position, so up close the front steps lamp by lamp. At rest the
     front stands past the far edge; the cost is one texture fetch.
   - **The direction follows the hand.** → and a swatch to the right of the
     current one wipe left to right; ← and a swatch to the left, right to left
     (`WallBus.setLoopSweep`, read by the scene when the change lands).
   - **The colour behind the front settles in 0.4 s, not 1.2 s**
     (`LOOP.paletteSeconds`), which is a deviation. If the live palette tweens
     as long as the front travels, the step at the front is only as big as the
     tween has got: a quarter of the way across it carries a quarter of the
     change, and the wipe reads as a tint seeping in that only becomes an edge
     past the middle. At 0.4 s the edge carries about 90 % of the change by the
     second cabinet. It stays a tween rather than a cut because the tween is
     what keeps a switch during a switch smooth.
   - **The lights follow what the wall shows**, also a deviation from "follow
     the live palette". Both `RectAreaLight`s take the snapshot's accent mixed
     toward the live one by how far the front has crossed. With the palette
     settling in 0.4 s, following it alone would light the floor in the new
     colour while most of the wall still showed the old. The floor's reflection
     needs nothing: it re-renders the wall.
   - **A switch during a switch does not restart the front.** There is one
     snapshot, and restarting would pop everything the front has not reached
     yet. The front keeps going; the colour it uncovers retargets from wherever
     it is.
   - **Reduced motion and the software path cut**, as before. A restored WebGL
     context also lands a switch in flight at once, since its snapshot came
     back empty.

3. **"As vivid as the index": measured, and left alone.** "Liminal Field" open
   on `/xperiments` and the wall at the front preset, both at 1600 × 900 in
   amber. The table gives linear luminance and display-referred chroma over the
   content: the row above its caption, the wall face inset by 50 px.

   | | p50 lum | p99 lum | p50 RGB | p99 RGB | chroma of the brightest 5 % |
   |---|---|---|---|---|---|
   | row, 3 frames | 0.0115–0.0118 | 0.021–0.024 | 32 27 23 | 48–52 38–41 27–29 | 19–21 |
   | wall, 2 frames | 0.0123–0.0125 | 0.025–0.038 | 34–35 28 22 | 54–70 42–51 31–32 | 25–35 |

   The wall is already a little brighter at the median, brighter in the flares
   and more saturated. That follows from the pipeline: the row writes the
   shader's bytes at gain 1, while the wall decodes them, applies
   `LED.intensity` in linear light, and the bloom adds on top. The wall is
   neither dimmer nor duller than the row, so **`LED.intensity` stays 1.35 and
   `BLOOM.luminanceThreshold` stays 0.045**. Any higher gain is the step §Colour
   describes as lifting the smoke's body toward beige, and nothing here asks for
   it. On `/xperiments` the row also sits over the grey orb field, which makes
   it look lighter than it measures.

### New tunables

- `wall.config.ts`: `LOOP.switchSeconds` 1.2 is now the time the front takes to
  cross the wall; `LOOP.wipeCabinets` 1 is its width in cabinets;
  `LOOP.paletteSeconds` 0.4 is how long the colour behind it takes to settle.
- `wall.css`: the 1280 px breakpoint where the controls stack, and the width the
  spec line leaves them (`42rem` beside the one-row strip, `26rem` beside the
  stack).

### Known limits (new)

- **The snapshot is a still.** Ahead of the front the smoke pauses for at most
  1.2 s; at the loop's pace (`u_time × 0.035`) nothing visibly moves in that
  time.
- **A switch during a switch does not wipe again.** A fast double press is one
  wipe whose colour changes on the way, and a press just before the front lands
  is mostly a 0.4 s crossfade on the side already swept. The front also keeps
  its first direction.
- **The 44 px touch targets were checked by geometry, not by a finger.**
  agent-browser's device emulation does not set `pointer: coarse`, so on the
  emulated phone the pager keys measured 88 × 30 and the swatches 88 × 46; the
  `pointer: coarse` rule is what lifts every key to 44 px on a real touch screen.

### Verification

agent-browser, headless Chrome on the real GPU, 1600 × 900 and Italian unless
stated.

- **Four switches each way** by key, 1.5 s apart: amber → ember → teal → violet
  → amber, then back, ending where it began both ways. Frame pacing across all
  eight, sampled on `requestAnimationFrame`: 60 fps, p50 16.7 ms, p95 17.1 ms,
  max 17.5 ms, the same as the page at rest (max 17.4 ms). Headless Chrome is
  vsync-locked here, so this shows no dropped frame and no hitch at a switch
  rather than headroom. Draw calls: 41.5 per frame at rest and 41.5 during a
  switch, the same as round 2a's front view, because the snapshot is a swap
  and not an extra pass.
- **The front, measured.** Eight columns across the wall were read straight
  from the default framebuffer after each frame's final draw, every ~120 ms.
  ← from amber: the right-hand column turns at 250 ms and the left-hand one at
  999 ms, each column flipping within one sample. → from violet: left to right
  at the same pace.
- **A switch during a switch**: → at 0 ms and → again at 450 ms. The front kept
  going. The columns it had not reached stayed violet until it got there, with
  no pop; the side already swept retargeted from amber to ember, and the wall
  landed on ember at about 1.1 s.
- **Keyboard on the swatches.** Tab order: exit → the four views → amber →
  ember → teal → violet. Enter on ember selects it; Tab then Space selects teal;
  Shift+Tab twice then Enter returns to amber. `aria-pressed` follows each time.
- **Reduced motion.** → is a cut: the first frame after the press shows the
  whole wall in the new palette.
- **Phone, 390 × 844 at DPR 2**: the pager and the palette are two rows of four
  across 358 px, the swatches 88 × 46, and the spec line ends 23 px above the
  controls. At 1024 px the controls stack at the right and the three-line spec
  line ends 49 px short of them; at 1366 px and 1600 px they are one row, 36 px
  clear at both.
- **English**: `front oblique close back`, then `amber ember teal violet`; group
  `loop palette`; key line `← → palette`. The strip is 521 px wide at 1600 px,
  against 585 px in Italian.
- **Software** (SwiftShader, `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device
  (Subzero)))`): 0 draws in 1.5 s at rest; → cuts straight to ember, then 0
  draws in the following 1.5 s; no bloom, as before; no errors.
- **Exit / re-enter ×3** from `/graphic-designs`, with `console.error`,
  `console.warn`, `error` and `unhandledrejection` captured across the client
  navigations: heap 32.1 / 38.2 / 33.9 MB on the three entries; one wall canvas
  on each entry and none on each exit; a switch works after every re-entry; a
  fresh WebGL2 context is still obtainable afterwards. Nothing was logged but
  R3F's `THREE.Clock` notice, once per mount.
- `npx tsc --noEmit` clean; `npx eslint` on the folder, zero findings.
  `npm run build` was not run: 00-shared does not list 05 among the briefs
  that build.

### How to test it in two minutes (round 2b)

1. Open the demo. Bottom-right, beside or under the views: four lamps, amber
   ringed. Click **teal**: the teal smoke crosses the wall left to right behind
   a cabinet-wide edge, and the pool of light on the floor turns with it.
2. From teal, press **←** twice, quickly: one wipe from the right whose colour
   changes on the way, landing on amber.
3. **Tab** to the lamps: Enter or Space picks one.
4. Press **3** and switch from up close: the front steps lamp by lamp.
5. DevTools → Rendering → `prefers-reduced-motion: reduce`: a switch is a cut.

### For the director (07-release)

- Nothing to change in a shared file.
- For 06: the palette row now follows the pager in the Tab order, so the tour
  label "after the pager" lands after the four swatches unless it is placed
  between the two groups.

## Round 2c — "what is a LED wall": the guided tour

Brief `round2/06-wall-tour.md`, built 2026-09-11 on the same AMD Radeon
integrated GPU as 2a and 2b (`ANGLE (AMD, AMD Radeon(TM) Graphics, D3D11)`).
One commit: `feat(wall): guided "what is a led wall" tour`. No shared file
touched, nothing installed; `CONTACT` is imported read-only from
`@/lib/contact` (a data module, no component) for the last station's link.

### Audit

`npx tsc --noEmit` clean and eslint zero findings before any change. Driven
with agent-browser on the real GPU, console captured: front, oblique, close,
back, four palette switches by key, the Tab order (exit → four views → four
swatches), Esc to the index, exit / re-enter ×3 (heap 34.8 / 38.1 / 34.8 MB,
one canvas each, a fresh WebGL2 context after), reduced motion (0 draws and 0
frames at rest, `4` cuts in two frames, a switch settles to 0 draws), and a
390 × 844 phone in Italian (the pager 88 × 30, the swatches 88 × 46, the spec
line 23 px clear of the controls — as 2b measured). **No defect found**, so
there is no fix commit this round.

### What was built

1. **The entry point.** A real `<button>` — `what is a led wall? →` /
   `cos'è un led wall? →`, mono, `--ink-dim` → `--ink` on hover and focus, a
   short hairline leader pointing back at the wall — standing in the room to
   the right of the wall at eye height. It is DOM, not drei `<Html>`: it sits
   in the HUD between the pager and the palette row, so it is literally after
   the pager in the Tab order (the note 2b left), and the camera rig places it
   every frame through the bus, the way the live distance is written — a
   projected point, half-pixel dead-banded, no React render. It hides while the
   tour runs, while the camera is within 1.5 m of the wall (`TOUR.labelHideWithin`),
   when the wall itself is in the line of sight (a ray against the wall's box),
   and behind the camera. Key `i` opens the tour too.
2. **Six stations** (`TOUR.stations`, poses in the presets' own shape): front
   7 m · close 0.9 m lower-left · an oblique from the right, nearer than the
   preset, the near end cropped on purpose so the seams converge · behind at
   5 m, a touch off the axis for depth · wide at 12 m and 3.4 m up, 17° off
   the axis · front 7 m again. `flyTo(pose, animate)` in `CameraRig.tsx` is the
   rig's own tween — `TOUR.flightSeconds` 1.4 s on `cubic-bezier(0.22, 1, 0.36, 1)`,
   evaluated by a small Newton solver rather than importing `src/lib/motion.ts`,
   which would pull GSAP into this chunk — written to the controls without a
   transition so their damping adds no lag. A step mid-flight starts a new
   flight from wherever the camera is. When the camera already stands on the
   pose (the tour opened from the front preset) there is nothing to fly and
   the station counts as reached at once.
3. **The card.** DOM, bottom-left above the spec line: a mono index `03 / 06`,
   a serif title, two or three mono lines in `--ink` on a soft dark pool, then
   `next →` · `← back` · `× close` in the `wall-key` register, and on the last
   station `commission a loop →` / `commissiona un loop →` — a `<Link>` to
   `CONTACT.contactHref`, in `/about`'s CTA register. `next` is absent on the
   last station and `back` on the first. The card goes off the moment a step
   is taken (the old words fade out in 0.25 s) and comes back with the new
   station's text 300 ms after the camera has landed (`TOUR.cardDelayMs`),
   fading in over 0.7 s. "Landed" is reported by the rig through
   `bus.settle(station)` when its flight ends, not guessed by a timer, so the
   words always follow the room.
4. **Staging.** Station 2: once settled, the lamps dissolve to a flat surface
   and resolve again over 2 s (`LedWallMaterial.setContrast`, both levels
   re-solved so the wall's brightness never changes — `ledDotLevels()` in the
   config). Station 4: the service light at ×2, eased in at `damp` λ 6 and
   back on leaving. Station 5: the loop steps to the next palette on arrival —
   the wipe from 2b, so the colour change is the wall's own event. None of it
   on the still paths.
5. **Navigation.** Wheel or a vertical one-finger swipe → next / previous —
   one step per gesture, then a 0.9 s cooldown that swallows a trackpad's
   inertia (`TOUR.wheelStep` 40 px, `TOUR.stepCooldownMs`, `TOUR.swipePx` 48).
   `↓` `Space` → next, `↑` → previous; `Esc` closes the tour and a second `Esc`
   exits the demo (in the stage `aria` and on the close button's label);
   `← →` and the swatches keep switching the loop mid-tour. While touring the
   rig takes the wheel and both touch gestures off camera-controls
   (`setTouring`), a mouse drag still orbits, and the idle drift is held off.
   Choosing a view (a key or the pager) or pressing a walk key is taking the
   wheel: it closes the tour and does what it says.
6. **Focus and the live region.** Focus lands on the card when the tour opens
   (`tabIndex` −1) and goes back to the label on Esc or the close button —
   the label reappears on the rig's next frame, so the return waits one; if
   it is hidden there (closed within 1.5 m of the wall) the stage takes the
   focus instead. A polite live region reads `station 3 of 6 · Cabinets` /
   `tappa 3 di 6 · Cabinet` when each card comes on. Space on a focused
   button is left to the button, so `next →` never double-steps.
7. **A phone.** At the framed presets the point beside the wall projects
   off-screen on a 390 px viewport, so at or under `TOUR.labelDockBelowPx`
   (560) the rig stops placing the label and the CSS docks it centred under
   the wall — a tick above, the same spot the card opens in. The card is
   centred there too, over the spec line and the two rows of keys; every
   key is 44 px under `pointer: coarse`.
8. **Reduced motion and the software path.** A station is a cut, the card
   comes on at once with no fade, the pulse does not run and the service
   light is set outright; on the demand frameloop nothing draws at rest.

### Deviations, and why

- **The label stands 0.6 m from the wall's edge, not 1.5**, and is kept 16 px
  inside the viewport (`TOUR.labelGap`, `TOUR.labelEdgePx`). At the front
  preset a 16:9 frame holds the wall with little to spare: at 1.5 m the label
  ran off the right edge of a 1600 px window (`— cos'è un`). At 0.6 m it
  ends 24 px short of the edge at 1600 px; on anything narrower the clamp
  slides it left, over the wall's last cabinet at 1280 px.
- **On a phone the label is docked, not in the room** — see 7 above.
- **The "cabinets" station is 3.5 m from its target, not 4 m** — the target
  is 0.6 m right of centre so the near cabinets fill the right of the frame
  and the seams run off to the left; at 4 m from the centre the view lost
  the near end and the seams read as a texture again.
- **The card's timing follows the rig, not a timer** — `bus.settle`, so the
  fade-in is 300 ms after the actual landing, and there is no 1.7 s wait
  when the tour opens from the front preset, where there is nothing to fly.
- **Presets and the walk close the tour; a drag does not.** Looking around
  a station is part of it; taking a view or walking is leaving it.
- **On touch, one-finger orbit and pinch are off inside the tour.** A vertical
  swipe has to mean one thing; with the orbit on, every swipe would also
  tilt the camera off the station before the flight corrected it.
- **Station 5 steps the palette on every arrival**, coming back from 6 too:
  "on arrival" taken literally, and it keeps the colours easy to try.

### New tunables

- `wall.config.ts` — `TOUR`: `flightSeconds` 1.4 · `cardDelayMs` 300 ·
  `labelGap` 0.6 · `labelEdgePx` 16 · `labelDockBelowPx` 560 ·
  `labelHideWithin` 1.5 · `wheelStep` 40 · `stepCooldownMs` 900 · `swipePx` 48 ·
  `pulseStation` 1, `pulse` `{ seconds 2, contrastLow 0.1 }` ·
  `backLightStation` 3, `backLight` `{ boost 2, lambda 6 }` ·
  `paletteStation` 4 · `stations` (six poses; `WIDE_DEG` −17, `WIDE_R` 12,
  `WIDE_Y` 3.4 above them). `ledDotLevels(contrast)` now derives
  `LED_OFF_FLOOR` / `LED_DOT_GAIN` and serves the pulse.
- `wall.css` — the card's bottom offset (5.8 rem; 6.8 rem at ≤ 1280 px where
  the spec line runs to three lines; 10.6 rem centred at ≤ 560 px), its width
  (27 rem) and pool; the docked label's position (the same 10.6 rem).
- `copy.ts` — `tour.*`: the label, the card's `aria`, `next` / `back` /
  `close` / `closeAria`, `station` / `of` for the live region, `cta`, and
  the six stations' `title` + `lines`, EN and IT.

### Known limits (new)

- **A trackpad flick with more than 0.9 s of inertia can add a second
  step.** `TOUR.stepCooldownMs` is the knob; the keys are never affected.
- **The 44 px targets and the docked label were checked by geometry**, as in
  2b: the emulated phone reports no `pointer: coarse` and no touch points,
  so the swipe was driven with synthetic touch pointer events on the canvas.
- **Closing the tour within 1.5 m of the wall leaves focus on the stage**,
  not the label, because the label does not show there (station 2 is at
  0.9 m). `i` reopens from anywhere.
- **The stations are not addressable** — no deep link, and the tour always
  starts at 1. The wheel and the swipe stop at the ends rather than wrapping.
- **On a phone the wide stations land at 20 m** (the presets' aspect fit,
  capped at `maxDistance`), so the wall is small under the centred card;
  stations 2 and 3 are the ones that fill the screen.
- **The drift is held off for the whole tour**, however long a station is
  left open; it resumes 8 s after the tour closes.

### Verification

agent-browser on the real GPU (AMD Radeon iGPU), 1600 × 900, Italian unless
stated; the software path on a headless Chrome launched with SwiftShader and
attached over CDP.

- **Open by click, by `i`, by keyboard** (Tab to the label, Enter): the card
  comes on with focus on it (`activeElement` = the card), `01 / 06`, live
  region `tappa 1 di 6 · Cos'è`. The label reads `hidden` while the tour runs.
- **All six stations forward and back**: by `↓` the distance reads 7.0 →
  0.9 → 3.5 → 5.0 → 12.1 → 7.0 m and the index, title and live region follow;
  station 5 lands on ember (the palette stepped on arrival); station 6 shows
  `commissiona un loop →` → `/about#contact` and no `next`. By wheel: +120
  steps forward, −120 back, and a burst of five +50 ticks is exactly one step.
  By swipe (phone, synthetic touch pointers on the canvas): 140 px up → next,
  140 px down → back, 20 px → nothing. `next →` and `← back` by mouse and by
  Enter; Space on the focused `next →` steps once, not twice.
- **The pitch station's pulse**: 0.6 s after landing the wall reads as a flat
  surface, 2.2 s after landing the lamps are crisp again (two captures).
- **A loop switch mid-tour**: `→` from station 3 lands on ember with the card
  still on `03 / 06`; a click on the teal swatch at station 1 does the same
  and the spec line reads `loop: Liminal Field / teal`.
- **Esc closes, then exits**: after the first Esc the card is gone and
  `activeElement` is the label (shown again); the second Esc lands on
  `/graphic-designs`. Enter on `× close` does the same as the first Esc.
- **Taking the wheel**: `3` closes the tour and frames the close view (the
  label hidden at 0.9 m); `1` brings the label back; a click on it reopens.
- **Tab order**: exit → front · oblique · close · back → the label → amber ·
  ember · teal · violet; inside the tour the card's keys follow the swatches.
- **The label in the room**: front x 1359 (217 px wide in Italian, 225 in
  English — the English one is what the clamp holds at 1359), oblique 1367,
  back 147 (left of the wall from behind, its leader pointing at it).
- **The drift is off while touring**: with the tour open from the back and
  the room left alone, the wall's left edge (row 400) sat at x 334 at 10.5 s
  and at 13.5 s; after closing, 340 at 9.5 s and 348 at 12.5 s — the drift
  back.
- **Frame pacing during a flight** (station 3 → 4, the oblique to the back,
  sampled on `requestAnimationFrame`): 48 fps, p50 16.7 ms, p95 33.4 ms, max
  33.6 ms on this iGPU — the back's own cost on it (2a measured the back
  preset at 36–49 fps here), not the tween's.
- **Reduced motion**: `i` shows the card within 150 ms; `↓` reads 0.9 m
  within 250 ms (a cut); 0 draws in the following 1.5 s at station 2 and at
  station 4 (no pulse, the service light set outright).
- **Software** (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))`):
  0 draws at rest; `i` opens; `↓` cuts to 0.9 m and 0 draws follow; three
  more reach station 5 with the palette on ember; Esc, Esc leaves; 0 errors.
- **Phone, 390 × 844 at DPR 3**: the docked label centred under the wall at
  [103, 617, 183 × 58], hidden while the card shows; a tap opens; the card
  at station 2 is [16, 412, 358 × 263], the spec line at 711 and the keys at
  752 below it.
- **Exit / re-enter ×3** from the index, opening the tour and stepping to
  station 2 each time: heap 39.1 / 39.6 / 37.3 MB, one canvas on each entry,
  no card left in the DOM after each exit, a fresh WebGL2 context after; 0
  page errors; the console carries nothing but R3F's `THREE.Clock` notice and
  its own `Context Lost` on unmount.
- `npx tsc --noEmit` clean; `npx eslint` on the folder zero findings;
  `npm run build` (allowed this round — no sibling session) passes, all
  fifteen routes.

### How to test it in two minutes (round 2c)

1. Open the demo. To the right of the wall, at eye height: **cos'è un led
   wall? →**. Click it, or press **i**. The card sits bottom-left.
2. **Scroll the wheel once**: the camera goes to 0.9 m and, once there, the
   lamps dissolve and come back. Again: the cabinets from the right. Again:
   the back, lit brighter than usual. Again: the room from wide and high, and
   the palette changes as you arrive. Again: **commissiona un loop →**.
3. **← →** at any station switches the loop. Press **3** to take over; press
   **i** to come back.
4. **Esc** closes the tour; **Esc** again leaves the demo.
5. On a phone the label sits under the wall; a swipe up or down pages.
6. DevTools → Rendering → `prefers-reduced-motion: reduce`: every station is
   a cut and the card just appears.

### For the director (07-release)

- Nothing to change in a shared file.
- The cover is unchanged; it is 07's to re-capture. If the tour should be in
  it, station 3 (the cabinets from the right, card on) is the frame.
