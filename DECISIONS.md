# Decisions

On-brand choices made where the references didn't fully specify, plus notable
engineering calls. Paired with `reference/albertomarocco-build-spec.md` and
`reference/alberto-marocco-prototype-v2.html` (the canonical look/timing/shader).

## Stack / versions

- **Next 16.2.9, React 19.2, TypeScript 6** (scaffolded with `create-next-app`,
  App Router, `src/` dir, no Tailwind, ESLint flat config, Turbopack).
- **@react-three/drei is v10**, not the spec's "latest 9.x" — drei 10 is the
  current major that pairs with R3F 9 + React 19. The architecture is unchanged.
- **`@react-three/postprocessing` deliberately omitted** for now. The spec marks
  the bloom/grain pass optional; the CSS grain already reads well and skipping it
  keeps the lazy 3D chunk leaner. Easy to add later.

## Art direction / type

- **Display serif: Fraunces** via `next/font/google` (variable, italic, optical
  size), the spec's default. Not Inter.
- **Mono utility is a system stack** (`ui-monospace, "SF Mono", "JetBrains Mono",
  Menlo, monospace`) — no webfont loaded. Matches the prototype and avoids a
  second font download on the LCP path.
- **One stylesheet (`globals.css`)** with semantic classes rather than per-
  component CSS Modules. For a single hand-crafted page, one authored stylesheet
  is the craft and keeps 1:1 fidelity with the prototype at lowest risk. Design
  tokens are extracted verbatim from the prototype.

## Rendering architecture

- **One persistent `<Canvas frameloop="demand">`** (fixed, transparent, pointer-
  inert) mounted once in the layout. It paints only where a drei `<View>`
  scissors it — the open generative row, or the full-viewport **ambient white
  field** (gate + home).
- **Ambient white field (replaces the one-shot amber wash).** A single
  full-viewport white `<View>` (`AmbientField`) sits behind the gate and
  persists behind the hero on the home — white = ambient atmosphere, amber =
  the work. The amber entrance wash (`WashView`) is removed. The field mounts
  after first paint + idle (now **not** gated on entry, so it lives behind the
  gate too); the gate's background is transparent so it reads through, while the
  home stays hidden until entry via `.wrap` opacity. It runs only while it can
  be seen — `active` is gated on hero `IntersectionObserver` + tab visibility,
  fading out and idling when scrolled away/backgrounded and resuming on return.
- **One shared material, branched on `u_white` — not forked.** The same
  `AuraMaterial` renders two looks from one `if (u_white > 0.5)`:
  - **`u_white` 0 — the amber/ember WORK reveals:** the domain-warped value-noise
    fbm "smoke", ported verbatim from the prototype. Kept **byte-for-byte** (the
    branch holds the original GLSL; the only edit is aliasing `u_res.x/u_res.y`
    to a local `aspect`, the same value).
  - **`u_white` 1 — the ambient WHITE field (gate/home):** a small set of soft
    **luminous orbs** — out-of-focus blobs on near-black, not a desaturated
    smoke. `BLOB_COUNT` (7) gaussian orbs are positioned each frame by a tiny JS
    physics sim (elastic collisions + soft walls + an energetic→lively energy
    envelope — see the retune note below); the shader only sums the gaussians and
    soft-saturates (`1 - exp(-field·FIELD_GAIN)`). Alpha follows presence, so the
    gaps between orbs fall to true near-black — distinct orbs, not a wash. All
    look knobs are named `#define`s (`BLOB_COUNT/SIZE/SOFT`, `DISP_STRENGTH`,
    `FIELD_GAIN/OPACITY`, the `DIM_COLOR`/`ORB_COLOR` palette, the `VIG_*`
    vignette, and the `DEPTH_*` parallax spread). Cheaper than the smoke (a handful of gaussians vs a
    5-octave domain warp). `timeScale` ~3.1, ~30fps `throttleMs`. See **White
    field — distinct orbs + perpetual motion** below for the tuned constants.
