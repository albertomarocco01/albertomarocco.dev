# albertomarocco.dev — Build Spec & Agent Brief

> Source of truth for building Alberto Marocco's personal portfolio.
> Pair this file with **`alberto-marocco-prototype-v2.html`** — that HTML is the canonical reference for the *look, the interaction timing, and the GLSL shader*. This doc is the engineering plan around it.
> Versions are current as of **June 2026** — confirm latest patches with `npm show <pkg> version` before pinning.

---

## 0. Kickoff prompt (paste into the agent)

> You are building Alberto Marocco's personal portfolio — a minimal, hand-crafted, dark/liminal site that is itself the strongest portfolio piece. Treat `alberto-marocco-prototype-v2.html` as the visual + interaction + shader reference, and this `.md` as the engineering plan.
>
> Scaffold a **Next.js 16 (App Router, TypeScript)** project. Base the 3D architecture on **pmndrs/react-three-next** (one persistent WebGL canvas, drei `<View>` + `gl.scissor`, render-on-demand). Port the GLSL aura shader from the HTML into a `shaderMaterial`. Use **GSAP + Lenis** for motion/scroll. Build in the milestone order in §9. Do **not** invent new architecture, and do **not** add generic "award-site" motion (horizontal scroll, kinetic hero type, drei blobs) — the restraint is the point. Ship WebGL; keep WebGPU as an optional later path. Performance is a hard requirement: lazy-load all 3D, static fallback, low LCP.

---

## 1. What this is

A single-page (with light internal routing) portfolio in **English**. Few works, shown deeply. The signature interaction: full-width rows that sit nearly invisible in the dark and expand on hover/focus to reveal their media — and for generative works, the reveal is a **live WebGL aura shader** painted by one shared canvas. Aesthetic: near-black, off-white low-contrast text, a single warm **amber** accent, lots of negative space, fine grain, soft glow, slow transitions, custom cursor, distinctive serif (not Inter).

Domain: `albertomarocco.dev` · Email: `hello@albertomarocco.dev`

---

## 2. Stack (current — June 2026)

| Layer | Choice | Notes |
|---|---|---|
| Runtime | **Node 20+** | required by Next 16 |
| Framework | **next@16** (App Router) | Turbopack default; React Compiler stable; keep Cache Components opt-in |
| UI | **react@19 / react-dom@19** | concurrent features on |
| Language | **typescript@5** | strict mode |
| 3D | **@react-three/fiber@9** + **@react-three/drei** (latest 9.x) + **three** (latest) | R3F v9 pairs with React 19 |
| 3D perf/postfx (optional) | **@react-three/postprocessing** | only for a subtle bloom/grain pass on the aura |
| Motion | **gsap@^3.13** + **@gsap/react** (`useGSAP`) | 100% free incl. all plugins (ScrollTrigger, SplitText, Flip) since Apr 2025 |
| Scroll | **lenis** + `lenis/react` | package renamed from `@studio-freight/lenis`; `smoothTouch` → `syncTouch` |
| Fonts | **next/font** | `next/font/google` (Fraunces) or `next/font/local` for a self-hosted display face |
| Analytics | **@vercel/analytics** (cookieless) | or Plausible/Umami — must stay cookieless, no banner |
| Hosting | **Vercel** | |

Install:
```bash
npx create-next-app@latest albertomarocco --ts --app
cd albertomarocco
npm i three @react-three/fiber @react-three/drei
npm i gsap @gsap/react lenis
npm i @vercel/analytics
# optional: npm i @react-three/postprocessing
```

---

## 3. Non-negotiable principles

1. **It must not look AI-generated / templated.** Strong, restrained art direction. If a choice feels like a default award-site move, cut it.
2. **Performance is a feature.** Target Lighthouse ~100 / low LCP. The hero must paint with **zero 3D** — the canvas wakes only on the entrance moment and runs only while a generative row is open.
3. **One accent.** Amber, used sparingly. Color otherwise lives only inside the shader reveal.
4. **Slow, intentional motion.** No bouncy easings. Custom cubic-bezier, long durations.
5. **Accessible.** Keyboard-operable rows, focus-visible states, `prefers-reduced-motion` fully honored (no shader animation, instant transitions, no custom cursor), real `<a>`/`<button>` semantics.

