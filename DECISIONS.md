# Decisions

On-brand choices made where the references didn't fully specify, plus notable
engineering calls. Paired with `reference/albertomarocco-build-spec.md` and
`reference/alberto-marocco-prototype-v2.html` (the canonical look/timing/shader).

## Stack / versions

- **Next 16.3, React 19.2, TypeScript 6** (scaffolded with `create-next-app`,
  App Router, `src/` dir, no Tailwind, ESLint flat config, Turbopack).
- **@react-three/drei is v10**, not the spec's "latest 9.x" — drei 10 is the
  current major that pairs with R3F 9 + React 19. The architecture is unchanged.
- **`@react-three/postprocessing` stays out of the site canvas.** The spec marks
  the bloom/grain pass optional; the CSS grain already reads well on the site.
  Two demos do use it, in their own route chunks — Parete (bloom + SMAA,
  `wall/components/WallCanvas.tsx`) and Image Vortex (`VortexScene.jsx`) — so
  it never reaches the site bundle.

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
  tokens are extracted verbatim from the prototype. The five demos are the
  exception: each loads its own stylesheet from its folder (Image Vortex's is
  `components/vortex/vortex.css`) and `globals.css` carries no demo styles
  (round 3, S13 — "Round 3 — A").

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
  home stays hidden until entry via `.wrap` opacity. *(Superseded: the gate and
  its entry are gone — see "The entrance" under Motion.)* It is now a full-site
  background, so the only gate on `active` is tab visibility (`Field.tsx`):
  backgrounded, it fades out and idles; it resumes on return.
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
  GPUs animate — their per-frame main-thread cost is sub-millisecond. Round 3
  (S10) extended the guard to the home's name melt, which had been keeping the
  demand loop alive under it — "Round 3 — B".
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
  which the spec accepts in place of a single static shader frame. Round 3 (S1)
  widened that gate: the field also stays off under save-data and on low-end
  devices — `useFieldAllowed()`, "Round 3 — B".
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

**Current values (2026-09-13) — the numbers above are the history of the first
retune, not today's field.** Later passes went the other way, towards a dense,
calm full-site background: `BLOB_COUNT` **14** (`field-glsl.ts`), `CORE_RADIUS`
**0.055**, `BASE_SPEED` **0.25**, `IDLE_DRIFT` **0.065** (`Aura.tsx`, scaled for
aspect), `maxFade` **0.7** (`AmbientField.tsx`). Size, softness, gain and
opacity are live uniforms tuned with the `?tune` panel (`bubble-params.ts`).
The source files are the truth; this note only stops the log from reading as
current.

## Motion

- **GSAP** owns the layout-affecting reveal (height) and the directional wipe
  (`clip-path` via a `--reveal-clip` CSS var) + opacity, inside `useGSAP`. Cheap
  micro-transitions (title shift, amber line, sibling dim, media scale) stay as
  CSS. The signature easing `cubic-bezier(0.22,1,0.36,1)` is registered as a GSAP
  `CustomEase` named `field`.
- **Lenis** is mounted at the root and driven by the GSAP ticker (so scroll and
  GSAP share one clock); disabled under reduced motion. Under the loading veil
  it is held by a `prevent` predicate on `html.loading`, not stopped (round 3,
  B11 — "Round 3 — A").
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
  the gate isn't rendered and CSS shows the content instantly. *(Round 3: the
  topbar's entrance, like the veil's own beat, plays once per page load; the
  veil waits for the real page before it lifts; one navigation sweep runs at a
  time — "Round 3 — A".)*

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
- **The copy was rewritten, once, for tone.** The first pass read as filler
  ("sites that perform" twice, "coach by conviction", "write, call, find me",
  "commissioni" for commissions). The three panels now carry one idea each —
  *computer scientist by training, creative technologist by choice* / *athlete
  first, then coach* / *have a project in mind? let's talk* — and the bodies
  keep to the facts already on the page (the degree, the tools, the discipline,
  Turin + online); nothing new was claimed. The coaching rows and the reply-time
  note are still stand-ins (see "NEED REAL VALUES" below).
- **The cut-outs are sunk into the room, under a breeze.** Daylight photos on
  the void read as pasted on: both figures are now desaturated to 0.55 and
  brought to ~0.58 of their brightness (below the ink's own), a hair cool, so
  the orbs stay the light source and the person stands in their shadow. Over
  that, `figure-material.ts` drifts a domain-warped fbm haze across the figure
  (cells sized on the box's height, so both photos get the same mist; mostly
  sideways, ~20 s to cross): the thick of it dims the figure by a quarter and
  veils it with the room's cold grey, the clear of it lifts it a little, and
  the same warp field sways the silhouette by a pixel or two. It rides the
  field's own ~30fps clock (`u_time` advances on whatever frames the field
  renders) and never asks for a frame of its own. The fallback `<img>` gets
  the tone only (`saturate(.55) brightness(.58)`), which is what the haze
  averages to, so the handover still doesn't pop. Every number is a
  `#define` at the top of the shader (HAZE_*, MIST_*, TONE_*).
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

- **/about, second panel (calisthenics):** the three coaching rows (endurance /
  foundations / programming) in `dictionary.ts` (`about.panels.discipline`)
  describe a plausible offer, EN and IT — confirm what the coaching actually
  covers.
