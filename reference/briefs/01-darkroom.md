# 01 — Camera Oscura (Darkroom) · `/xperiments/darkroom`

Read `00-shared-rules.md` first; everything there applies. Your folder:
`src/app/(immersive)/xperiments/darkroom/`. Your assets: `public/darkroom/`.

## The piece, in one paragraph

A developing tray in a darkroom. The viewport is the tray, seen from above,
full of still developer. A black-and-white print lies under the liquid,
invisible. The visitor stirs the liquid with the pointer or a finger and the
print develops **only where the developer has actually moved** — first the
midtones, then the shadows, the way silver halide comes up in the tray. Where
the liquid is still, nothing happens. When the print is (nearly) fully
developed it is *fixed*, holds for a beat, and the tray drains to black for the
next one. Twelve prints, then it loops. The only colour in the room is a faint
amber safelight.

## What it must prove

That Alberto writes real-time GPU simulations with taste: a stable-fluids
solver, persistent state buffers and a physically motivated tone curve, in the
browser, at 60 fps, wrapped in restraint. This is the pure shader-craft piece of
the set. If it looks like a generic "WebGL fluid demo", it has failed.

## Art direction

- **The tray is the viewport.** No 3D tray, no table, no hands. A barely-there
  vignette and a 1 px hairline inset at ~2 % suggest the rim.
- **Safelight.** One soft amber radial gradient, top-left, static, very low
  (`--accent` hue, ≈ 0.10 alpha at the core, gone by mid-screen). It tints the
  developed highlights slightly warm, like fibre paper; the shadows stay
  neutral. This is the single accent — no colour anywhere else.
- **The liquid is visible only through what it does**: refraction of the
  developing print (velocity → a small UV offset), a whisper of specular where
  the surface moves fast (velocity magnitude → a thin additive highlight,
  ≤ 0.08), and the developer dye itself as an almost invisible darker cloud.
  No blue, no gloss, no rainbow dye.
- **Paper.** Fine grain on developed areas (hash/fbm at texel scale, ±3 %), a
  hint of paper texture in the paper-white. The print sits aspect-fit inside
  the tray with a ~4 % margin, its border reading as paper edge.
- **HUD**, mono lowercase, `--ink-dim`: bottom-left `print 03 / 12`,
  bottom-right `developing 42 %` → `fixed`. A centred idle hint on a fresh
  print, fading on the first movement: `stir the developer` / `muovi lo
  sviluppo`. Exit link top-left. Title cover (`Camera Oscura` serif /
  `darkroom` mono) on the very first idle state only.

## Interaction

- **Pointer / touch.** Moving over the tray injects velocity along the motion
  and a little developer dye at the pointer — radius ≈ 3–4 % of the short
  side, strength ∝ speed, clamped. Pressing (mousedown / touch) doubles the
  injection. No click needed to begin.
- **Space** — *agitate*: a burst of radial velocity from the centre plus a
  gentle swirl (rocking the tray). Held, it gives continuous gentle agitation:
  this is the keyboard way to develop.
- **ArrowRight / ArrowLeft** — next / previous print (drain, then load).
  **Escape** — exit to `/graphic-designs`, same as the link.
- **Development.** An `exposure` buffer (half-float, display resolution)
  accumulates `dye · k · dt`, clamped to 1. The visible image is the print
  mapped through a development curve: a soft-knee curve that brings the
  midtones up first, from a flat, foggy, low-contrast ghost (exposure
  0.05–0.2 must read as a *latent image*) to full contrast at 1.
- **Progress and fixing.** `coverage` = mean exposure over the print's area,
  measured on the GPU (a downsample chain or a small readback every ~250 ms —
  never a full-resolution `readPixels` per frame). At ≥ 0.85: stop accepting
  dye, ease the remainder to 1 over ~1.2 s, show `fixed`, hold ~2.5 s, then
  drain — the image fades under a rising black, still refracting, buffers
  reset, next print loads.
- **Nothing is required to see something.** Six seconds idle on a fresh print
  starts a slow autonomous current (a slowly rotating injection at ~20 %
  strength) that develops the print by itself in ~40 s. Any input cancels it
  for that print.
- **Reduced motion.** No fluid, no timers, no autonomous current: the pointer
  paints exposure directly with a soft radial brush; prints advance only on
  ArrowRight (and a visible `next print →` control). Everything else identical.

## Technical plan

- Own R3F `<Canvas>` (not the site's shared one): `dpr={[1, 1.5]}`,
  `frameloop="always"` gated on tab visibility, `gl={{ antialias: false,
  alpha: false, powerPreference: "high-performance" }}`. A fullscreen triangle
  for every pass.
- **Fluid** — classic stable fluids (Stam / GPU Gems ch. 38) on ping-pong
  render targets via drei `useFBO`: velocity (RG, half-float, sim resolution
  ~256 on the short side, aspect-corrected), dye (R, half-float, ~512),
  divergence, pressure (Jacobi, ~20 iterations), curl / vorticity confinement
  **low** (≤ 10 — this is developer, not smoke: viscous and slow). Fixed
  timestep (1/60, sub-stepped on long frames). Dissipation: velocity ≈ 0.985,
  dye ≈ 0.97. Tray walls: no-slip boundaries.
- **Exposure** — a separate half-float ping-pong at display resolution (cap
  1024 on the long side): `exposure' = min(1, exposure + dye · k · dt)`.
  Fixing stops the accumulation.
- **Composite** — one fullscreen pass: sample the print (aspect-fit,
  letterboxed), refract by velocity, development curve, warm highlight tint,
  safelight, grain, vignette, specular. Output sRGB, `toneMapped: false`.
- **Capabilities.** Half-float targets need WebGL2 + `EXT_color_buffer_float`
  (or `_half_float`) and `OES_texture_half_float_linear` for linear filtering:
  check `gl.capabilities` / `gl.extensions` at mount. If missing, use the
  reduced-motion **brush path** (no fluid) — same code path, one flag.
- **Prints.** Pick 12 from `/vortex/images` — the photographic b/w ones
  (flash photos, portraits). `THREE.TextureLoader`, `colorSpace =
  SRGBColorSpace`; take luminance in the shader (be explicit even though they
  are b/w). Preload the next print while the current one develops.
- **Pointer.** Position in tray UV; velocity from the frame-to-frame delta,
  smoothed over two frames; `touch-action: none` on the stage (already in the
  scaffolded CSS).
- **Config.** All tunables in `darkroom.config.ts`: sim resolutions,
  dissipations, iterations, injection radius / strength, curve knee, coverage
  threshold, timings, print list.
- **Disposal** on unmount: every FBO, material, geometry, texture.

## Copy to write (`copy.ts`, EN + IT)

`metaTitle` "Camera Oscura — Darkroom"; `metaDescription` (the stub's is
fine to keep); `aria`; `exit`; `hint` (stir); HUD labels (`print`,
`developing`, `fixed`, `next print`); `keyboardHint` (`space agitates · ← →
change print · esc exits`); `noWebgl`; `contextLost`. Remove `wip`.

## Cover

A half-developed print with visible refraction, 4:5 crop, 800 × 1000,
< 120 KB → `public/darkroom/cover.webp` (replace the placeholder).

## Done when

The shared verification passes; on the real GPU a full development from a
fresh print takes 15–40 s of natural stirring and never reads as a "fluid
demo"; the brush path works with reduced motion and with the half-float
extensions absent; the autonomous current develops a print with no input; exit
and re-enter three times leaks nothing; the report is in
`reference/briefs/reports/darkroom.md`.