---

## 4. Architecture (the core decision)

**One persistent WebGL canvas for the whole app**, never unmounted on navigation, that paints the aura **only into the rectangle of the currently open generative row** via `gl.scissor`. This is exactly the `pmndrs/react-three-next` model (tunnel-rat + drei `<View>` + scissor). The HTML prototype implements this by hand in raw WebGL; in React it maps to:

- A global `<Canvas>` mounted once in the root layout, `eventSource` = document body, `frameloop="demand"`.
- drei **`<View>`** components placed inside each generative row's reveal container. Each `<View>` tracks its DOM rect and drei scissors the shared renderer to it.
- The aura is a fullscreen-triangle `shaderMaterial` rendered inside each generative `<View>`.
- **Animation gating:** while a generative row is open, that `<View>`'s `useFrame` advances `u_time` and calls `invalidate()` (or temporarily set `frameloop="always"`); when it closes, stop. Closed/off-screen views don't render → cost is bounded by what's visible.
- drei helpers for perf: `<AdaptiveDpr pixelated={false} />`, `<PerformanceMonitor>` to step DPR down under load, `<Preload all />` after idle.
- **Static fallback:** export one frame of the shader (`gl.readPixels` → PNG, or a still from TouchDesigner) and use it as a `poster`/background; mount the 3D only after `requestIdleCallback`. Under `prefers-reduced-motion`, render a single static frame and never loop.

