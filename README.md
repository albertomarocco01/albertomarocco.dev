# albertomarocco.dev

Alberto Marocco's personal portfolio — a minimal, dark/liminal site that is
itself the portfolio piece. Full-width rows sit nearly invisible in the dark and
expand on hover/focus; the generative works reveal a **live WebGL aura shader**,
painted by a single shared, scissored canvas.

## Stack

Next.js 16.3 (App Router, TypeScript 6, Turbopack) · React 19.2 · three +
@react-three/fiber 9 + drei 10 · @react-three/postprocessing (wall, vortex) ·
GSAP + `@gsap/react` · Lenis · `@mediapipe/tasks-vision` 1.0.1, self-hosted
(hands, tarassaco) · `next/font` (Fraunces, JetBrains Mono) ·
`@vercel/analytics` (cookieless) · Vercel.

## Architecture (the core decision)

One persistent `<Canvas frameloop="demand">` mounted once in the site layout
paints the ambient field, the home's name and the aura **only into the rects
that need it** via drei `<View>` + `gl.scissor`. three/r3f/drei are code-split
and mount after first paint + idle (`FieldMount`). See
[DECISIONS.md](DECISIONS.md) for the full rationale, and `reference/` for the
canonical look/timing/shader.

```
src/
  app/            root layout (document shell, fonts, metadata, JSON-LD),
                  globals.css, not-found, sitemap / robots / icon /
                  apple-icon / manifest / opengraph-image
  app/(site)/     layout (providers + chrome: loader, cursor, Lenis, field,
                  topbar), home, about, websites, xperiments, graphic-designs
                  (the demo index)
  app/(immersive)/graphic-designs/
                  the five Merge demos, each at /graphic-designs/<id> — vortex,
                  tarassaco, darkroom (Camera Oscura), hands (Mani), wall
                  (Parete); /xperiments/<id> 308s to them. One folder each:
                  page → client (ssr:false) → App + components/, hooks/,
                  <id>.config.ts (every tunable), <id>.css (scoped). Briefs and
                  build reports in reference/briefs/
  components/
    chrome/       loader, cursor, glow, grain, shell (topbar + wrap), locale
                  toggle, Instagram glyph
    home/         HomeSequence (the opening driver) + Teasers / TeaserFX
    work/         WorkRows (open-state, hover-intent) + Row
    about/        AboutFigure (cut-out <img> + GPU view) + AboutSequence
                  (3-panel paged driver)
    canvas/       Field (the shared canvas) + FieldMount (lazy mount),
                  Aura / AmbientField / GenAura (drei Views), aura-material,
                  field-glsl (orb count + shared GLSL), field-state, excite;
                  NameMelt / NameMeltView + melt-material (the home name);
                  FigureView + figure-material (the /about cut-outs);
                  BubbleControls / BubblePanel + bubble-params (dev-only
                  field tuner, `?tune`)
    providers/    AppProvider (reduced-motion / fieldReady), SmoothScroll
    vortex/       the Image Vortex experience (JSX) + vortex.css, its
                  stylesheet (loaded by VortexExperience.jsx; the other demos
                  load theirs from their route folder)
    Footer, Hero
  lib/            work (content), contact (tokens), seo (site URL/name +
                  per-route metadata), motion, track-motion, dictionary (+ i18n
                  server side; locale + boundary-copy are the client-safe
                  slices the route fallbacks import), use-locale,
                  use-reduced-motion, use-tab-visible, webgl-caps
  assets/         about/ cut-outs (regenerate: reference/AboutPhotos/cutout.py),
                  work/ previews (sources: reference/WorkPhotos/), covers/ demo
                  covers (imported → hashed URLs), fonts/ the OG image's TTF
public/
  mediapipe/<version>/   wasm + models, immutable: a new version is a new folder
  vortex/images/         the vortex set, immutable: rename on change
                         (DECISIONS: "immutable means renamed, never overwritten")
```

## Develop

```bash
npm run dev      # dev server
npm run build    # production build (also typechecks)
npm run lint     # eslint
npm start        # serve the production build
```

## Before launch

Replace the placeholders flagged in [DECISIONS.md](DECISIONS.md) ("NEED REAL
VALUES"): the real **P.IVA** (the footer shows none until then), the coaching
rows and reply-time note on /about. Run a Lighthouse pass on the Vercel preview
(target ~100 / low LCP / no CLS) and confirm cookieless analytics.