- **/about, third panel (contacts):** the note under the rows ("replies within
  a couple of days · en / it") and the "in Turin and remotely" line in the body
  are stand-ins (`about.panels.contact`).
- **Baldisthenics link** (`CONTACT.baldisthenics`) points at
  `baldisport.com/baldisthenics`, which as of 2026-09-02 serves Baldisport's
  "sito in costruzione" placeholder — the deep link may not exist yet. The
  page states no relationship (it is a bare link); if he competes or coaches
  *for* the team, say so in the panel's copy.
- **P.IVA — send the real number.** Until then the footer shows none:
  `footer.vat` is optional and unset in both dictionaries, and `Footer.tsx`
  renders the span only when it has a value. Never ship a made-up number — set
  the real one as `vat: "P.IVA 01234567890"` in both locales of `dictionary.ts`.
- **Instagram** is `instagram.com/alberto.marocco` (`CONTACT.instagram`) —
  confirm it is the account he wants linked.
- **"Studio — next"** (`work.ts`, the third `gen` row on /xperiments) is a
  coming-soon row that paints the violet aura and links nowhere; give it a
  real destination (or drop it) when the project exists.
- Both `web` rows show real, optimized captures of the live sites (**Vini
  Montarello**, **Toretto Blend** — sources under `reference/WorkPhotos/`);
  the `mediaGradient` plate on each is the no-image fallback only.

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
- **"visit site ↗" overlay, top-right** — label string is the row's `cue` in
  the dictionary (`work.items.<id>.cue`, EN + IT); placed in the corner so it never collides with the site's own centred
  wordmark or the bottom-left caption, with a solid-enough background to read
  without relying on `backdrop-filter`. The whole row remains the link.
- **To replace:** drop a new capture at the same path (any jpg/png/webp/avif;
  next/image regenerates the blur) — ideally re-shot past the age gate.
- No physical address anywhere (privacy), per the spec.

## Analytics / SEO

- **`@vercel/analytics/next`** — cookieless, no banner.
- Metadata API: the root layout holds the base URL, the title template and
  the site-wide description; every page (site and demo) resolves its own
  title, description, canonical, Open Graph and Twitter block through
  `pageMetadata({ title, description, path })` in `lib/seo.ts`, so a shared
  link previews that page and not the home. `sitemap.ts` (dates per route,
  kept by hand), `robots.ts`, `manifest.ts`, the brand `icon.svg` and its
  180 px `apple-icon.tsx`, and the OG image (`opengraph-image.tsx` via
  `next/og`, Fraunces read from a vendored TTF). Details, rules and the
  limits under "Round 3 — C" below.

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
  `(immersive)/graphic-designs/error.tsx` and `loading.tsx` are Client Components
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
were, plus **Camera Oscura** (`/graphic-designs/darkroom`), **Mani**
(`/graphic-designs/hands`) and **Parete** (`/graphic-designs/wall`) — all three
at `/xperiments/<id>` until round 2 moved them. They were built in
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
  restore `cursor: auto` once for the group instead of per demo. Round 3
  releases the gutter the same way on the locked home and /about (B18, "Round
  3 — A").
- **A demo is a bus, not a prop tree.** Each has one mutable object the DOM
  writes and the frame loop reads (`TrayBus`, `HandsInput`, `WallBus`), mutated
  only through its own methods — the React compiler rules forbid writing to a
  prop object's fields. Nothing at frame rate touches React.
- **Keys are guarded.** Escape and the arrows ignore `altKey`/`ctrlKey`/
  `metaKey` and auto-repeat: Alt+← is browser back, and a held arrow would
  restart a crossfade thirty times a second. Mani and Image Vortex had drifted
  from it (B7, B8) and were brought back in round 3 (`fe4e7f9`, `cdabc8c`).
- **Escape leaves every demo.** Tarassaco was the one exception — its only
  way out was the corner link — so it now carries the same guarded handler
  as the other four. Five pieces in one section should answer the same key.

## Payload (measured on the production build, 2026-09-07)

Per route, cold: `/` 433 KB JS · LCP 392 ms; `/graphic-designs` 436 KB ·
196 ms; `/about` 439 KB · 124 ms; `/graphic-designs/darkroom` 440 KB;
`/graphic-designs/hands` 486 KB; `/graphic-designs/wall` 632 KB (measured
under their old `/xperiments/<id>` paths; the move renamed the route, not the
chunk). The three demo chunks
are per-route — three/R3F stays shared, the reflector, composer and MediaPipe
do not leak into the site bundle. Fonts are 195–229 KB on every route (Fraunces
roman + italic, JetBrains Mono, all variable) and are the largest fixed cost;
they are left alone deliberately, since the display serif *is* the site.

- **The index's covers** are static imports from `src/assets/covers/` (see
  "Round 3 — C": hashed URLs, real `sizes`, lazy below the fold; the first
  keeps its `preload` as the LCP element). *(Superseded: they were eager
  files under `public/<id>/` with an `immutable` header — the header was the
  bug, see B4 below.)*

## Merge — round 2 (2026-09-11)

Alberto walked the five pieces and asked for a second pass on three of them.
Six briefs in `reference/briefs/round2/`, one session each, each owning one
folder; the per-demo reports carry a **Round 2** section with every tunable and
every known limit. What follows is only what the briefs did not already decide.

**The demos moved to `/graphic-designs/<id>`.** They opened under
`/xperiments/<id>`, which filed them beside the generative rows they are not.
`next.config.ts` answers the old paths with a 308 for the five ids explicitly,
so `/xperiments` itself still serves the rows and a future `/xperiments/*` page
is untouched. Canonicals, the sitemap and the camera `Permissions-Policy`
headers moved with them.

- **Camera Oscura — a print hands over to the next one, and nothing is
  written over the tray.** A fixed print no longer drains to black: the next is
  bound into the tray at once and the finished one sinks over it for 1.2 s
  (0.8 s on ← / →), deeper under the liquid, which keeps its velocity and
  pressure fields — a handover is not a still tray. The outgoing print is held
  in its own target and blended on one `u_drain` uniform, so outside a handover
  the branch costs nothing. Fresh paper wets in over 3 s: without that ramp the
  incoming print flared up in the previous stir's leftover swirls and read as
  smoke on black — the fluid-demo look the piece exists to avoid. The two HUD
  corners are gone; the title and the hint show on the first idle state only,
  and after that the exit link is the only writing on the page. Left alone the
  tray now develops by itself in about half a minute — the brief's faster
  numbers read as a fast-forward. A parked mouse no longer counts as input: the
  OS emits sub-pixel jitter, which reset the idle clock forever, so a move
  under 2 px is dropped.
- **Mani — closing your hand opens a print.** The tracker gained a fist (four
  consecutive closed detections to enter, six open ones to leave), and because
  a pinch enters at frame 2 and a fist at frame 4, closing the hand *on* a
  print reads as pinch → hold → fist → open. While a fist holds, the pinch
  machine is frozen and the push test is off: a fist must never scatter the
  prints, and a pinch must never open one. The opened print flies to the centre
  at 62 % of the viewport height, perspective-corrected at its own z; the other
  thirteen drift out and fade but are never disposed, so a close puts them back
  exactly where they were. A 450 ms arm window after the open swallows a
  double-click's second press. Closing is a sweep of the open palm (at 0.75 ×
  the push speed, no cooldown), a flick, a double-click, or Escape / Backspace
  / P — and the same sweep raises no wave outside focus mode. Hover (lift,
  a touch of scale, up to 5° of tilt toward the fingertip) is the piece's
  answer to "which print am I about to take"; touch gets none. The legend
  became an onboarding card that leaves at the first gesture that lands, and an
  opened print carries a caption from fourteen one-liners in the Vortex voice —
  English in both locales, like the prints themselves.
