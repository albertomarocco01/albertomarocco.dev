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
- **Mono is JetBrains Mono** via `next/font/google` (variable weight,
  self-hosted, `display: swap`). The earlier system stack (`ui-monospace, "SF
  Mono", Menlo…`) rendered the meta/nav/ticker/loader register differently on
  every OS; one real mono buys identical rendering for a second font file on
  the load path.
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

## /about — three panels, one gesture each, the person inside the field

- **Paged, not scrolled.** The page is three viewport-tall panels on a track
  (`AboutSequence.tsx`): the degree + tech path beside the graduation cut-out
  (copy left, figure right); the calisthenics athlete + coach beside the
  competition cut-out (mirrored: figure left, copy right, with the coaching
  rows and a CTA down to the contacts); then the contacts, every one in plain
  sight. `html.about-live` fixes the stage and locks the document (the home's
  shift-free idiom, `data-lenis-prevent` included); the track translates by
  whole viewports on the signature ease, and scroll intent — a wheel notch, a
  swipe, a key — maps to exactly one move. Not CSS scroll-snap: it fights
  Lenis and a trackpad's inertia would skip panels. The driver instead
  swallows everything while a move runs and, once it settles, the inertia
  tail (deltas that only shrink, arriving within 320ms) until a fresh gesture
  starts. A panel taller than its viewport scrolls itself first and pages only
  from its edge — so every panel's copy is sized to clear a 900px-tall
  desktop viewport without an inner scroll (the second panel's is the longest
  and gets less air under it). Focus into a panel brings it up (Tab through
  the contacts never lands off-screen); `#contact` opens on the third panel;
  reduced motion / no JS get three ordinary tall sections that scroll.
- **The stage is pinned.** An `overflow: hidden` box still scrolls when focus
  or a hash jump lands inside it, and the fixed stage holds three viewports
  of track — so a Tab into a lower panel, or the CTA's `#contact`, shoved the
  stage by whole viewports underneath the track's own transform. The driver
  resets the stage's scroll on `focusin`, on `hashchange`, on the stage's
  own `scroll` and in every `apply`; the transform is the only thing that
  pages. (Caught headlessly: `stage.scrollTop` read 900 after a focus.)
- **Every panel says where it sends you next.** The first closes with a link
  row into the work the copy just claimed (`/websites`, `/xperiments`) — the
  topbar carries the same two routes, but a claim should be checkable from
  where it is made; the second with the way down to the contacts and the one
  outbound link on the page, to the calisthenics team (`baldisthenics ↗`, at
  `baldisport.com/baldisthenics`, kept in `CONTACT` with the other brand
  URLs). Outbound gets the diagonal arrow and starts one step dimmer, so
  leaving the site never looks like moving inside it. Both rows cost the
  panels height: their copy's bottom padding is trimmed so each still clears
  a 900px-tall viewport without paging inside itself.
- **No footer on /about; the footer points at /about.** The contact panel
  *is* the page's close — email, phone, Instagram and the place as large serif
  rows on hairlines, plus a mono note — so a footer under it would repeat
  every token one line lower. Every other page's footer (both variants)
  carries a `contact →` link to `/about#contact` (`CONTACT.contactHref`)
  instead; the driver lands it on the third panel with no slide, the in-flow
  fallback jumps to the section's `id`.
- **The calisthenics copy is placeholder.** Bio, the three coaching rows and
  the contact note are plausible stand-ins in both languages (see "NEED REAL
  VALUES" below).
- **The canvas paints the cut-outs, so the orbs pass in front of the person.**
  The field is one fixed layer under the page, so a DOM `<img>` could only ever
  sit in front of every orb. Each `<figure>` hosts a drei `<View>` (index 2 —
  after the field) whose shader draws the photo and re-draws the field's *near*
  orbs over it (`figure-material.ts`): the silhouette occludes the far orbs, the
  near ones (the per-orb parallax depth the field already has, above
  `FRONT_DEPTH`) are summed again on top with the field's own gaussian, gain,
  vignette and fade — handed over each frame through `field-state.ts`, a
  singleton Aura publishes (same idiom as `excite.ts`). Outside the silhouette
  the view writes alpha 0, so the two layers meet seamlessly. The `<img>` stays
  as the LCP element / SEO / a11y and the no-WebGL figure; once the texture is
  up the GPU copy fades in and CSS fades the `<img>` out (`is-live`), both toned
  and bottom-dissolved to the same values so the handover never pops. Both load
  the *same* WebP (`unoptimized`), one download. The canvas is not clipped by
  the DOM, so the panel's box is passed as `u_clip` (the figure lags its track a
  little during a move — a parallax the DOM clips at the panel edge).
  `track-motion.ts` (three-free) lets the driver hold the tracking views at full
  frame rate for the move; at rest the figures ride the field's ~30fps.