WebGL is the shipping target. **WebGPU** (three's `WebGPURenderer` + TSL node materials) is an optional upgrade once the WebGL version is solid — must keep a WebGL2 fallback; do not block launch on it.

---

## 5. Design tokens (extract verbatim from the HTML)

```
--void:       #0a0a0c   /* near-black, faintly cool background */
--void-2:     #0c0c10
--ink:        #c7c4bc   /* low-contrast off-white body */
--ink-dim:    #6d6a64   /* meta / secondary */
--ink-ghost:  #393833   /* collapsed titles, almost gone */
--hairline:   rgba(199,196,188,0.09)
--accent:     rgba(176,120,70,0.55)   /* amber — the only accent */
--ease:       cubic-bezier(0.22, 1, 0.36, 1)   /* slow, settling */
```
- **Type:** display = **Fraunces** (variable, italic for accents), weight 300, used for the name and project titles; utility = **mono** (`ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace`), lowercase, wide letter-spacing, for indices, meta, nav, ticker. Load Fraunces via `next/font/google` (or self-host a more distinctive face via `next/font/local` if Alberto picks one).
- **Grain:** fixed full-screen SVG `feTurbulence` overlay, `opacity ~0.045`, `mix-blend-mode: screen`.
- **Glow:** two soft radial gradients (warm top, cool bottom-faint), fixed, behind content.
- **Spacing:** generous; hero ~92vh; rows ~5.4rem collapsed; reveal `clamp(220px, 36vh, 400px)`.

---

## 6. Interaction spec

### Rows (the signature)
- **Collapsed:** thin bar, hairline top border, title in `--ink-ghost` (barely visible), index + meta in mono.
- **Open (hover/focus):** height eases (~.55s bar, reveal height ~.85s); title → `--ink` and shifts `+8px`; a 1px **amber** vertical line grows at the row's left edge; the meta arrow slides in; the reveal opens with a directional **`clip-path` wipe** (`inset(0 0 100% 0)` → `inset(0)`), trailing the height by a beat.
- **Sibling dim:** when any row is open, the others drop to `opacity .4` — the rest recedes into the dark.
- **Hover-intent:** ~70ms delay before opening (ignore quick sweeps), ~150ms grace before closing (no flicker moving between bar and reveal). Focus opens instantly.
- **One open at a time.**
- **Click:** web project → external link (`target=_blank`) or internal route; generative → could open a detail route/lightbox (or stay as the live reveal).
- In React, drive the height/clip with **GSAP** (use `Flip` or animate a wrapper's `clip-path`/`grid-rows` to avoid layout thrash) inside `useGSAP`, synced with Lenis.

### Generative reveal
- The reveal container is transparent and hosts a drei `<View>`; the shared canvas paints the aura there (see §4). Caption (mono, dim) sits over a bottom gradient.
- Two pieces differ only by a **variant** within the amber family (clean amber vs dusty ember) — pass as a uniform; no second hue.

### Cursor
- Custom: a small dot that snaps to the pointer + a lagging ring (lerp ~0.16) that grows over interactive elements. Disabled on touch and under reduced-motion.

### Entrance ("enter the field")
- A gate overlay (name + a single lowercase CTA). On enter: gate fades, content fades in, and the shader does a brief **full-viewport wash** (~1.2s, amber) that fades out as content arrives — then the loop stops (pure render-on-demand). Under reduced-motion: skip the gate and the wash.

### Ticker
- A slow mono marquee carrying *real* info (discipline · location · availability), lowercase, low opacity. Pauses under reduced-motion. Keep it structural, not decorative.

---

## 7. The shader

Use the GLSL in `alberto-marocco-prototype-v2.html` verbatim as the starting point (domain-warped value-noise fbm → warm amber aura with vignette). Port into a drei `shaderMaterial`:

- Uniforms: `u_time` (float), `u_res` (vec2, the View's pixel size), `u_cool` (float — repurposed as **variant** 0..1: clean amber → dusty ember). Drive `u_time` in `useFrame` only while the owning row is open.
- Keep fbm at 5 octaves; cap DPR at 2; `antialias:false`, `powerPreference:'low-power'`.
- Optional polish: a faint **bloom + grain** pass via `@react-three/postprocessing` instead of the CSS grain inside the canvas, if it reads better.
- Production idea worth deciding early: make these the *same* outputs as Alberto's TouchDesigner LED-wall loops (shared GLSL → GLSL TOP), so the site is the live showcase of the real pipeline, not just "in the style of".

---

## 8. Content

**Selected work** (full-width rows):
1. **Vini Montarello** — web · 2025 — external → `https://vinimontarello.it`. Caption: winery brand & e-commerce, full-stack, slow scroll.
2. **Liminal Field** — installation · LED · 2025 — generative reveal (amber). 6×3m LED wall, real-time noise field.
3. **Aura Loops** — generative · TouchDesigner · 2024 — generative reveal (ember). Seamless ambient loops.
4. **Studio — next** — web · soon — internal/coming soon. Physics-based web experience, Next.js + R3F.
> Replace placeholders with real photos/video/loop stills — **no stock imagery** (it undercuts the "this is my work" thesis).

**About** (short, deep): CS graduate working between web engineering and immersive visuals; this site runs his own generative work, live, as the proof.

**Footer** (minimal, mono, lowercase): `P.IVA <number>` · Instagram · `hello@albertomarocco.dev` · `albertomarocco.dev`. **No physical address** (privacy).

---

## 9. Build order (milestones for the agent)

1. **Scaffold** Next 16 + TS + App Router; set up `next/font` (Fraunces + mono fallback), global tokens (§5), Lenis (`lenis/react` wrapper at root), GSAP + `useGSAP`, Vercel Analytics.
2. **Static shell, no 3D:** hero, ticker, rows (collapsed→open with CSS/GSAP, clip-path reveal, hover-intent, sibling dim), about, footer, custom cursor, grain, glow. Must already feel right and score ~100. This is the LCP-critical layer.
3. **Shared canvas:** integrate `pmndrs/react-three-next` pattern — one `<Canvas frameloop="demand">` in layout, drei `<View>` in generative rows, `gl.scissor` confirmed working.
4. **Shader:** port GLSL → `shaderMaterial`, wire uniforms + variant, gate animation to open state, add static fallback + reduced-motion path.
5. **Entrance** gate + wash; wire to canvas wake.
6. **Polish:** optional postprocessing bloom/grain, transitions tuning, internal project route(s), SEO/metadata, OG image, accessibility pass, Lighthouse pass.
7. **Ship** to Vercel; verify cookieless analytics.

---

## 10. Do NOT

- Don't reinvent the rendering architecture — use one shared canvas + `<View>` + scissor.
- Don't mount 3D on first paint; don't let the hero depend on WebGL.
- Don't add a second accent color, kinetic hero typography, horizontal scroll, or generic drei demo objects.
- Don't use Inter, and don't use stock photography.
- Don't break keyboard access or ignore `prefers-reduced-motion`.
- Don't block launch on WebGPU.