- **Parete — an endless ground, a back, and a tour.** The figure is gone;
  scale now comes from the riser, the cabinets and the pool of light. The
  backdrop cylinder went with it: a 400 m floor under a linear fog to black
  from 10 to 40 m has no edge to find at any distance, and drei's reflector
  keeps `<fog_fragment>`, so the mirrored floor fades with it. The back is
  modelled from the same `LED_CABINETS` table as the face — cabinet bodies,
  lips, a lead drooping between every pair of connectors, a loom per row, the
  ground support, a processor with its pilot — in six draw calls, laid out from
  the front's own numbers so the two can never disagree. It is lit at 60 % of
  the front, not the 10 % the brief asked: a near-black albedo under a dim
  light is simply black, and the first capture showed nothing but the pilot.
  The loop arrows became a row of lamps in the palette's own colours, and a
  switch is a wipe across the cabinets — two render targets trade places rather
  than blitting, the colour behind the front settles in 0.4 s so the edge
  carries the change, and the lights follow what the wall shows rather than the
  live palette. The guided tour (`what is a led wall?`, six stations) is DOM
  over the rig's own tween; its card waits for the rig to report the landing
  instead of a timer, so the words always follow the room. Taking a view or a
  walk key closes the tour; looking around inside a station does not.
- **The index tells the new story.** `gd.demos.{darkroom,hands,wall}` now lead
  with what round 2 added — it develops by itself, close your hand on a print,
  walk round the back and take the tour — and the two covers were re-shot from
  the demos themselves: Parete at an oblique from the right with the whole wall,
  the riser and the amber pool in frame (the preset's own 13 m framing leaves
  the wall a smudge in a 4:5 crop, so the frame is the preset's angle at 9 m),
  Mani with one print opened, its caption under it and the reticle on it. Camera
  Oscura keeps its print: nothing the fluid does reads better at 220 px than the
  photograph it develops.

## Deferred

- **WebGPU** (TSL/`WebGPURenderer`) is intentionally not attempted; WebGL2 ships.
  A WebGPU path with WebGL2 fallback can come later without architecture changes.
  (The layout's keywords no longer say "webgpu" for that reason.)
- **Content-Security-Policy.** The document inlines a JSON-LD script and
  React's own bootstrap, so a real policy needs per-request nonces (a proxy
  that stamps the nonce and a `headers()` that reads it). Not done in round 3;
  `Referrer-Policy` and `X-Content-Type-Options` are.
- **`hreflang` / `alternates.languages`.** See "Round 3 — C": the locale is a
  cookie, not a URL, so there is no second URL to point a crawler at.

## Round 3 — audit fixes (2026-09-13)

The audit in `reference/briefs/round3/audit-2026-09-13.md` (item ids B/S/I
below) was fixed by six parallel packages, one session each, with a shared
working tree and one index; `reference/briefs/round3/00-shared.md` has the
rules, `reference/briefs/round3/reports/<pkg>.md` the per-package reports.
Each package appends its own subsection here — **append, never rewrite** the
ones above.

### A — chrome, providers, globals.css

- **Reduced motion is known before the first client render (B13, `155efa4`).**
  `AppProvider` reads the synchronous `useSyncExternalStore` snapshot in
  `lib/use-reduced-motion.ts`, whose `getServerSnapshot` returns the real media
  query on the client (`false` on the server). The invariant this rests on:
  **no server-rendered markup may branch on `reducedMotion`.** The loading veil
  is always rendered and hidden by CSS under `reduce` (returning `null` left an
  orphan server node React 19 silently skipped — no warning, no fiber), the
  topbar takes `in` only on the motion path, WebGL mounts wait for
  `fieldReady`. `entered` is latched during render, so toggling the OS setting
  off later never hides the topbar again. Director-approved on the condition
  that no server markup branches on the flag and hydration stays warning-free.
- **The veil holds Lenis with a `prevent` predicate (B11, `972f236`)** keyed on
  `html.loading` (`SmoothScroll.tsx`) — not `data-lenis-prevent` on `<body>`
  (HomeSequence and AboutSequence own that attribute; the veil releasing it
  would strip their lock) and not `lenis.stop()` (it kills pinch-zoom).
  Director-approved.
- **The veil lifts onto the real page, not `(site)/loading.tsx` (B19,
  `41fbc09`).** Loader's `holdForPage()` pauses a timeline until `#main` has
  no `[aria-busy="true"]` fallback and at least one child (a
  MutationObserver), bounded by `VEIL_HOLD_MS` (2400 ms, counted from when the
  fill parks) — the first load parks at 82 %, the nav sweep and the fast
  dissolve park at the full bar. The 2 s safety dismissal stands aside during
  a hold and is re-armed `SAFETY_AFTER_HOLD_MS` (1500 ms) after it resumes.
  Both are tunables in `Loader.tsx`.
- **The topbar entrance plays once per page load (B12, `db86fbe`)** — the
  1.15 s hide + 1.2 s fade + `html.entering` field bloom — like the veil's own
  beat: Loader exports `hasVeilPlayed()` and Shell reads it once at mount
  (`useState(hasVeilPlayed)`), so a remount of the (site) layout on the way
  back from a demo shows the bar outright.
- **One navigation sweep at a time (B10, `b1732c1`).** A plain
  `useLayoutEffect` whose cleanup kills the in-flight sweep (`useGSAP` with
  `dependencies` and no `revertOnUpdate` never reverts between runs); an
  interrupted fill hands its progress to the next sweep (`navProg`).
- **The scrollbar gutter is released on the locked pages (B18, `be04359`).**
  `scrollbar-gutter` goes to `auto` on the locked home
  (`html.home-live:not(.home-scroll)`) and the locked /about
  (`html.about-live`), exactly as on `.immersive`, so fixed layers span the
  full window under classic scrollbars. The 15 px reflow happens under the
  opaque veil in the same effect flush; flow mode gives the gutter back,
  because the page scrolls again there.
- **Keyboard focus is one amber ring on every site control (I15, `273b40c`).**
  `--ring: #b07846` (the accent, opaque, ~5:1 on the void); `outline: 2px
  solid var(--ring); outline-offset: 3px` on `:focus-visible`, in place of the
  colour-only lift (~2.2:1 between states). Mouse focus stays invisible.
  Deliberate exceptions: `.wrap:focus` (the programmatic skip-link target) and
  the demos' exit links, which style their own controls — all five demos
  adopted the same ring in this round (D, E, F below).
- **Phones hold an 11 px mono floor and 40 px hit areas (I13, I14,
  `2735afc`).** At ≤ 560 px the mono register floors at 0.7rem (11.2 px),
  topbar included — 0.6875rem for the bar under 380 px, with tracking pulled
  to 0.06em — while desktop keeps the finer 0.62–0.68rem hierarchy. The
  chrome's small controls are ≥ 40 px tall on every pointer through absolutely
  positioned pseudo-elements (the pager's tick is its `::before`, so its box is
  `::after`). The one layout change for it: a 1.6rem row gap for wrapped
  footer links and about CTAs on phones, so adjacent boxes never overlap.
- **The Vortex demo's CSS lives in `src/components/vortex/vortex.css` (S13,
  `9021b23`)**, imported by `VortexExperience.jsx`, as the other four demos
  load theirs from their route folder; `globals.css` carries no demo styles.
  `.vortex-immersive` / `.vortex-exit` keep their names as the shared idiom
  the demo stylesheets copy. E owns the file from here.