- **Cut-outs are authored, not runtime.** `reference/AboutPhotos/cutout.py`
  (rembg `isnet-general-use` + hand masks for the rig/plate in the calisthenics
  shot, largest-component filter, bbox crop, ≤1800px WebP-with-alpha) writes
  `src/assets/about/*.webp` (~30–70 KB each). The graduation source is a phone
  shot at 1536×2048, so that figure tops out at ~1340px tall — soft only at
  very large viewports, hidden by the toning.
- **Contact tokens live in one place** (`CONTACT` in `lib/contact.ts`): email,
  the dial-form phone (`tel:+393896605643`, displayed `+39 389 660 5643`) and
  the Instagram URL, used by the footer (both variants), the /about contact
  block, the dictionaries' phone line and the root layout's Person JSON-LD — a
  data module, so the server layout never imports a component for a string.
  Instagram's own glyph (`InstagramGlyph.tsx`, inline stroke SVG at the mono's
  weight) replaces the old "↗" after the link text.

## Content / placeholders — NEED REAL VALUES

- **/about, second panel (calisthenics):** the bio, the meta line, the three
  coaching rows (endurance / foundations / programming) and the CTA are
  placeholder copy in `dictionary.ts` (`about.panels.discipline`), EN and IT.
- **/about, third panel (contacts):** the note under the rows ("replies within
  a couple of days · en / it") and the availability line in the body are
  placeholders (`about.panels.contact`).
- **Baldisthenics link** (`CONTACT.baldisthenics`) points at
  `baldisport.com/baldisthenics`, which as of 2026-09-02 serves Baldisport's
  "sito in costruzione" placeholder — the deep link may not exist yet. The
  page states no relationship (it is a bare link); if he competes or coaches
  *for* the team, say so in the panel's copy.
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

## Bundle / payload hygiene (review pass, 2026-09-02)

A code-review + optimisation pass over the /about work. Nothing visual moved;
all of it is what ships, and when.

- **The dictionaries never reach the client.** `(site)/error.tsx`,
  `(immersive)/xperiments/error.tsx` and `loading.tsx` are Client Components
  that Next loads with their segment on every page, and each imported
  `getDictionary` — so both full dictionaries (~13 KB minified, three times
  over) were in every visitor's bundle for five strings. The locale
  primitives now live in `lib/locale.ts` and the boundaries' copy in
  `lib/boundary-copy.ts`; `dictionary.ts` composes both back in and re-exports
  them, so every word still has one source and `@/lib/i18n` stays the single
  server import. The three boundary chunks went 13.5 + 22.7 + 13.1 KB →
  1.3 + 1.7 + 10.9 KB.
- **`Shell` takes `nav` + `localeLabels`, not `dict`.** Props handed to a
  Client Component are serialised into the RSC payload of every page, so the
  whole dictionary — /about's three panels included — was inlined in every HTML
  response. The topbar only ever read two blocks.
- **The bubble tuner is a lazy chunk.** `BubbleControls` is now just the opt-in
  gate (`next dev`, `?tune`, `#tune`); the panel itself (`BubblePanel.tsx`:
  sliders, copy, reset) is `next/dynamic` and visitors never download it.
- **The `/#work` → `/websites` hash redirect is a raw `<script>`.** It was a
  `next/script` with no strategy, and the default `afterInteractive` injects
  inline scripts client-side *after* hydration — the redirect waited for the
  whole app (veil included) to boot before reloading, the exact wait the
  comment said it existed to skip. A plain tag runs while the document parses;
  React renders it in place, never re-runs it on hydration, and one it creates
  on a client-side navigation is inert (where the hash can't be stale anyway).
- **`poweredByHeader: false`**, and three dead rule blocks dropped from
  `globals.css` (`.work-section`, `.gd-grid` / `.gd-plate` / `.gd-plate-idx` —
  leftovers of the old plate grid; a class-by-class scan against `src/` found
  nothing else unreferenced).
- **Checked and left alone:** drei is already tree-shaken (no OrbitControls /
  loaders / Html in the 3D chunk — the ~890 KB is three + r3f core, inherent to
  the field); `next/image` already gets `sizes` + `preload` where it matters
  (Next 16 ships those hints as an HTTP `Link` header on dynamic routes, not
  as `<link>` tags — look there before assuming a preload is missing); the
  React Compiler is not worth enabling over a ref-driven, setState-free
  codebase whose hot paths it would bail out of anyway (the ~26 pre-existing
  `react-hooks` compiler-rule findings are exactly those files).

### Review findings (`/code-review high`, same pass)

Fixed:

- **/about's `#contact` CTA paged only through `hashchange`**, which the
  browser doesn't fire when the hash is already `#contact` (arrive from a
  footer link, wheel back up, click) — the driver now pages on the click
  itself; the hash update and any hashchange land on the same panel.
- **Paging under the veil was undone when it lifted**: the driver effect
  re-runs on `entered` and rebuilt its panel index from the hash, sliding a
  visitor who had already scrolled back to panel 1. The index is carried in a
  ref across re-runs, and a resumed run doesn't re-snap the track.
- **A panel move couldn't start frames, only prolong them** (`holdTracking`
  never invalidated): with the field static (software WebGL) or idle, the GPU
  figure stayed at its old box while the panel slid away. Holds now wake the
  canvas through `onTrackingHold`.