- **Calm cursor parallax (replaced the old swirl).** The white field gently
  *leans* toward the pointer — no rotation, no velocity-driven stirring. `Aura`
  records the pointer (UV, white field only) and re-engages on movement; the loop
  heavily smooths a lagging follow (`DISP_SMOOTH`) and decays the engagement
  (`DISP_DECAY`) so the lean eases back to rest when the cursor stops, feeding a
  small `u_disp` offset (rest = 0) the shader applies to the orb centres (each
  orb parallaxing a touch differently for depth). Max lean ~a few % of the
  viewport. `u_disp` 0 is an exact identity, so the work reveals — which never set
  it — are untouched. Off under the software-renderer static guard and reduced
  motion (no pointer loop, no LCP cost). Verified real-GPU: the amplified
  two-cursor diff is a smooth global shift with **no swirl**.
- **Software-renderer fallback.** When WebGL is software-rasterized (SwiftShader
  / llvmpipe / WARP — i.e. headless Chrome / Lighthouse / no GPU), a fullscreen
  shader every frame is a long main-thread task, so the field paints a **single
  static frame** instead of looping (`WEBGL_debug_renderer_info` detection). Real
  GPUs animate — their per-frame main-thread cost is sub-millisecond.
- **DPR capped at 1.5** for the whole canvas (was 2). The continuous ambient
  field paints fullscreen; the soft noise reads identically at 1.5, and the
  gen-row aura is unaffected perceptually.
- **drei `<View>` tracks its own `<div>`.** Outside the canvas, drei's `View`
  ignores a passed `track` ref and instead renders + tracks its own element, so
  the aura `<View>` div (`.aura-view`) absolutely fills the row's `.row-reveal`.
  As GSAP grows the reveal height, the scissor grows with it — that's the wipe.
- **Render-on-demand loop.** Each aura advances `u_time`/`u_fade` only while its
  row is open (or while the fade-out settles), re-arming the next frame via
  `invalidate()`. At rest nothing renders.
- **Reduced motion = no WebGL at all.** Rather than freeze the shader on one
  (timing-fragile, often dim) frame, under `prefers-reduced-motion` the field
  never mounts and gen rows show their designed static amber plate. This honors
  no-motion *and* reduced-data (zero GPU work) and is deterministic — a "still",
  which the spec accepts in place of a single static shader frame.
- **Aspect from the live DOM box.** drei's per-`View` size is captured at mount
  (when the reveal is collapsed), so the shader's `u_res` aspect is read from the
  reveal element each frame instead. `u_res` feeds only the aspect ratio.
- **Shader UV from a varying**, not `gl_FragCoord/u_res`. Under the per-view
  scissor the raw frag-coord is offset by the view's screen position, which would
  skew the vignette; the fullscreen-triangle varying keeps UV view-local. The
  noise/colour math is otherwise ported verbatim.
- **Lazy 3D.** three/r3f/drei are code-split (`next/dynamic`, `ssr:false`) for
  both the field and the per-row aura, and only mount after first paint + a
  `requestIdleCallback` slot (`fieldReady`). The hero and the gate paint as
  static server HTML with zero 3D; the initial JS carries no three.
- **Static fallback.** Generative rows show a faint amber `::before` plate that
  crossfades out once the canvas is live (`.canvas-live`), and stays if WebGL is
  unavailable.

## White ambient field — distinct orbs + perpetual motion

The field must read as **distinct soft white orbs on near-black with real dark
gaps**, keep the hero eyebrow/name/lede **legible** over it, and hold a
**constant gentle drift with visible collisions** — an energetic burst on the
field's first activation (it carries the load beat, and a later intro screen)
that **settles into the lively floor, never a freeze**. Two root causes were
retuned; all constants stay named (white branch of `aura-material.ts`, physics
in `Aura.tsx`, props in `AmbientField.tsx`).