- **Bottom chrome adds `env(safe-area-inset-bottom, 0px)` (`7d190a6`)** now
  that `viewport-fit=cover` is on (C5): footer bottom padding, the about
  scroll cue, the phone pager, the contact panel's bottom padding, the home
  flow footer.
- **The custom cursor ignores touch and hides off-window (B25, `4bd24d3`).**
  `pointerType === "touch"` is ignored and both marks fade out on a
  `pointerout` with no `relatedTarget` (`.is-out`), so the dot never jumps
  under a finger on a touch laptop and never stands at the window edge.

### B — site pages, home / about / work, canvas

- **Ambient field gate (S1, `b5f9389`).** The shared WebGL field and everything
  that rides it — the name melt, the /about cut-outs, the gen-row auras —
  mount only when `useFieldAllowed()` (`components/canvas/field-gate.ts`)
  holds: past first paint + an idle slot (`fieldReady`), not under
  `prefers-reduced-motion`, and not on a device where the field cannot be
  enjoyed — `navigator.connection.saveData`, or `navigator.deviceMemory <= 2`
  (Chromium-only, reported in powers of two; Safari and Firefox never expose
  it and are therefore not gated on it), or `navigator.hardwareConcurrency <=
  2`. Where the field is skipped the designed statics stay — the DOM h1 is the
  name, the `<img>` the figure, the amber `::before` plate the gen row — so
  nothing is missing, only quieter. One gate shared by all four consumers
  means none can mount a drei `<View>` onto a canvas that was never allowed to
  exist. Thresholds live in `LOW_END` (`field-gate.ts`); verified with
  `deviceMemory` forced to 1: no canvas, no melt, zero draw calls, no three
  chunk on `/`, `/xperiments`, `/about`.