- **The off-screen figure drove the whole canvas**: the second panel's figure
  ran its per-frame work and, for the ~1.5 s of its own fade-in, requested a
  frame every rAF — forcing the fullscreen field past its 33 ms throttle for
  pixels nobody could see. Off-viewport figures now skip the uniform work and
  never ask for frames (the fade still advances, so the figure is ready on
  arrival).
- **Dark fringe on the GPU cut-out**: straight-alpha WebP + mipmaps averaged
  the black under transparent texels into the silhouette edge. The texture is
  uploaded premultiplied and the shader un-premultiplies before toning.
- **The figure shader duplicated the field's GLSL** under a "keep in step"
  comment: hash + the nine look `#define`s are one block (`FIELD_GLSL`, in
  `field-glsl.ts` with `BLOB_COUNT`) compiled into both. A three-free module,
  because importing a constant from `aura-material.ts` made the figure's lazy
  chunk carry the whole field material just to share a number.
- **Two dead `.about-copy` overrides** (phones `padding-bottom: 0`, short
  viewports `1rem`) lost on specificity to `.about-panel .about-copy` and never
  applied; the base rule's padding was dead the same way. One selector now.
- **Sideways scroll on the phone stage**: `overflow-y: auto` on the live panel
  made overflow-x `auto` too, and the figure sits at `right: -4vw` there.
  `overflow-x: hidden`.
- **Canvas death after the handover** left the `<img>` at opacity 0: the scene
  hands `is-live` back on its own unmount, not only the view's.
- **Contact tokens** — see the /about section above.

Considered and left as designed (so the next pass doesn't re-open them):

- **Flow-mode return to `/` eases to the footer on its own** after the beat.
  It mirrors the desktop curtain, which also rises on its own on a return
  visit; a hand on the page cancels it.
- **The topbar tucks during that ease** (the slide is a downward scroll and
  the tuck has no programmatic-scroll guard). Any scroll-up reveals it, and the
  flow-mode home is one short page; guarding it would couple the home driver
  to the shell for a beat that ends where the teasers still are.
- **A resize across 860px mid-opening replays the opening** (`mode` re-runs
  the home driver with `replay = !composed`). A deliberate re-sync; the window
  is the first ~7 s, dragging the edge through it.
- **Steady notched-wheel spins read as an inertia tail** on /about right after
  a page turn (equal deltas inside the 320 ms gap). Real mice pause between
  notches far longer than that; loosening the tail check would let trackpad
  plateaus skip panels, which is the bug the tail exists for.

## Merge — three new demos (2026-09-07)

`/graphic-designs` now holds five pieces: Image Vortex and Tarassaco as they
were, plus **Camera Oscura** (`/xperiments/darkroom`), **Mani**
(`/xperiments/hands`) and **Parete** (`/xperiments/wall`). They were built in
parallel by three sessions against briefs in `reference/briefs/`, each owning
only its own route folder and `public/<id>/`; every shared file was the
director's. Per-demo build reports (what was built, every tunable, the known
limits, how to test it in two minutes) are in `reference/briefs/reports/`.

