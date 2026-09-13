# B — Site pages and canvas

**Session `alberto-marocco-f7` · Opus 5 · effort high.** Read
`00-shared.md`, then `audit-2026-09-13.md`, then this file.

## Owns

- `src/components/home/**`, `src/components/about/**`, `src/components/work/**`
- `src/components/canvas/**`, `src/components/Hero.tsx`, `src/components/Footer.tsx`
- `src/lib/work.ts`, `src/lib/motion.ts`, `src/lib/track-motion.ts`, `src/lib/webgl-caps.ts`
  (+ a new shared helper file in `src/lib/` if B9 needs one)
- `src/app/(site)/page.tsx`, `src/app/(site)/about/page.tsx`,
  `src/app/(site)/websites/page.tsx`, `src/app/(site)/xperiments/page.tsx`,
  `src/app/(site)/loading.tsx`, `src/app/(site)/error.tsx`
- `src/assets/**` (the work/about images)

Not yours: `globals.css` (send A the rules), `src/app/(site)/graphic-designs/page.tsx`
and `layout.tsx` (C), chrome/providers (A). A will change how
`reducedMotion` is provided (synchronous snapshot) — expect a message; until
then keep `AboutSequence`'s own MQ read.

## Audit-verify first

Real browser: /about with the keyboard only (B17); /websites resize with a
row open (B16); `/` with a software-renderer flag or by reading
`Field.tsx`'s `staticOnly` path (S10); DevTools → Rendering → emulate
`prefers-reduced-motion` on `/` (B13 side of your files). Report to the
director.

## Fix, in this order (each its own commit)

1. **B1 · B6** — WebGL context loss on the site canvas. `Field.tsx:55-82`:
   handle `webglcontextlost` (`preventDefault`) / `webglcontextrestored`
   on the R3F canvas; on loss drop `canvas-live`, `h1.is-melting`
   (`NameMeltView.tsx:175`) and `figure.is-live` (`FigureView.tsx:146`) so
   the static name/photos show; on restore re-arm. Simulate with
   `WEBGL_lose_context` in the console on `/` and `/about`.
2. **B2 · S10** — the ambient field must stay a single frame under
   `staticOnly`. `NameMelt.tsx:23` / `NameMeltView.tsx:207-216`: the 20 fps
   idle floor must not invalidate the demand loop when the field is static
   (share `staticOnly` through the canvas context or a tiny store instead of
   `Field.tsx:31` local state). Verify: with the software-renderer guard
   forced, rAF-per-second on `/` at rest ≈ 0.
3. **B3 · B16** — row reveal height. `Row.tsx:90-98` + `globals.css:1163`:
   tween to `auto` via measured height then clear to `auto`/`clamp()` on
   complete, and re-measure on resize while open. Send A the CSS if needed.
4. **B4 · B17** — /about keyboard model. `AboutSequence.tsx:236-273`: when
   arrows/PageUp/PageDown move the track, move focus to the panel (a
   `tabIndex=-1` panel root) so the next Tab continues inside it; keep
   `onFocusIn` for real Tab travel. Also `I18`: on the home,
   `HomeSequence.tsx:511-547` must ignore keys when `e.target` is a
   button/link/input (same guard as `AboutSequence.tsx:239-241`).
5. **B5 · S8** — /websites images. `websites/page.tsx` + `Row.tsx`: correct
   `sizes` for the real rendered box (desktop ≈ 1180 px, phone ≈ 92vw at
   dpr 3), remove `loading="lazy"` on the two rows that are in the first
   viewport, give the first one `fetchPriority="high"` only if it is the
   LCP, and either crop the source to the 3.5:1 box or let the box follow
   the 16:10 source — decide from the design, say which in the report.
6. **B6 · S9** — /about LCP image: `preload`/`fetchPriority="high"` on the
   first figure, `sizes` set; `FigureView.tsx:158,182`: cache the rect on
   resize/scroll instead of two `getBoundingClientRect` per frame.
7. **B7 · S11** — `Row.tsx:82-129`: no close tweens on mount (set the
   collapsed state directly), no `lenis.resize()` per row. `Field.tsx:68`:
   re-read the DPR on `resize`/`devicePixelRatio` change (matchMedia
   `(resolution)` trick) and update the renderer.
8. **B8 · S1** — a cheaper ambient field where it cannot be enjoyed: do not
   mount the three chunk when `navigator.connection?.saveData`,
   `deviceMemory <= 2`, or `hardwareConcurrency <= 2` (static plates stay,
   as for reduced motion), in `FieldMount`/`Field`. Document the gate in
   the report; C will add it to DECISIONS.
9. **B9 · I19, B26** — one wheel/touch normaliser in `src/lib/` used by
   `HomeSequence` and `AboutSequence`; one touch/hover predicate used by
   `WorkRows.tsx:38` (and offered to A for `Cursor.tsx:18`); restore
   `history.scrollRestoration` to the previous value (`HomeSequence.tsx:209,227`,
   `AboutSequence.tsx:103,333`); the 860 px resize re-lock
   (`HomeSequence.tsx:234-268,339-346`) must not scroll a page the user
   already scrolled.
10. **B10 · I23, I21, I11** — dead code: `WORK` export (`work.ts:102`),
    `mediaGradient` + plate branch (`Row.tsx:185-191`), `#contatti`
    alias (`AboutSequence.tsx:63`); `Row.tsx:225-236` button with `<div>`
    children → `<div role="button">` or phrasing content, and a shorter
    accessible name (title + cue); `about/page.tsx:229-235` pager buttons
    get a localised `aria-label` (C will add the dictionary key if you ask —
    or use `about.pagerAria` + index). `src/lib/use-reduced-motion.ts:8`
    comment: drop the memory-note reference.

## Test in two minutes (put it in the report)

`/`: lose the context from the console → name stays visible; restore → melt
resumes. `/about`: keyboard only, arrows then Tab, focus never jumps back.
`/websites`: open a row, resize the window, no gap. Rendering → reduced
motion: no lock flash. Phone viewport: /websites images sharp (natural
width ≥ 2× box).

Report: `reference/briefs/round3/reports/B.md`.