- **Software renderer: one static frame, everywhere (S10, `39124f1`).**
  `fieldState.staticOnly` is published from `Field.onCreated` when
  `isSoftwareRenderer()` matches, alongside `lost`. `NameMeltView` refuses to
  open the melt (no texture handover, no 20 fps idle floor) while it is set,
  so the DOM h1 stays the name and no view keeps the demand loop alive: 0
  draw calls/s at rest on the home under the guard. The "single static frame"
  claim under *Rendering architecture* was true only for the field itself;
  the melt had been defeating it.
- **/websites preview box (S8, `f1d6b18`).** The 16:10 site captures
  (2400 × 1500) stay under `object-fit: cover` rather than being cropped to
  the desktop 3.5:1 box: `--reveal-h` is `clamp(220px, 36vh, 400px)` against
  a ~92vw width, so the same box is ~1.2:1 on a phone — no single crop of the
  source serves both. `sizes` follows the real content column:
  `(max-width: 1280px) 90vw, 1152px` (100vw minus the wrap gutters up to the
  1280 px wrap). Both previews load eagerly (collapsed rows in the first
  viewport); no `fetchPriority` — the page's LCP is the lede. For future
  audits: with a `w`-descriptor srcset, `img.naturalWidth` is
  density-corrected (resource width ÷ (w / sizes)) — the audit's "1120 × 700
  source" and "358 px served" were that artefact, not the files.
- **/about keyboard model (B17, `121f479`).** A gesture that turns the page —
  a key, a wheel notch, a swipe — also moves focus onto the arriving panel's
  root (`<section tabIndex={-1}>`, `outline: none`, never a visible control),
  so the next Tab continues inside that panel instead of landing on the
  previous panel's next link and dragging the track back through the focusin
  hatch. Focus-driven moves (Tab into a panel, the pager buttons, the
  `#contact` CTA) never steal focus. Space on a control is left to the control
  (`isControl`, `scroll-intent.ts`); arrows still page from a link. The pager
  buttons carry a word before their index (`about.pagerItem`, "section 01" /
  "sezione 01", I11).
- **Home drivers and the document (B26, I18, I19; `7b1153f`, `77e9a15`,
  `7738b9f`).** HomeSequence and AboutSequence hand `history.scrollRestoration`
  back to the value they found, not a hard-coded `"auto"`. A run of the home
  driver that follows an 860 px mode flip (`FLOW_MQ`) with the page already
  composed hands the viewport over in flow mode without re-lock,
  `scrollTo(0,0)` or the slide to the footer — a resize must move nothing;
  into desktop mode the re-lock stands (one fixed viewport). Keys whose
  target is a link, button or form control are the control's and never scrub
  the sequence. Wheel/touch normalisation (`wheelDeltaPx`, `singleTouchY`),
  the control guard and the touch-only predicate (`isTouchOnly`, `(hover:
  none)`) live once in `lib/scroll-intent.ts` (three-free); AboutSequence no
  longer re-reads the reduced-motion media query, since AppProvider's flag is
  synchronous (A, above).

### C — copy, SEO, config, docs, covers

- **Brand, one rule (I8).** *"Alberto Marocco.dev"* is the site's **name**:
  `<title>`s, `og:site_name`, `applicationName`, the manifest, the OG image's
  alt. *"albertomarocco.dev"* is the **domain**, lowercase, wherever it is
  shown as an address: the footer's last cell, the OG image's wordmark, the
  README title. Both live in `lib/seo.ts` (`SITE_NAME`, `SITE_URL`) and
  nothing else spells them out — layout, sitemap, robots, manifest and the OG
  image import them.
- **Titles never make three dashed segments (I7).** The layout template
  appends ` — Alberto Marocco.dev`, so a page title carries no ` — ` of its
  own. A name that is two parts joins them with a middle dot in its `<title>`
  form — `Merge · Graphic Designs`, `Camera Oscura · Darkroom`, `Mani ·
  Hands`, `Tarassaco · Dandelion Wind` — while the visible h1 keeps the em
  dash (`Merge — Graphic Designs`). The vortex drops its "— Merge" suffix
  (`Image Vortex`). Every description, EN and IT, stays ≤ 160 characters
  (dictionary: 92–154). Demo `copy.ts` files apply the same rule (D/E/F).