- **Camera Oscura** — a developing tray: a stable-fluids sim on ping-pong
  half-float targets, an exposure buffer the pointer develops directly, a
  print fixed at 85 % mean coverage measured on the GPU. Falls back to a
  brush path (no fluid) under reduced motion, without renderable half-float
  targets, or on a CPU rasteriser.
- **Mani** — MediaPipe `HandLandmarker` (self-hosted wasm + float16 model)
  reading two hands: pinch to hold, two hands to tear, open palm to push.
  The camera feed is never shown and never leaves the browser. A denied or
  absent camera falls through to pointer mode, and everything is also
  keyboard-drivable.
- **Parete** — a 6 × 3 m LED wall in a dark room running the site's own
  `AuraMaterial`, imported read-only and rendered into an FBO (it is a
  fullscreen-triangle material and cannot be hung on a wall directly). The
  physical layer — 2.6 mm pitch, cabinet seams, per-lamp jitter — dissolves
  on an `fwidth` guard before it can alias.

Conventions that came out of the three at once:

- **Shared WebGL/motion primitives, one copy each.** `src/lib/webgl-caps.ts`
  (`hasWebGL2`, `isSoftwareRenderer`), `src/lib/use-reduced-motion.ts` and
  `src/lib/use-tab-visible.ts`. Each demo had grown its own; the two
  software-renderer regexes had already diverged, so a GPU-less VM got the
  cheap path on the site field and the full chain in a demo. `Field.tsx` uses
  the shared probe too.
- **The immersive route group has a layout.** `(immersive)/layout.tsx` wraps
  it in `.immersive` (`display: contents`), which lets `globals.css` release
  the scrollbar gutter (`html { scrollbar-gutter: stable }` was shrinking every
  `position: fixed; inset: 0` stage to 1425 px on a 1440 px window, off-centre,
  with a dead band on the right — Vortex and Tarassaco had shipped with it) and
  restore `cursor: auto` once for the group instead of per demo.
- **A demo is a bus, not a prop tree.** Each has one mutable object the DOM
  writes and the frame loop reads (`TrayBus`, `HandsInput`, `WallBus`), mutated
  only through its own methods — the React compiler rules forbid writing to a
  prop object's fields. Nothing at frame rate touches React.
- **Keys are guarded.** Escape and the arrows ignore `altKey`/`ctrlKey`/
  `metaKey` and auto-repeat: Alt+← is browser back, and a held arrow would
  restart a crossfade thirty times a second.

## Payload (measured on the production build, 2026-09-07)

Per route, cold: `/` 433 KB JS · LCP 392 ms; `/graphic-designs` 436 KB ·
196 ms; `/about` 439 KB · 124 ms; `/xperiments/darkroom` 440 KB;
`/xperiments/hands` 486 KB; `/xperiments/wall` 632 KB. The three demo chunks
are per-route — three/R3F stays shared, the reflector, composer and MediaPipe
do not leak into the site bundle. Fonts are 195–229 KB on every route (Fraunces
roman + italic, JetBrains Mono, all variable) and are the largest fixed cost;
they are left alone deliberately, since the display serif *is* the site.

- **The index's covers are eager, not lazy.** Five cards, every optimised cover
  a few KB: lazy-loading the ones below the fold only bought a visible pop-in
  on the way down. The first keeps its `preload` (it is the LCP element).
- **`public/darkroom|hands|wall` are `immutable`**, like `/vortex/images` and
  `/mediapipe`: content-addressed by filename, so they should not be
  revalidated on every visit to the index.

## Deferred

- **WebGPU** (TSL/`WebGPURenderer`) is intentionally not attempted; WebGL2 ships.
  A WebGPU path with WebGL2 fallback can come later without architecture changes.
