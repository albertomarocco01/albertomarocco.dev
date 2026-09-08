# 03 — Parete (LED Wall) · `/xperiments/wall`

Read `00-shared-rules.md` first; everything there applies. Your folder:
`src/app/(immersive)/xperiments/wall/`. Your assets: `public/wall/`.

## The piece, in one paragraph

A dark room. A 6 × 3 m LED wall on a low black riser, running the site's own
generative loops live — Liminal Field first — the way it would in the install.
The visitor orbits around it, dollies in until the pixel pitch and the cabinet
seams resolve, steps back until it is a single glowing plane reflected on the
floor. Four loops to switch between: amber, ember, teal, violet — the four
aura variants the home page already renders. A mono HUD reads like a spec
sheet: `led wall · 6 × 3 m · pitch 2.6 mm · 12 × 6 cabinets · loop: liminal
field / amber`.

## What it must prove

Exactly the product Alberto sells for installations, previewed before it is
bought: the real shader on a wall at real scale, with the physical details a
client asks about — pitch, cabinets, brightness on a floor. Restrained,
precise, architectural. A rendering, not a game.

## Art direction

- **Room.** Near-black; walls implied only by a faint gradient and the wall's
  own light. A floor with a soft, blurred reflection — drei
  `MeshReflectorMaterial`, low resolution (≈ 512), heavy blur, mirror ≈ 0.5,
  roughness high: **the glow on the floor is the hero detail**. A 0.3 m matte
  black riser under the wall. Recommended: one 1.8 m matte silhouette (a
  capsule and a sphere are enough, `#111`) standing ~3 m in front, off-centre,
  for scale. Nothing else — no environment map, no HDRI, no props, no fog.
- **The wall.** A 6 × 3 m plane, emissive only (`toneMapped: false`,
  intensity > 1), bloom from `@react-three/postprocessing` (`Bloom`,
  `luminanceThreshold ≈ 0.6`, `mipmapBlur`, intensity ≈ 0.6 — glow, not haze).
  LED detail in the wall's own fragment shader: a pixel grid (2.6 mm pitch →
  2307 × 1153 pixels; a dot mask, `smoothstep` on `fract(uv · count)`, fill
  factor ≈ 0.7) that fades to flat as its screen-space frequency nears Nyquist
  (`fwidth`) so there is never moiré; cabinet seams (12 × 6 cabinets of
  500 mm, 1 px darker lines); a very subtle per-pixel brightness jitter
  (± 3 %) for the LED sparkle. From 7 m none of this is visible; from 0.9 m all
  of it is.
- **Camera.** Three presets — keys `1` `2` `3` and a mono pager in the HUD:
  `front` (7 m, centred, eye height 1.6 m), `oblique` (5 m, 35°), `close`
  (0.9 m, lower-left quadrant, pitch visible). Drag to orbit within limits
  (polar 70°–100°, azimuth ± 60°), wheel / pinch to dolly (0.6 m – 12 m),
  damped. Idle 8 s → a slow drift around the current preset (± 4° over 20 s).
  Reduced motion: transitions instant, no drift.
- **HUD**, mono lowercase, `--ink-dim`: bottom-left the spec line;
  bottom-right the loop switcher `← amber →` (ArrowLeft / ArrowRight or
  click); the view pager beside it. Exit link top-left. Title cover (`Parete`
  serif / `led wall` mono) on load only, fading on the first interaction.

## Technical plan

- Own R3F `<Canvas>`: `dpr={[1, 1.5]}`, `frameloop="always"` gated on tab
  visibility, `gl={{ antialias: false, powerPreference: "high-performance" }}`;
  AA via the composer (`SMAA`) or none at DPR 1.5 — judge by eye.
- **Scale.** 1 unit = 1 m. Wall centre at y = 0.3 + 1.5.
- **The loop content — reuse the site's shader, untouched.**
  `import { AuraMaterial, VARIANT_PALETTE } from
  "@/components/canvas/aura-material"` (read-only; importing runs `extend`, so
  `<auraMaterial>` exists as JSX). It is a **fullscreen-triangle material** —
  its vertex shader writes `position.xy` straight to clip space and ignores the
  camera — so render it into a render target and use that as the wall's
  texture: drei `useFBO(1024, 512, { depthBuffer: false })` plus a tiny
  offscreen scene (`new THREE.Scene()`, a 3-vertex `BufferGeometry` triangle
  covering clip space, `<auraMaterial u_white={0} u_fade={1} u_res={[2, 1]}
  u_hot={…} u_mid={…} />`), rendered in `useFrame(…, -1)` with
  `gl.setRenderTarget(fbo); gl.render(offscreen, anyCamera);
  gl.setRenderTarget(null)`. Advance `u_time` yourself (match the site's pace —
  see `timeScale` in `src/components/canvas/Aura.tsx`); 30 Hz is enough for
  the FBO, so throttle it. **Do not reuse `Aura.tsx`** — it is wired to the
  site's `AppProvider`.
- **Loop switch.** Tween `u_hot` / `u_mid` between `VARIANT_PALETTE` entries
  over ~1.2 s (the palettes interpolate cleanly); no second FBO needed.
- **Wall material.** A `ShaderMaterial` taking the FBO texture plus
  pitch / cabinet / jitter uniforms, output = emissive colour × intensity,
  `toneMapped: false`.
- **Controls.** drei `CameraControls` (`camera-controls` is installed):
  `setLookAt(…, true)` for the presets, the limits above, `smoothTime ≈ 0.6`.
- **Config.** `wall.config.ts`: dimensions, pitch, cabinet grid, presets,
  limits, bloom, reflector, timings, palettes order.
- **Disposal** on unmount: FBO, offscreen scene, materials, composer,
  controls.

## Copy to write (`copy.ts`, EN + IT)

`metaTitle` "Parete — LED Wall"; `metaDescription`; `aria`; `exit`; HUD spec
labels (`led wall`, `pitch`, `cabinets`, `loop`); preset names (`front` /
`oblique` / `close` → `frontale` / `obliqua` / `da vicino`); the loop title
stays "Liminal Field" in both locales, the variant names stay English
(`amber`, `ember`, `teal`, `violet`); `keyboardHint` (`1 2 3 views · ← → loop
· drag orbits · wheel dollies`); `noWebgl`; `contextLost`. Remove `wip`.

## Cover

The oblique preset with the floor reflection, amber → `public/wall/cover.webp`,
800 × 1000, < 120 KB.

## Done when

The shared verification passes; the wall reads as a physical object at all
three distances — pitch invisible at 7 m, crisp at 0.9 m, no moiré between;
60 fps at DPR 1.5 on the GTX 1660 SUPER with bloom and the reflector; the loop
switch crossfades without a hitch; reduced motion is static but fully
navigable; a hidden tab renders nothing; the report is in
`reference/briefs/reports/wall.md`.
