# 01 — Camera Oscura (Darkroom) · build report

Route `/xperiments/darkroom` · folder `src/app/(immersive)/xperiments/darkroom/` ·
cover `public/darkroom/cover.webp` (800 × 1000, < 40 KB) · built 2026-09-07 on
the GTX 1660 SUPER, Next 16.3.4 / React 19.2 / three 0.185 / R3F 9.7 / drei 10.7.
Revised the same day after the director's three review rounds (robustness +
stall guard, ten code-review defects, then a pass-based development mechanism
verified with the director's own scripts) — see *Verification* below.

## What was built

The viewport is a developing tray seen from above, full of still developer. A
black-and-white print lies under the liquid, invisible. Moving the pointer or a
finger drags the liquid; developer is laid down at the pointer and wherever the
liquid itself moves fast enough, and the print develops only there — first a
flat foggy ghost, then the midtones, then the shadows. At 85 % mean exposure
the print is fixed (the remainder eases to 1 in 1.2 s, the HUD says `fixed`),
holds 2.5 s, and the tray drains to a rising black; the next print loads.
Twelve prints, then it loops. Six seconds without input — on any print, touched
or not — a slow current takes over and finishes it; the next input cancels it
again. The only colour is a faint amber safelight top-left.

Mechanics, all on the GPU, every pass one fullscreen triangle:

- **Fluid** — stable fluids (Stam): semi-Lagrangian advection with an explicit
  viscosity blend and no-slip walls, curl + low vorticity confinement, forces
  (pointer, agitation, autonomous current), divergence, 20 Jacobi pressure
  iterations with a warm start, gradient subtraction. Velocity RG16F at 256 on
  the short side (aspect-corrected → square texels; velocities are in
  velocity-texels per second so the physics is isotropic), dye R16F at 512,
  pressure / divergence / curl at the velocity grid; long sides capped at
  2048 and at `MAX_TEXTURE_SIZE`. Fixed 1/60 timestep, sub-stepped up to 3× on
  long frames, one step per frame when a frame exceeds 50 ms (no spiral); a
  longer backlog is dropped, not caught up.
- **Development under the hand** — two terms. A direct one: every frame the
  pointer moved, a soft footprint (`STIR.exposeRadius`) deposits exposure
  scaled by the travel, so a pass over an area develops that area whatever the
  flow does afterwards (the same `brush()` the reduced-motion path uses). And
  the liquid's own: developer dye laid down at the pointer at a rate that
  follows the speed (one pass deposits the same amount however fast the hand
  moves; footprint `STIR.dyeRadius`), and, in a speed band, wherever the liquid
  moves (`MOTION_DYE`: nothing below 8 texels/s, full rate from 200), advected
  and integrated into exposure — the wake, curls and afterglow that make it
  read as liquid.
- **Exposure** — a half-float ping-pong at display resolution (long side capped
  at 1024): `exposure' = min(1, exposure + dye · rate · dt)`. Fixing stops the
  accumulation and eases the remainder to 1. Across a viewport change the buffer
  is remapped in print space (old rect → new rect), so a rotation keeps the
  development on the paper; the fluid grids are carried over too, so a window
  drag never stills the tray mid-gesture.
- **Coverage** — a 32 × 32 RGBA8 target where each texel averages 16 taps of
  exposure over its cell of the print, weighted by the paper's alpha (four of
  the twelve scans are cut-outs), read back with
  `readRenderTargetPixelsAsync` every 250 ms in fluid mode and after every
  stroke in brush mode (a stroke that lands while a read is in flight is
  measured when it resolves). Each read carries a generation number; a read
  issued for a previous print, or before a context restore, is ignored.
