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
