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
  scissors it — the open generative row, or the full-viewport entrance wash.
- **drei `<View>` tracks its own `<div>`.** Outside the canvas, drei's `View`
  ignores a passed `track` ref and instead renders + tracks its own element, so
  the aura `<View>` div (`.aura-view`) absolutely fills the row's `.row-reveal`.
  As GSAP grows the reveal height, the scissor grows with it — that's the wipe.
- **Render-on-demand loop.** Each aura advances `u_time`/`u_fade` only while its
  row is open (or while the fade-out settles), re-arming the next frame via
  `invalidate()`. At rest nothing renders. Under `prefers-reduced-motion` it
  paints a single static frame and never loops.
- **Aspect from the live DOM box.** drei's per-`View` size is captured at mount
  (when the reveal is collapsed), so the shader's `u_res` aspect is read from the
  reveal element each frame instead. `u_res` feeds only the aspect ratio.
- **Shader UV from a varying**, not `gl_FragCoord/u_res`. Under the per-view
  scissor the raw frag-coord is offset by the view's screen position, which would
  skew the vignette; the fullscreen-triangle varying keeps UV view-local. The
  noise/colour math is otherwise ported verbatim.
- **Lazy 3D.** three/r3f/drei are code-split (`next/dynamic`, `ssr:false`) for
  both the field and the per-row aura, and only mount after entry + a
  `requestIdleCallback` slot (`fieldReady`). The hero paints as static server
  HTML with zero 3D; the initial JS is ~224 KB gzipped (no three).
- **Static fallback.** Generative rows show a faint amber `::before` plate that
  crossfades out once the canvas is live (`.canvas-live`), and stays if WebGL is
  unavailable.

## Motion

- **GSAP** owns the layout-affecting reveal (height) and the directional wipe
  (`clip-path` via a `--reveal-clip` CSS var) + opacity, inside `useGSAP`. Cheap
  micro-transitions (title shift, amber line, sibling dim, media scale) stay as
  CSS. The signature easing `cubic-bezier(0.22,1,0.36,1)` is registered as a GSAP
  `CustomEase` named `field`.
- **Lenis** is mounted at the root and driven by the GSAP ticker (so scroll and
  GSAP share one clock); disabled under reduced motion.

## Content / placeholders — NEED REAL VALUES

- **P.IVA `00000000000`** in the footer is a placeholder.
- **Instagram** links to `instagram.com/albertomarocco` (guessed handle).
- **"Studio — next"** is a coming-soon row; its link points to `#work` until the
  real project/route exists.
- Generative rows render the live shader (no stock imagery). The `web` rows use
  gradient plates as placeholders — **replace with real photos/video/loop stills**.
- No physical address anywhere (privacy), per the spec.

## Analytics / SEO

- **`@vercel/analytics/next`** — cookieless, no banner.
- Metadata API (title template, description, OpenGraph, Twitter, robots,
  canonical), `sitemap.ts`, `robots.ts`, brand `icon.svg`, and a dynamic OG image
  (`opengraph-image.tsx` via `next/og`, Fraunces fetched as TTF and subsetted).

## Deferred

- **WebGPU** (TSL/`WebGPURenderer`) is intentionally not attempted; WebGL2 ships.
  A WebGPU path with WebGL2 fallback can come later without architecture changes.
