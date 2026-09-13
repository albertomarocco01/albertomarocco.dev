# A — Chrome and motion core

**Session `alberto-marocco-2b` · Opus 5 · effort high.** Read
`00-shared.md`, then `audit-2026-09-13.md`, then this file.

## Owns

- `src/components/chrome/**` (Loader, Shell, Cursor, Glow, Grain, LocaleToggle, InstagramGlyph)
- `src/components/providers/**`
- `src/lib/use-reduced-motion.ts`, `src/lib/use-tab-visible.ts`
- `src/app/globals.css` — **exclusive**: every other package sends you CSS
  requests; apply them promptly in their own small commits (`style(<their
  scope>): …`), they are blocked on you.
- `src/components/vortex/vortex.css` (new, see A9) and the one import line
  that loads it.

Not yours: `src/app/layout.tsx` (C), `src/app/(site)/**` (B/C), the demo
folders. `HomeSequence`/`AboutSequence` are B's: if your reducedMotion change
needs a call-site change there, send B the diff.

## Audit-verify first

Reproduce A1 in the real browser before touching anything: open
`/graphic-designs`, click a demo card, click "esci", then read
`document.documentElement.className` and `getComputedStyle(document.body).overflow`
— expect `loading` still present and `hidden`. Then reproduce A2 (double
timeline) with two quick nav clicks. Report to the director.

## Fix, in this order (each its own commit)

1. **A1 · B1** — `loading` class leak on layout remount.
   `src/components/chrome/Loader.tsx`: the `veilPlayed` fast path calls
   `reveal()` in the layout effect (`:110-118`) before the scroll-lock
   `useEffect` (`:208-224`) adds the class back, and the safety timer sees
   `doneRef` true and never removes it. Make the lock effect own the class
   lifecycle: add the class only when a veil is actually going to play, and
   have `reveal()` and the fast path release it whatever the order. Verify
   with the exact sequence above and with Esc-exit, then wheel, keyboard
   (PageDown), and a synthetic touch scroll on the iPhone viewport — on all
   four site pages after a demo.
2. **A2 · B10** — one veil timeline at a time. `Loader.tsx:166-203`: either
   `revertOnUpdate: true` or kill the previous timeline explicitly before
   building the next; make sure `park()` and the `loading` class stay
   consistent when a navigation interrupts the sweep.
3. **A3 · B11** — the veil must actually stop scroll. Lenis keeps scrolling
   under `overflow:hidden`. Add `data-lenis-prevent` on `<body>` (not
   `<html>`, Lenis slices html out — see `HomeSequence` for the idiom) while
   the veil is up, or call `lenis.stop()/start()` through the provider. No
   pre-scrolled reveals on /websites, /xperiments, /graphic-designs when
   the wheel moves during the sweep.
4. **A4 · B12** — topbar entrance guarded like the veil. `Shell.tsx:85-90`:
   reuse `veilPlayed` (export it from Loader or move it to the provider) so
   the 1.15 s hide + fade runs once per page load, not on every remount from
   an immersive route.
5. **A5 · B13** — `reducedMotion` known before first paint.
   `AppProvider.tsx:55-70` starts `false`; switch the provider to the
   synchronous snapshot in `src/lib/use-reduced-motion.ts` (server false,
   client the real MQ, `useSyncExternalStore`) so Loader, Lenis, Cursor and
   the sequences never do a "motion" pass first. Tell B what changes for
   `HomeSequence`/`AboutSequence` (they can drop their own MQ re-read).
   Also `globals.css:832-841`: `.teaser{opacity:0}` inside
   `prefers-reduced-motion: no-preference`.
6. **A6 · B18** — `scrollbar-gutter: stable` under `overflow:hidden`
   (`globals.css:39`): apply the same treatment `.immersive` gets (:41-48)
   to the home/about locked states, or scope the gutter to pages that
   scroll. Verify on Windows Chrome with classic scrollbars (the audit
   browser showed a 15 px strip: `document.scrollingElement.scrollWidth`
   1425 vs `innerWidth` 1440 on the home).
7. **A7 · B19** — the veil and streaming. Tie the release to the real page
   being in the DOM (e.g. resolve when `main` has content / a
   `data-ready` set by the (site) layout body, with the existing safety
   timer as ceiling), or at least never lift onto the 60vh blank of
   `(site)/loading.tsx`. Keep the 0.82 s minimum beat.
8. **A8 · I15** — focus visible. Replace `outline:none` + colour-only on
   `:focus-visible` (`globals.css:387-391,436-440,1570-1574,1715-1719,1992-1997,2048-2052`)
   with a real ring in the amber accent (2 px, offset 3 px, `border-radius`
   as the element) — same idiom everywhere. Mouse focus stays invisible.
9. **A9 · S13** — move the Vortex CSS (`globals.css:2361-2519`) into
   `src/components/vortex/vortex.css`, imported from
   `src/components/vortex/VortexExperience.jsx` (one import line — tell E you
   did it; E owns the folder but must not move it back). Keep the shared
   `.vortex-immersive`/`.vortex-exit` names as they are; the three demo css
   files copy them.
10. **A10 · I13, I14** — legibility and tap targets in the chrome (CSS only,
    keep the design): topbar text never under 11 px (raise the 0.6/0.55rem
    breakpoints, `:447-455,469-473`); locale toggle, nav links, footer links,
    `.about-cta`, `.about-pager button`: hit area ≥ 40 px tall via padding /
    `::before` inset, without moving the visible text. Mono register
    (eyebrow, teaser-idx/cue, contact-key, footer) minimum 11 px on phones.
11. **A11 · B25** — Cursor: ignore `pointerType === "touch"` events, hide the
    dot/ring on `pointerleave` of the document, remove the dead `.g-enter`.
12. **A12 · I23** — dead `.wrap.in` rule (`globals.css:318-320`) and the
    `in` toggle in `Shell.tsx:187`: delete both, or give the rule a base.
13. **Safe area** — after C lands `viewportFit: "cover"` (they will message
    you), check the footer and `.about-pager` bottom paddings actually use
    `env(safe-area-inset-bottom)` on the iPhone viewport.

## Requests you will receive

B, C, D, E, F may send `globals.css` rules (e.g. B for row/about tweaks, C for
the 404 page and `graphic-designs` card `sizes`-related layout). Apply as
sent unless it breaks the bar; reply "done <hash>".

## Test in two minutes (put it in the report)

Fresh load `/` → veil plays once → topbar enters once. Click "graphic designs"
→ card → "esci" → topbar does not blink, page scrolls with wheel, keyboard and
touch. Tab through topbar/footer: visible amber ring. Reduced-motion emulation:
no veil, no lock churn, teasers visible. Windows: no black strip on the right
of the home.

Report: `reference/briefs/round3/reports/A.md`.