- **Naming (I1, I2, I10).** The demo index is *Merge — Graphic Designs*
  everywhere it is a name (home teaser included — it fits the one-line teaser
  window at 1440 and 390 px); "graphic designs" is plural everywhere. In
  Italian the topbar and the /about title say **"chi sono" / "Chi sono"** —
  the nav's other English tokens (*graphic designs*, *xperiments*) are names
  of things, "about" was a word left untranslated. The contact row keys match
  across locales (*where* / *dove*), the reply note lists the languages in
  the same order in both (`it / en`), and /about's description no longer
  opens with the home's sentence. Straight `'` apostrophes in all copy (I5).
- **Dead dictionary keys are deleted, not kept (I9).** The `Dictionary` type
  forces every key into both languages, so an unread key costs a translation
  for nothing. Removed: `nav.work`, `nav.contact`, `gd.back`, `about.label`,
  `about.title`, `work.aria`, `work.sections`,
  `work.items["merge-graphic-designs"]`, `error` (the boundaries read
  `ERROR_COPY` from `lib/boundary-copy.ts` directly). New: `notFound`.
- **Per-route Open Graph (B3).** A page's `openGraph` replaces the layout's
  object wholesale (measured: setting only `title` left the home's
  `og:title`/`og:url` on every route, and setting `openGraph` without
  `images` dropped the OG image entirely). `pageMetadata` therefore writes
  the full block — type, site name, locale, url, title with the suffix,
  description, the image — and Twitter alongside; every `page.tsx` calls it.
- **Immutable means renamed, never overwritten (B4, S15).** Anything served
  under `Cache-Control: immutable` is content-addressed by its **path**: when
  the bytes change, the path changes. The folders under that header, both in
  `next.config.ts`: `public/mediapipe/<version>/` (the `@mediapipe/tasks-vision`
  version — a package bump is a new folder, the old one deleted once nothing
  references it; the never-requested `vision_wasm_module_internal.*` were
  dropped, S6) and `public/vortex/images/` (a re-encoded print is a new
  filename, and the reference in the vortex config moves with it — the set
  was re-encoded in place once, `ca3ac2b`). The demo covers left `/public`
  altogether: `src/assets/covers/<id>.webp` are static imports, so Next
  hashes the URL (`/_next/static/media/<name>.<hash>.webp`) and a re-shot
  cover is a new URL by construction. The vortex cover is now an 800 × 1000
  capture of the running piece, like the other four (S7).
- **Cover `sizes` follow the card (S7).** `(max-width: 560px) 88vw,
  (max-width: 785px) 28vw, 220px` — one column under 560 px, the
  `clamp(120px, 28vw, 220px)` column to the point where it caps, 220 px above.
  Measured on the iPhone 14 viewport: the 309 css px box gets the full 800 px
  source (2.6×) instead of a 156 px variant. Covers below the fold are
  `loading="lazy"`; the first keeps its `preload`.
- **The 404 is the site's own page (B2).** `app/not-found.tsx` renders inside
  the root layout only — the (site) chrome (topbar shell, veil, Lenis, the
  WebGL field, the custom cursor) is deliberately not mounted, so a mistyped
  URL never boots three.js. It borrows the section pages' classes (`.topbar
  .in` wordmark, `.sect-label`, `.page-title`, `.page-lede`, `.gd-back`, the
  footer), reads the locale cookie (an async Server Component), and restores
  the pointer inline because `globals.css` hides it for a custom cursor that
  is not there. Next stamps it 404 + `noindex`; its `<title>` is the layout's
  default (a root `not-found` cannot export metadata).
- **Fallbacks read the cookie on the server (I12).** The demos'
  `loading.tsx` is an async Server Component: the word is right from the
  first byte, and the partial prefetch still carries it (checked on the RSC
  prefetch payload). The two `error.tsx` stay Client Components and read
  `<html lang>` — a boundary's fallback is client-rendered, never hydrated,
  so `useLocale` returns the real value on its first render; no flash to fix.
- **`hreflang` is not possible with a cookie locale (I12).** There is one URL
  per page and the language is a cookie, so there is no alternate URL for
  `alternates.languages` to point at, and a crawler — which sends no cookie —
  indexes the Italian default only; the English copy is invisible to search
  engines and social previews (`og:locale` for bots is always `it_IT`). A
  deliberate limit of the no-`[lang]`-routing decision above, accepted for a
  portfolio whose primary language is Italian. Also no `Accept-Language`
  negotiation, for the same reason (the cookie is the choice).
- **Headers (I26).** No `Permissions-Policy`: the spec's default allowlist
  for a top-level document is already `self`, so the per-route
  `camera=(self)` blocks granted nothing — and the inverse, `camera=()` on
  every other route, would break the demos, because a policy binds to the
  document and a client-side navigation into a demo keeps the previous page's
  document. Every response carries `Referrer-Policy:
  strict-origin-when-cross-origin` and `X-Content-Type-Options: nosniff`.
  CSP: deferred, above.
- **AVIF stays off (I26), measured.** The optimizer runs per request, not at
  build, so "build time" was never the cost; the cost is CPU per variant and
  the result is worse: on these dark, already-lossy WebP sources sharp's AVIF
  at q75 came out *larger* than WebP (darkroom cover 640 w: 17.2 KB vs 9.7
  KB; vini 1080 w: 90 KB vs 45 KB) and 3–6× slower to encode. Revisit only
  with photographic sources.
- **OG image fonts (S14).** `opengraph-image.tsx` reads
  `src/assets/fonts/fraunces-300-latin.ttf` with `fs` at module scope — no
  network at build. The file is the TTF Google Fonts serves for
  `Fraunces:opsz,wght@9..144,300`, subset with the CSS API's `text=`
  parameter to printable ASCII + `àèéìòù ÀÈÉÌÒÙ · — – ’` (25 KB). To add
  glyphs: request `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300&text=<url-encoded glyphs>`
  with a non-browser UA, download the `url(...)` it names, replace the file.
  The rendered PNG is pixel-identical to the fetched-at-build version. Only
  the fonts a build reads are vendored (no JetBrains Mono: nothing renders it
  server-side).
- **Sitemap dates are a table (I25).** `sitemap.ts` keeps a per-route
  `modified` date, seeded from each route folder's last commit; bump it when
  a route's content or behaviour really changes, not for a chrome or
  dependency change that touches every page. `manifest.ts` describes a
  *site* (`display: browser`, Italian description, the SVG mark + the PNG
  apple icon); `apple-icon.tsx` draws the `icon.svg` mark at 180 px.
- **Locale cookie (I12).** `persistLocale()` in `lib/locale.ts` writes it with
  `Secure` when the page is https (nothing on localhost); the toggle is to
  call it (request to A).
- **Repository hygiene (I27).** `toretto-raw.png` (the source of the Toretto
  Blend row preview) moved from the root to `reference/WorkPhotos/`. The
  `src/Merge Designs/` exceptions in `.gitignore`, `eslint.config.mjs` and
  `tsconfig.json` stay: the folder is Alberto's untracked 64 MB source
  archive for Tarassaco, on disk in this checkout; the three exclusions are
  what keep it out of the build, and moving a folder the dev server watches
  is a Windows lock away from a crash. Move it out of `src/` by hand when
  the server is down, then drop the three lines.
- **Left for the second C run (needs the other packages first):** the
  DECISIONS entries and dictionary requests A/B/D/E/F hand over; the
  `.notfound` CSS block (request to A) so the 404's inline `cursor` styles
  can go.

### D — Mani, Camera Oscura

- **Touch targets in the demos (D4, D11; I14; `bd21e27`, `191a4cc`).** Controls
  that are text-like — the exit pill, "or use the pointer", "try the camera
  again" — keep their visible size; on `(pointer: coarse)` an invisible
  `::before` inset (44 px tall, 6 px wider on each side, centred on the
  control) takes the tap. Bordered buttons get `min-height: 44px` instead. The
  darkroom's `next print →`, the only control of the brush path, is 44 px tall
  on every pointer. WCAG 2.5.8 without moving the hand-authored design.
- **Mani loads MediaPipe at the gate (D3; S5; `25a9fe2`).** The wasm (~12 MB)
  and the hand model (~8 MB) start downloading when the gate mounts — no
  permission is needed — once per mount and shared by every camera start;
  `navigator.connection.saveData` waits for the click instead. The task file
  is fetched with a byte count and streamed into the landmarker
  (`modelAssetBuffer`), so the gate can show "downloading the model… N %"
  while the visitor waits on it. `INIT_TIMEOUT_MS` (8 s) now covers the camera
  alone (permission → stream → first frame); the model has no clock. A model
  that will not load gets its own dialog line (`errModel`) with the retry,
  which re-runs the load. In `next dev`, React StrictMode runs the mount effect
  twice: the first load is aborted at once — two model requests in the network
  panel are expected there, not in production.
- **Mani's console filter for MediaPipe's INFO lines (D3, D8; B24; `25a9fe2`)**
  is one page-level patch, reference-counted (`leaseConsoleFilter` in
  `useHandTracker.ts`), held while a load is in flight or a landmarker is
  alive: a failed load releases it at once, an unmount aborts the load and
  releases when it settles or after `CONSOLE_FILTER_GRACE_MS` (15 s). It
  replaces the per-session patch, which could stay patched forever on a wasm
  fetch that never resolved and which two overlapping mounts could restore
  from under each other.
- **Camera Oscura quality tiers (D10; S4; `ac5b38f`).** `TIER` in
  `darkroom.config.ts`. The mobile tier is picked once at mount on a coarse
  pointer, a viewport under `mobileMaxWidth` (720 CSS px) or
  `navigator.deviceMemory <= mobileMaxMemoryGb` (4): grids at 0.75× (velocity
  192, dye 384, exposure long side 768), 8 Jacobi iterations (desktop 20),
  sub-step budget 2 (desktop 3), no vorticity pass (strength 3 is a
  texel-scale whisper), canvas DPR ≤ 1.25 (desktop 1.5). On every tier the
  handover now develops one print a frame: the finished print's look (tone,
  paper) is baked once into the RG16F hold target (`BAKE_FRAG`) and the
  composite reads it back with one tap while it sinks. The grid-size knobs
  left `SIM` for the tiers.
- **Camera Oscura prints (D12; B24; `ac5b38f`)** are loaded with
  `ImageBitmapLoader` (`createImageBitmap`, off the main thread,
  `imageOrientation: 'flipY'` because a WebGL upload ignores `UNPACK_FLIP_Y`
  for ImageBitmap sources), `TextureLoader` as the fallback where
  `createImageBitmap` is missing; a bitmap is closed with its texture. A print
  that lands late — the tray showing the black placeholder after a handover on
  a slow network — keeps whatever was developed on it meanwhile: the texture
  goes in under the exposure, remapped from the placeholder's 4:5 rect onto
  the print's own. Kept rather than blocked, so the tray never ignores a hand;
  on a very slow network a vigorous stir on the placeholder can fix the print
  the moment it lands — the accepted fault.
- **Camera Oscura touch (D11; I16; `191a4cc`).** `touch-action` moved from the
  whole stage (`none`, which disabled the page's pinch-zoom — WCAG 1.4.4) to
  the canvas as `pinch-zoom`: one finger stirs, a two-finger pinch is the
  browser's zoom, the chrome above the canvas keeps every gesture. Two-finger
  stirring on touch is given up for it. Mani keeps `touch-action: none` on its
  canvas in pointer mode only, because two fingers are its tear gesture
  (`c9e0ab6`).
- **Demo titles and cards (D9, D13; I7, B3; `268f255`, `80c8292`).** `metaTitle`
  "Mani · Hands" and "Camera Oscura · Darkroom" (the middle dot, so the
  layout's " — Alberto Marocco.dev" template never makes three dash-separated
  segments); both demos' `page.tsx` use `pageMetadata` for their own OG /
  Twitter card; descriptions EN 152 / IT 155 (hands) and 131 / 134 (darkroom)
  characters; the IT darkroom aria reads "Camera Oscura — sviluppo
  interattivo…" instead of the tautology (I10).

### E — Tarassaco, Image Vortex

- **Tarassaco has no WebGL of its own and therefore no `noWebgl` message** — a
  deliberate exception to the I17 stage-semantics rule (director decision;
  `d15b235`, `e0e0e6c`). `hasWebGL2()` only chooses the MediaPipe
  `FaceLandmarker` delegate: GPU first, then CPU; if `detect()` throws mid-run
  the wind stays on the microphone and the HUD's `aria-live` mode slot shows
  `copy.contextLost` ("fotocamera persa — solo microfono"). Press-and-hold on
  the stage is the touch equivalent of holding Space; the HUD hint switches by
  pointer type.
- **lucide-react is no longer a dependency (E5, `52f663e`).** The three gate
  glyphs of Tarassaco (mic, camera, spinner) are inline SVGs in
  `GateScene.tsx`; neither the README's stack list nor this file names it.
- **Tarassaco layout tunables** live in `tarassaco/tarassaco.config.ts` (new,
  `322a7f6`): `PHONE_MAX_WIDTH` 640 (must equal the `max-width: 640px` block
  in `tarassaco.css`), `FLOWER_SIZE_DESKTOP/PHONE` 450 / 200,
  `FLOWER_OFFSET_DESKTOP/PHONE`, `EXCLUSION_PAD` 30, `HINT_CLEARANCE` 48,
  `MIN_TEXT_WIDTH_DESKTOP/PHONE` 200 / 176. The stage is `fixed; inset: 0;
  overflow: hidden`; on short phones the poem's tail may clip under the HUD —
  nothing scrolls, by design. `PretextLayout` measures with the container's
  computed font (the poem is set in `var(--serif)` now) and re-measures on
  `document.fonts.ready`.
- **Tarassaco wind (E6; S12; `0e0f475`).** The dandelion's 140 seeds are
  particles drawn on one 2D canvas covering the viewport (`GlowingDandelion`;
  the hook's `WindParticle` interface — `set()` per frame, `ease()` for
  recovery and reduced motion); a word flies once, as one CSS transition, the
  moment the wind front reaches it (distance, lift, spin and duration from
  force over mass) instead of being integrated every frame. Constants at the
  top of `hooks/useWindPhysics.ts`: `WIND_FRONT_SPEED` 90 px per 60 Hz frame
  (was a literal 180), `WORD_FLY_PX` 700, `WORD_FLY_MS` 1800,
  `RECOVERY_SETTLE_MS` 3000 (keep equal to the 3 s of `.physics-recover` in
  `tarassaco.css`), `REDUCED_SETTLE_PX` 60 / `REDUCED_SETTLE_MS` 500,
  `SENSOR_TIMEOUT_MS` 9000 (armed by the gate click). Reduced motion: reveals
  instant, one 0.5 s settle per word/seed, recovery a cut.
- **Image Vortex loading (E10; S2; `5ef5c9c`).** Every card is its own Suspense
  boundary; the first ring mounts after the canvas's first frame and each
  further ring once the loading manager goes quiet after the previous one, on
  `requestIdleCallback` (`utils/useOuterRings.js` — `useRingStage`, read in
  `VortexScene` in the DOM root, never inside the `<Canvas>`: a `useProgress`
  subscriber in the r3f root is updated mid-render of a suspending card and
  React warns). Late cards fade in over 0.9 s. drei's `<Loader>` is replaced
  by `VortexVeil` (lifts after the first ring, never returns); the `dynamic()`
  chunk fallback shows the site's loading tag via the same inline-styled veil
  (inline because it renders before the chunk that carries `vortex.css`). On
  unmount the experience disposes every tracked texture and calls
  `useLoader.clear` for the 54 URLs (`utils/textures.js`).
- **Image Vortex stylesheet and keys (B8, B20; `cdabc8c`, `5792230`).** After
  A's move (`9021b23`) `src/components/vortex/vortex.css` belongs to the demo:
  `.vortex-frame` is sized in `100dvh` with the `100vh` line as fallback and
  carries `touch-action: pan-y pinch-zoom`; the exit/back controls get the
  2 px amber focus ring (`var(--ring)`) instead of `outline: none` and a 44 px
  tap through `::before` on coarse pointers; `.vortex-fallback` is the
  `role="alert"` no-WebGL / context-lost message. Keys: Escape / Backspace /
  ArrowLeft ignore repeat and Alt / Ctrl / Meta. Title rule applied: vortex
  `metaTitle` "Image Vortex", tarassaco "Tarassaco · Dandelion Wind"; both
  descriptions under 160 characters; the IT step-back label keeps "← vortex"
  (the piece's own word, not translated — I10).
- **The five exits share one focus and tap idiom (I14, I15).** Tarassaco and
  Vortex took the site's amber ring (`outline: 2px solid var(--ring);
  outline-offset: 3px`) on `:focus-visible` and grow the exit's tap box on
  `(pointer: coarse)` (`5fd876a`, `cdabc8c`); the copies in `darkroom.css`,
  `hands.css` and `wall.css` followed in the same round (`191a4cc`,
  `bd21e27`, `2ec2417`), so no demo stylesheet carries `outline: none` on its
  exit any more.