- **Grey wash → distinct orbs (contrast).** The orbs were enormous: visual
  radius = `BLOB_SIZE`(2.34) × `CORE_RADIUS`(0.145) ≈ 0.34 height-units — at
  `BLOB_COUNT` 9 that is ~180% viewport coverage, so the summed field saturated
  everywhere and `pres` stayed high across the whole screen → a flat grey wash
  over the text. The dark gaps now come from **geometry**, not from crushing
  opacity: `BLOB_SIZE` **2.34 → 1.35** (≈half-viewport coverage — the main
  lever), `BLOB_SOFT` **1.20 → 0.9** (sharper falloff), `BLOB_COUNT` **9 → 7**,
  and the gap/halo `dim` colour **vec3(0.30,0.32,0.38) → vec3(0.10,0.11,0.14)**
  (just above the void `#0a0a0c`, so low-presence regions read as true dark).
  `FIELD_GAIN` (0.85) and `FIELD_OPACITY` (0.72) stay at the author's values —
  the gaps are now geometric, so the field opacity is free to keep the orb cores
  luminous; only `maxFade` is trimmed **0.6 → 0.45** for a little legibility
  headroom. Between orbs the alpha falls to ~0, so the hero text stays legible
  there while the orb cores still read.
- **Decay-to-freeze → perpetual motion.** The energy envelope decays toward an
  idle floor, and that floor was a crawl. `IDLE_DRIFT` **0.035 → 0.13** gives a
  constant lively drift. `START_ENERGY` stays **1** (the first-activation burst),
  but `BASE_SPEED` **0.24 → 0.5** so the burst reads as clearly energetic against
  the raised floor before decaying onto it. `CORE_RADIUS` **0.145 → 0.15** widens
  the contact cross-section so the now-fewer orbs still **collide regularly**;
  the bumps softly merge-then-separate because `BLOB_SIZE` > 1 keeps each glow
  larger than its collision core.

**Tradeoff:** smaller + fewer orbs collide less often. 7 orbs (not 6), with the
bigger core and the 0.13 idle floor, keep collisions frequent and visible while
still leaving distinct orbs with dark space between.

**Deviations from the first-cut targets:** `FIELD_GAIN` and `FIELD_OPACITY` were
left at the originals (not lowered to 0.7 / 0.55) and `maxFade` only to 0.45 (not
0.30) — with the orbs now small and sharp the gaps are already dark from geometry,
so cutting opacity further only dims the orbs into a faint haze without buying
legibility. The opacity ceiling (`maxFade` × `FIELD_OPACITY` ≈ 0.32) is the one
dial to nudge by eye on real hardware: lower it if an orb drifting behind the name
reads too strong, raise it if the orbs feel too subtle. (Headless/software WebGL
paints only the field's static frame and can't drive this demand-loop field, so
the look was reasoned from the shader math, not machine-verified visually.)

## Motion

- **GSAP** owns the layout-affecting reveal (height) and the directional wipe
  (`clip-path` via a `--reveal-clip` CSS var) + opacity, inside `useGSAP`. Cheap
  micro-transitions (title shift, amber line, sibling dim, media scale) stay as
  CSS. The signature easing `cubic-bezier(0.22,1,0.36,1)` is registered as a GSAP
  `CustomEase` named `field`.
- **Lenis** is mounted at the root and driven by the GSAP ticker (so scroll and
  GSAP share one clock); disabled under reduced motion.