- **Composite** — print aspect-fit with a 4 % margin, refracted by velocity
  together with its exposure, development curve (paper lift `1 − (1 − e)^1.6`,
  soft knee from foggy 0.22 to full-contrast 9, shadows last via
  `Dmax = 1 − (1 − e)^2.4`), paper texture in the highlights, static silver
  grain ± 3 % on developed areas (in the paper's own space, so it refracts),
  warm fibre-paper tint that follows the safelight, the dye as an almost
  invisible darker cloud (5 %), the drain, sRGB encode, a specular whisper
  ≤ 0.08 where the surface moves, the amber safelight (≈ 0.10 alpha at the
  core, gone by ~0.6 short-side units), a barely-there vignette. The 1 px rim
  hairline is DOM.
- **Agitation (Space)** — a press bursts (radial push + alternating swirl);
  held, a gentle swirl and a slowly turning shear rock the tray. A rocked tray
  develops evenly: a little developer is laid down everywhere while it rocks.
  A purely visual slosh wobbles the refraction after a rock.
- **Autonomous current / stall guard** — after `AUTO.idleDelay` seconds
  without input, on any print, a slow current orbits an ellipse on the print's
  own extents, breathing from a third to nearly the edge, until the print is
  fixed. It starts at 15 % strength and ramps to full over `AUTO.rampTime`
  (36 s), and carries the same direct footprint a hand gets along its path, so
  any print finishes in bounded time once the visitor stops. Any input cancels
  it; the clock restarts.
- **Brush path** — reduced motion, no renderable half-float target, or a
  software rasteriser (`isSoftwareRenderer` from `src/lib/webgl-caps.ts`): no
  fluid, no timers, no current; the pointer paints exposure with a soft radial
  brush, Space develops the print evenly (0.09 per press, 0.25/s held), prints
  advance only on ArrowRight/ArrowLeft and a visible `next print →` control; the
  frameloop runs on demand (one frame per input). Same engine, one flag — and
  the flag flips on the live engine when reduced motion toggles, keeping the
  print, its index and its development.
- **Prints** — loaded with one retry; a print that will not load is skipped in
  the direction of travel (both at startup and when a drain is waiting on it),
  so the tray never waits on a missing image. Arrow presses during a drain
  re-target the drain instead of being dropped; an arrow before the first print
  has loaded lands on the requested print.
- **Warm-up** — every program is compiled at engine construction (a silent
  step plus zero-strength force passes), so the first visible frame does not
  stall.

Chrome: exit link top-left (`← exit the demo` / `← esci dalla demo`, Escape
too); title cover `Camera Oscura` / `darkroom` on the very first idle state
only (hidden at the first input or when the current begins); centred idle hint
`stir the developer` / `muovi lo sviluppo` with the keyboard line under it
(hidden on coarse pointers), fading on the first input on each print; HUD
`print 03 / 12` bottom-left and `developing 42 %` → `fixed` bottom-right in
`--ink-dim` mono (the count is known before the engine's first publish); a
visually hidden live region announces the fix only. `aria-label` on the stage
describes the interaction and the keys. Escape, ArrowLeft and ArrowRight
ignore modifier combinations (Alt+← stays browser back) and key repeat. A
pointer over the exit link or the next-print control leaves the tray, so
coming back never flicks the liquid. EN + IT, compiler-enforced parity in
`copy.ts`.

Fallbacks: no WebGL 2 → message + exit link, no canvas; `webglcontextlost` →
message + exit, frameloop off, on restore the print starts over; hidden tab →
frameloop `never` (0 rAF while hidden, measured); every GPU resource disposed
on unmount (targets, materials, geometry, textures, the async readback ignored
after dispose; the input bus is cleared so nothing queued reaches a later
engine).

## File map

```
src/app/(immersive)/xperiments/darkroom/
  page.tsx                 unchanged scaffold (generateMetadata from copy, canonical)
  client.tsx               unchanged scaffold (next/dynamic, ssr:false, .darkroom scope)
  copy.ts                  every visitor-facing string, EN + IT (DarkroomCopy)
  darkroom.config.ts       every tunable, one file (PRINTS, SIM, STIR, MOTION_DYE,
                           AGITATE, AUTO, DEVELOP, BRUSH, LOOK, UI)
  darkroom.css             scoped stylesheet (.darkroom …), tokens from :root
  App.tsx                  the chrome: WebGL/mode/visibility state, pointer + key
                           listeners → TrayBus, exit, rim, fallbacks, Hud
  components/
    DarkroomCanvas.tsx     the tray's own <Canvas> (dpr [1,1.5], flat, no AA/alpha/depth),
                           context-lost wiring, capability probe (half-float, software)
    DarkroomScene.tsx      inside the Canvas: owns one DarkroomEngine, flips its mode,
                           resizes it, useFrame(…, 1)
    darkroom-engine.ts     the whole GPU piece: targets, passes, state machine, prints,
                           coverage readback, resize remap, warm-up, disposal
    shaders.ts             GLSL ES 3.00 for every pass
    tray-bus.ts            the one mutable object DOM and GPU share + the HUD store
    Hud.tsx                title cover, idle hint, HUD corners, next-print control
  hooks/
    useReducedMotion.ts    prefers-reduced-motion, synchronous first read
    useTabVisible.ts       document.visibilityState
public/darkroom/cover.webp real capture of a half-developed print (800×1000)
```

Shared imports: `@/lib/locale` (type), `@/lib/webgl-caps` (`isSoftwareRenderer`).

Prints (in `PRINTS`, in tray order): img_025, 009, 005, 042, 031, 008, 012,
007, 029, 006, 001, 039 — the photographic b/w scans of the archive (portrait
under tape, flash bed, poles and wires, grainy figures, tree, hood and van,
lattice, the cut-out figure, the house under orange handwriting, the courtyard
print). The archive holds 54 scans; the tickets, receipts and packaging were
left out.

## Tunables — all in `darkroom.config.ts`

| group | name | value | meaning |
|---|---|---|---|
| SIM | velocityShort / dyeShort | 256 / 512 | grid short sides (texels) |
| SIM | exposureLong / gridLongMax | 1024 / 2048 | long-side caps (exposure / fluid grids) |
| SIM | dt / maxSubsteps | 1/60 / 3 | fixed step, sub-steps per frame (1 when a frame > 50 ms) |
| SIM | pressureIterations / pressureCarry | 20 / 0.8 | Jacobi count, warm start |
| SIM | velocityDissipation / dyeDissipation | 0.995 / 0.993 | per step |
| SIM | viscosity | 0.15 | blend toward the 4-neighbour mean per step |
| SIM | vorticity | 3 | confinement (kept low) |
| STIR | radius / dyeRadius | 0.04 / 0.095 | push radius, developer footprint (short-side fractions) |
| STIR | velocityGain / velocityMax | 1.35 / 420 | pointer speed → target velocity, clamp (texels/s) |
| STIR | dyeGain / dyeMax | 0.02 / 40 | dye rate = speed × gain (one pass ≈ 2·radius·gain), safety cap |
| STIR | pressMultiplier | 2 | pressed / touch |
| STIR | blendRate | 18 | how fast the liquid takes the pointer's velocity (1/s) |
| STIR | exposeGain / exposeRadius / exposeMax | 4 / 0.075 / 0.3 | direct development per unit of travel, its footprint, cap per frame |
| MOTION_DYE | speedLow / speedHigh / rate | 8 / 200 / 1.0 | wake → dye band and rate |
| AGITATE | burst / burstDecay | 500 / 0.35 | key-press burst (texels/s²), decay s |
| AGITATE | holdSwirl / holdRock / rockPeriod | 25 / 20 / 3.6 | held-Space forces |
| AGITATE | holdDye / burstDye | 0.012 / 0.008 | even development while rocking |
| AUTO | idleDelay / strength / rampTime | 6 / 0.15 / 36 | seconds without input before the current (re)starts, its starting strength, seconds to full |
| AUTO | orbitMin / orbitMax | 0.3 / 0.95 | ellipse on the print's extents |
| AUTO | orbitPeriod / breathePeriod | 9 / 17 | seconds |
| AUTO | radius / speed / dye | 0.07 / 150 / 0.3 | the current's splat |
| AUTO | exposeGain / exposeRadius | 1.5 / 0.08 | the current's direct footprint |
| DEVELOP | rate | 1.6 | exposure += dye · rate · dt |
| DEVELOP | fixThreshold | 0.85 | coverage that fixes |
| DEVELOP | fixEase / fixedHold / drain | 1.2 / 2.5 / 1.6 | seconds |
| DEVELOP | coverageInterval / coverageSize | 0.25 / 32 | readback cadence and target size |
| BRUSH | radius / gain / max | 0.075 / 2.2 / 0.28 | reduced-motion brush |
| BRUSH | spacePress / spaceHold | 0.09 / 0.25 | Space in brush mode |
| LOOK | printMargin | 0.04 | print inset in the tray |
| LOOK | refraction | 0.016 | UV offset = velocity × velTexel × this |
| LOOK | slosh / sloshDecay / sloshFreq | 0.006 / 1.2 / 2 | wobble after a rock |
| LOOK | specular / specularSpeed | 0.08 / 260 | additive cap, saturation speed |
| LOOK | grain / paperTexture | 0.03 / 0.02 | ± on developed areas / paper white |
| LOOK | paperWhite | 0.9 | paper reflectance (linear) |
| LOOK | safelightAlpha / safelightRadius | 0.1 / 0.62 | the amber, in sRGB alpha terms |
| LOOK | vignette / dyeShade | 0.28 / 0.05 | rim darkening, dye cloud (halved on review) |
| LOOK.curve | lift / kneeMin / kneeMax / dmax | 1.6 / 0.22 / 9 / 2.4 | development curve |
| UI | hudInterval | 0.12 | HUD publish throttle (s) |

## Verification

`npx tsc --noEmit` clean · `npx eslint "src/app/(immersive)/xperiments/darkroom"`
zero findings. Everything below was driven headless over CDP on the real GPU
(ANGLE D3D11, GTX 1660 SUPER) unless stated, 1440×900, mouse only, no click
unless stated; the driver and scenarios live in this session's scratchpad
(`cdp.py`, `run_happy.py`, `run_paths.py`, `run_extra.py`, `run_accept.py`,
`run_defects.py`, `make_cover.py`) and are trivially re-creatable from the
shared rules' recipe.

### The director's acceptance patterns

Measured with the director's own scripts (`darkroom_check.py`,
`darkroom_raster.py`) where they exist, otherwise with mine (`run_accept.py`).

| pattern | script | time to `fixed` | criterion |
|---|---|---|---|
| centred Lissajous (720,450; 300×230 px; 0.35/0.23 Hz) | director | ~11 s of stirring | ≤ 45 s |
| whole-tray serpentine (9 rows y 70→830, 900 px/s, 18 px wobble) | mine | 12 s | ≤ 45 s |
| slow random walk inside the print (260 px/s) | mine | 12 s | ≤ 45 s |
| 4 s of stirring on print 2, then no input | director | 34 s after input stops | ≤ 60 s |
| fresh print, no input at all | mine | ~31 s from load (current starts at 6 s, gentle first: 4 % at 9 s) | ≈ 40 s |
| brush path (reduced motion, IT) | director | unchanged: paints, `stampa successiva →`, no current, no auto-advance | unchanged |

One caveat on the director's serpentine: `darkroom_raster.py`'s
`serpentine()` re-initialises `row = 0, x = x0, y = y0` on every call and is
called for 3 s at a time, which at 900 px/s covers rows 0–2 only (measured
with a recorder in place of Chrome: y from 52 to 278 over 209 moves). Under
that script the lower two thirds of the print are never passed over and the
coverage plateaus at ~32 % — the rule of the piece, not a stall (the moment
input stops, the current finishes the print: 34 s). The full 9-row raster
above develops the whole print in 12 s. A stir confined to one region does
not develop the rest of the print through the liquid alone: in this 2-D tray
the far-field return flow is too slow to count, and neither 50 Jacobi
iterations nor a lower wake-band floor changed that, so both were reverted.

### Other paths

| path | result |
|---|---|
| keyboard only | Space held → even development, `fixed` after 24 s; → / ← drain then load 03 / 02; Escape → `/graphic-designs` |
| touch, 390×844 @3× (DPR capped → canvas 585×1266), locale IT | `stampa 01 / 12`, `in sviluppo … %` → `fissata` at 14 s with a slow finger circle; keyboard line hidden |
| EXT_color_buffer_float removed (getExtension override) | brush path, same behaviour |
| software WebGL (SwiftShader) | detected → brush path, paints (the fluid ran at ~4 fps there before the detection) |
| no WebGL 2 (getContext override) | message + exit link, no canvas |
| context lost (WEBGL_lose_context) | message + exit, frameloop off; on restore the HUD returns and the print starts over |
| hidden tab (visibilityState override) | rAF/1.5 s: 113 visible → 0 hidden → 113 back |
| `/graphic-designs` → card → demo → exit ×3 | one canvas left each time (the site's field), JS heap 25 / 26 / 26 → 24 MB after; console clean apart from three's own `Context Lost.` log when R3F frees the context |

### Code-review defects (part 2), each with its regression

| # | defect | regression |
|---|---|---|
| 1 | a print that fails to load left the tray draining forever | prints 1 and 3 blocked at the network: tray opens on print 02, → skips to 04, ← returns to 02, stirring develops |
| 2 | an arrow before print 0 loaded was cancelled by print 0's callback | 2.5 s latency emulated, → pressed before the first image: lands on print 02, developing |
| 3 | resize copied exposure 1:1 and wiped the fluid | at 76 %, 1440×900 → 900×1440: 79 %, development on the paper (capture); resizing 8 px every 300 ms mid-stir keeps developing |
| 4 | brush mode never measured the last stroke | reduced motion, painting stopped dead: HUD `fixed` with no further input |
| 5 | a stale readback could fix a fresh print | at 79 % press →: print 02 shows `developing 0 %` |
| 6 | fluid grids uncapped at extreme aspects | 2000×250: canvas 2000×250, developing, `getError()` 0 |
| 7 | local software-renderer regex | replaced by `isSoftwareRenderer` (`src/lib/webgl-caps.ts`); SwiftShader → brush path |
| 8 | pointer parked over the exit link teleported on return | park on the link, jump to the centre: `developing 0 %` |
| 9 | a reduced-motion toggle rebuilt the engine at print 0 | print 02 at 38 %: brush shows the same print and 38 % with `next print →`, back to fluid at 40 %, keeps developing |
| 10 | modifiers and key repeat not guarded | Alt+ArrowLeft: still print 01; a held ArrowRight (12 repeats): print 02 |

Lower-priority items also done: the HUD never shows `print 01 / 00` (count
comes from the config), the frameloop is `never` during context loss, all
programs compile in a warm-up at construction, sub-stepping is capped by wall
time. Console during all runs: only `THREE.Clock: This module has been
deprecated` once per Canvas mount — emitted by R3F 9.7's store against three
0.185, shared by every R3F canvas on the site, not addressable from a demo.

## Known limits

- The scans are ≤ 640 px on their long side and are shown at up to ~830 px,
  so the paper is soft; the grain and paper texture carry it, but a larger
  archive would sharpen the piece.
- Development follows what the liquid did: a hurried pass leaves softer
  development at its edges until the wake, the next pass or the current reaches
  them — the rule of the piece, not a defect (verified by viewing the raw
  exposure buffer).
- The autonomous current always finishes a print; on a very wide print it
  reaches the far corners last (the ellipse follows the print's extents).
- Half-float render targets are required for the fluid; devices without
  `EXT_color_buffer_float` / `_half_float` get the brush path (exposure in
  RGBA8 there).
- In `next dev`, Next's dev-tools badge sits over the bottom-left HUD; not
  present in production.
- Timings above are from a mechanical pointer; humans stir less methodically,
  so expect 10–30 s for a natural full development, and about half a minute
  once the visitor stops (the current finishes it).

## How to test it in two minutes

1. Open `http://localhost:3000/graphic-designs`, click **Camera Oscura**.
   Black tray, a faint amber glow top-left, `stir the developer` in the middle.
2. Move the pointer (no click) over the print in slow loops. The paper comes up
   as a foggy grey ghost where you pass, refracting under the moving liquid;
   keep going and the midtones then the shadows arrive. Watch the bottom-right
   percentage. At 85 % it says `fixed`, holds, the black rises, print 02 loads.
3. Stir print 02 for a few seconds, then stop: after six seconds a slow current
   takes over and finishes it on its own.
4. Hold **Space** on print 03: the tray rocks and the print comes up evenly.
   **→** drains and loads the next, **←** the previous. **Esc** leaves.
5. DevTools → Rendering → `prefers-reduced-motion: reduce` (no reload needed):
   the same print continues on the brush path — the pointer paints, a
   `next print →` button sits bottom-centre, nothing advances by itself.
6. Device toolbar, a phone: drag a finger. Rotate the viewport mid-development:
   the developed image stays on the print. Exit and re-enter a couple of times
   with the console open: nothing but three's context-lost log.

## Shared files — nothing pending

No dependency, header, token or dictionary change is needed. The demo imports
the director's `isSoftwareRenderer` from `src/lib/webgl-caps.ts` and relies on
the director's `(immersive)/layout.tsx` + global rule for the scrollbar gutter
(the demo's own local rule was removed).

## Deviations from the brief's technical plan, and why

- Render targets are owned by the engine class rather than drei `useFBO`: the
  ping-pong swaps and the print-space remap of the exposure on resize live in
  one place, and `useFBO` would re-create and drop the exposure on a size
  change.
- Coverage uses one 32 × 32 downsample pass plus `readRenderTargetPixelsAsync`
  (a PBO + fence, no pipeline stall) rather than a mip chain.
- Development under the hand has a direct, pass-based term (a travel-scaled
  footprint written straight into the exposure buffer, as the brush path does)
  beside the dye: dye alone could be carried off by a fast pass's own flow
  before it exposed the paper. The dye is deposited at a rate ∝ speed (a pass
  deposits the same amount however fast the hand moves) and "developer that
  moved" is a speed band, not a linear ramp.
- Agitation also lays down a little developer everywhere while the tray rocks
  (a rocked tray develops evenly); pure velocity injection could not develop a
  print through the keyboard path in an incompressible 2-D sim.
- The autonomous current is also the stall guard: it resumes on any print after
  the idle delay (the director's amendment to the brief), ramps from 15 % to
  full strength over 36 s of continued idleness, carries the same direct
  footprint as a hand, and orbits an ellipse on the print's extents so tall
  prints finish too — any print finishes in bounded time once input stops.
- Software rasterisers are routed to the brush path (the site's field makes the
  same call); the brief only asked that the no-GPU behaviour be exercised.
