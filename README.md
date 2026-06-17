# albertomarocco.dev

Alberto Marocco's personal portfolio — a minimal, dark/liminal site that is
itself the portfolio piece. Full-width rows sit nearly invisible in the dark and
expand on hover/focus; the generative works reveal a **live WebGL aura shader**,
painted by a single shared, scissored canvas.

## Stack

Next.js 16 (App Router, TypeScript, Turbopack) · React 19 · @react-three/fiber 9
+ drei 10 + three · GSAP + `@gsap/react` · Lenis · `next/font` (Fraunces) ·
`@vercel/analytics` (cookieless) · Vercel.

## Architecture (the core decision)

One persistent `<Canvas frameloop="demand">` mounted once in the layout paints
the aura **only into the rect of the open generative row** via drei `<View>` +
`gl.scissor`. The hero paints with zero 3D; three/r3f/drei are code-split and
mount only after entry + `requestIdleCallback`. See [DECISIONS.md](DECISIONS.md)
for the full rationale, and `reference/` for the canonical look/timing/shader.

```
src/
  app/            layout (fonts, metadata, providers), page, globals.css,
                  sitemap / robots / icon / opengraph-image
  components/
    chrome/       glow, grain, cursor, gate, shell (topbar + fade-in wrap)
    work/         WorkRows (open-state, hover-intent) + Row
    canvas/       Field (the shared canvas) + FieldMount (lazy gate),
                  Aura (shader mesh), GenAura / WashView (drei Views),
                  aura-material (GLSL → shaderMaterial)
    providers/    AppProvider (entered / reduced-motion / fieldReady), SmoothScroll
  lib/            work (content) + motion (easing, timings)
```

## Develop

```bash
npm run dev      # dev server
npm run build    # production build (also typechecks)
npm run lint     # eslint
npm start        # serve the production build
```

## Before launch

Replace the placeholders flagged in [DECISIONS.md](DECISIONS.md): real **P.IVA**,
**Instagram** handle, the **Studio — next** destination, and real media for the
`web` rows. Run a Lighthouse pass on the Vercel preview (target ~100 / low LCP /
no CLS) and confirm cookieless analytics.
```