- **The entrance is an orchestrated "opening".** `enter()` no longer just toggles
  a CSS cross-fade; a short GSAP timeline (the `field` ease) lifts + fades the
  gate name/CTA, blooms the white field briefly to carry through (a one-shot
  `brightness` pulse on the canvas via an `html.entering` class — decoupled from
  the R3F loop, so it never touches the field's calibration), then rises the home
  in with a staggered eyebrow → name → lede and eases the topbar in. Hosted in
  `Shell` (it spans the gate, hero and topbar). GSAP now owns those entrance
  opacities, so the matching CSS `transition`s on `.gate`/`.wrap`/`.topbar` were
  removed to avoid double-animation (`.gone` is gone; `.in` remains as the
  final/no-motion state). Under reduced motion the timeline is skipped entirely —
  the gate isn't rendered and CSS shows the content instantly.

## Content / placeholders — NEED REAL VALUES

- **P.IVA `00000000000`** in the footer is a placeholder.
- **Instagram** links to `instagram.com/albertomarocco` (guessed handle).
- **"Studio — next"** is a coming-soon row; its link points to `#work` until the
  real project/route exists.
- Generative rows render the live shader (no stock imagery). **Vini Montarello**
  now shows a real, optimized capture of its live home (see below). The
  remaining `web` row (**Studio — next**) still uses a gradient plate
  placeholder — **replace with a real still** when the project exists.

## Vini Montarello preview (B3)

- **A real screenshot of the live home, not stock or a gradient.** Captured
  headless (Chrome via CDP) at 2× and downscaled to a 2400-wide WebP (~200 KB)
  at `src/assets/work/vini-montarello.webp`, imported statically so next/image
  gets intrinsic size + an automatic blur-up placeholder.
- **The live site is behind a legal age gate** (`localStorage["age-verified"]`).
  The capture script presets that flag before navigation so the real homepage —
  the Monferrato vineyard hero — renders; the moody photo suits the dark field.
- **No iframe** (heavy, X-Frame-Options). next/image with `fill` + `sizes` +
  `object-fit: cover` fills the reveal box (fixed height → **CLS 0**), lazy by
  default, toned into the dark palette (brightness/saturate) and lifting on open.
- **"visit site ↗" overlay, top-right** — label string owned by `work.ts`
  (`cue`); placed in the corner so it never collides with the site's own centred
  wordmark or the bottom-left caption, with a solid-enough background to read
  without relying on `backdrop-filter`. The whole row remains the link.
- **To replace:** drop a new capture at the same path (any jpg/png/webp/avif;
  next/image regenerates the blur) — ideally re-shot past the age gate.
- No physical address anywhere (privacy), per the spec.

## Analytics / SEO

- **`@vercel/analytics/next`** — cookieless, no banner.
- Metadata API (title template, description, OpenGraph, Twitter, robots,
  canonical), `sitemap.ts`, `robots.ts`, brand `icon.svg`, and a dynamic OG image
  (`opengraph-image.tsx` via `next/og`, Fraunces fetched as TTF and subsetted).

## Verification (local prod build, Lighthouse desktop, headless Chrome)

- **Performance ~85–95 · SEO 100 · Best-Practices 96 · Accessibility 100.**
  LCP 0.7s · FCP 0.2s · CLS 0 · Speed Index ~1.0s. Run-to-run TBT is noisy on
  this machine (250–430ms across desktop runs, with the occasional cold outlier);
  LCP/CLS/FCP are stable. The blob field does not regress this — it is *cheaper*
  per fragment than the old smoke, and under the software-renderer guard
  Lighthouse hits it paints one static frame. The cursor parallax and the
  entrance add no load-trace cost: the pointer loop is disabled under that guard,
  and the entrance timeline only runs on the `enter()` click, never during load.
- Headless run (driven via CDP) confirms: hero/gate paint as static HTML; after
  first paint + idle the shared canvas initialises and the **ambient white field
  renders behind the gate and persists behind the hero**; the open gen row still
  paints the **amber** aura via scissor over the white field; the **Vini
  Montarello** row reveals the real site preview with the "visit site ↗" overlay
  (CLS 0, no layout shift on open); reduced motion mounts no canvas.
- **Performance 95–98 (was 100).** The gap is the one-time three/r3f init now
  mounting on the gate (B1 requires the field there) plus the field's modest
  load-window cost. It is not continuous jank: TTI settles at 1.5s and TBT is
  130–170ms. Headless CI Lighthouse uses **SwiftShader** (software WebGL); the
  field detects that and paints a single static frame rather than looping (→ 98)
  — without that fallback the continuous fbm was TBT 2.8s / Performance 65. On
  real GPU hardware the animated field's per-frame main-thread cost is
  sub-millisecond, so it stays within budget (→ 95).
- **Best-Practices 96** is solely the `/_vercel/insights/script.js` 404, which
  only happens off-Vercel (the script is injected by Vercel's edge). Expected
  100 in production.
- Earlier runs flagged a single contrast warning on the ultra-dim gate eyebrow
  (`--ink-dim #6d6a64` on the void — intentional "low-contrast" art direction);
  this run scored Accessibility 100. The spec's explicit a11y requirements
  (keyboard operation, focus-visible, reduced-motion, real `<a>`/`<button>`
  semantics) are all met.

## Deferred

- **WebGPU** (TSL/`WebGPURenderer`) is intentionally not attempted; WebGL2 ships.
  A WebGPU path with WebGL2 fallback can come later without architecture changes.
