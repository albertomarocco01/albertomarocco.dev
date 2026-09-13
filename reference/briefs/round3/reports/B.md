# Round 3 — package B (site pages and canvas) — report

Session note: the first B session (`alberto-marocco-f7`) committed B1/B6, B3/B16
and the footer vat guard, then the machine crashed mid-fix at ~18:54 with the
B2/S10 work uncommitted. This session verified that WIP, committed it, and
carried the rest of the brief through. No director, no sibling messaging:
cross-owner requests are in the structured hand-off (A: CSS + Cursor predicate;
C: dictionary key + DECISIONS entries).

## What changed (commit → items)

| commit | items | what |
|---|---|---|
| `fdc854c` (prev. session) | B1 · B6 | `webglcontextlost/restored` on the site canvas; the h1, the /about `<img>`s and the gen plates take the pixels back on loss, re-arm on restore. |
| `5171704` (prev. session) | B3 · B16 | Row reveal tweens to the measured px then hands `height` back to `auto`, so a resize with a row open leaves no gap. |
| `6bb9c6f` (prev. session) | C1 side | Footer skips the vat slot when the dictionary value is empty. |
| `39124f1` | B2 · S10 | `fieldState.staticOnly` published from `Field.onCreated`; NameMeltView never opens the melt (nor its 20 fps floor) while it is set. Forced guard: **0 draw calls/s at rest on `/`**, the field's one static frame painted; hardware path unchanged (~40 draws/s, melt live). |
| `121f479` | B4 · B17 | /about: every gesture-driven move (keys, wheel, swipe) also focuses the arriving panel root (`tabIndex=-1`, `outline: none` inline — never a visible control), so the next Tab continues inside it. Focus-driven moves unchanged. |
| `77e9a15` | B4 · I18 | Home: keys whose target is a link/button/form control are the control's — no scrub. |
| `7b1153f` | B9 · B26 | `history.scrollRestoration` handed back to its previous value (both drivers). A mode flip across 860 px on a composed home hands the viewport over with no re-lock, no `scrollTo(0,0)`, no slide to the footer. |
| `7738b9f` | B9 · I19 | `src/lib/scroll-intent.ts`: `wheelDeltaPx`, `singleTouchY`, `isControl`, `isTouchOnly` (`(hover: none)`) shared by HomeSequence, AboutSequence, WorkRows. AboutSequence drops its own `prefers-reduced-motion` re-read (A5 landed). Cursor.tsx offered the predicate (request to A). |
| `f1d6b18` | B5 · S8 | /websites previews: `sizes="(max-width: 1280px) 90vw, 1152px"` (the real content column), `loading="eager"` (both rows in the first viewport), no `fetchPriority` (the LCP is the lede). Source stays 16:10 under `object-fit: cover` — see "decisions" below. |
| `d38411a` | B3 (shared rule) | /about, /websites, /xperiments use `pageMetadata` → own og:title/og:url/og:description/twitter. The home keeps the layout's card (it *is* the layout's page and was already right). |
| `81ca57e` | B6 · S9 | /about LCP `<img>`: `loading="eager"` + `fetchPriority="high"` (also on its preload link). FigureView caches the tracker and clip rects: re-read while a hold says the page moves, marked stale by resize / any scroll (capture; also holds tracking 150 ms so the GPU copy follows a panel scrolling inside itself) / any `transitionend`. Layout reads per idle frame: ~6 → drei's own 3. |
| `4b0e800` | B7 · S11 | Field DPR follows the display: `(resolution: Xdppx)` change + `resize` fallback, `state.setDpr([1, 1.5])` only when the ratio really moved. Buffer 1440×900 → 2160×1350 at dpr 2 and back. |
| `a1cf372` | B7 · S11 | Row: the close branch runs only for a row that was open — no N×2 mount tweens, no `lenis.resize()` per row on a fresh page. |
| `b5f9389` | B8 · S1 | `src/components/canvas/field-gate.ts` — `useFieldAllowed()` = `fieldReady && !reducedMotion && !lowEndDevice()`; `lowEndDevice()` = `connection.saveData`, or `deviceMemory ≤ 2`, or `hardwareConcurrency ≤ 2`. Used by FieldMount, NameMelt, AboutFigure, WorkRows. Forced `deviceMemory = 1`: no canvas, no melt, 0 draws, no three chunk on `/`, `/xperiments`, `/about`. |
| `6f51e27` | B10 · I23 · I21 · I11 | Gen row → `div[role=button]` (tabIndex 0, Enter/Space click) named by title + cue via `aria-labelledby`; `WORK` export, `mediaGradient` + plate branch, `#contatti` alias removed; /about pager buttons get `aria-label` "section 01" / "sezione 01" (page-local fallback until C adds `about.pagerItem`, which is read if present). |

Verified after every commit: `npx tsc --noEmit` clean, `npx eslint` zero on the
B folders; real browser (headless Chrome, real GPU), desktop 1440×900 and
iPhone 14 (390×844 dpr 3), console clean (console.error/warn + error +
unhandledrejection captured from document start on every page).

## Left, and why

- **Home `page.tsx` + `pageMetadata`.** Not applied. The home has no
  `generateMetadata`: the layout's card *is* the home's (og:title, og:url,
  og:image, twitter all verified correct with curl). `pageMetadata` would
  produce "Alberto Marocco.dev — Creative Technologist — Alberto Marocco.dev"
  (the three-segment title the I7 rule forbids) with no benefit.
- **`sizes` on the /about figure.** Not added: the `<img>` is `unoptimized`
  (one URL, no srcset — the GPU texture needs that exact file), so `sizes`
  has nothing to choose from; Next skips its fill/sizes warning for
  unoptimized images.
- **`src/lib/use-reduced-motion.ts:8` comment.** Already fixed by A in
  `155efa4` (no memory-note reference remains).
- **Touch tap on gen rows on the phone viewport.** Verified by reading only:
  `set device "iPhone 14"` has no `(hover: none)` media, so the tap-toggle
  path cannot be driven headless; its predicate is unchanged in substance
  (`(hover: none)`, now from `scroll-intent.ts`).
- **DPR change under emulation.** CDP's `setDeviceMetricsOverride` flips
  `devicePixelRatio` without dispatching the `resolution` MQ change or
  `resize`; the fix was verified through the `resize` path (dispatched by
  hand) and by `matches` flipping. On a real monitor move / zoom both signals
  fire natively.

## Decisions taken (for C → DECISIONS.md)

- **Ambient field gate (S1).** The field and everything that rides it (name
  melt, /about cut-outs, gen-row auras) mount only when `useFieldAllowed()`
  holds: past first paint + idle (`fieldReady`), not under reduced motion,
  and not on a device where it cannot be enjoyed — `navigator.connection.
  saveData`, `deviceMemory ≤ 2` (Chromium-only, powers of two; Safari/Firefox
  never report it and are not gated on it), `hardwareConcurrency ≤ 2`. Where
  skipped the designed statics stay (DOM h1, `<img>`, amber plate). One
  gate, shared, so no consumer can mount a `<View>` onto a canvas that was
  never allowed to exist. Thresholds: `LOW_END` in `field-gate.ts`.
- **/websites preview box.** The 16:10 source stays under `object-fit: cover`
  rather than being cropped to the desktop 3.5:1 box: the same box is ~1.2:1
  on a phone (`--reveal-h` clamp vs 92 vw), so one crop cannot serve both. The
  2400×1500 capture gives every tier a 2× variant; `sizes` follows the real
  content column.
- **/about keyboard model.** A gesture (key, wheel, swipe) that turns the page
  also moves focus onto the arriving panel root; focus-driven moves (Tab, the
  pager, the CTA) never steal focus. Panel roots are `tabIndex=-1` with
  `outline: none` (never a visible control).
- **Home mode flip.** A run after an 860 px mode flip with the page composed
  hands the viewport over in flow mode without re-lock, scroll or slide; into
  desktop mode the re-lock stands (one fixed viewport).
- **Metadata.** The home keeps the layout's card by design; every other (site)
  page goes through `pageMetadata`.

## New tunables

| name | file | value | what |
|---|---|---|---|
| `LOW_END.deviceMemoryGb` / `LOW_END.cores` | `src/components/canvas/field-gate.ts` | 2 / 2 | field gate thresholds |
| `DPR_RANGE` | `src/components/canvas/Field.tsx` | `[1, 1.5]` | the canvas DPR range, re-applied on ratio change |
| `MOVE_HOLD_MS` | `src/components/canvas/FigureView.tsx` | 150 | how long a scroll/resize keeps the figures at full rate |
| `LINE_PX`, `TOUCH_MQ` | `src/lib/scroll-intent.ts` | 40, `(hover: none)` | wheel line → px; the touch-only predicate |
| `PAGER_ITEM` | `src/app/(site)/about/page.tsx` | en "section" / it "sezione" | fallback until `about.pagerItem` exists |

## Requests to other owners (also in the structured hand-off)

- **A** — `src/components/chrome/Cursor.tsx:18`: replace
  `window.matchMedia("(hover: none)").matches` with `isTouchOnly()` from
  `@/lib/scroll-intent` (one predicate for the site).
- **C** — `src/lib/dictionary.ts`: add `about.pagerItem: string` to the
  interface, `"section"` (en) / `"sezione"` (it); `about/page.tsx` already
  reads it when present and the local fallback then retires.
- **C** — DECISIONS.md: the five entries above.

## Test in two minutes

1. `/` — DevTools console: `document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` → the name stays visible (DOM h1), `.name.is-melting` gone; `.restoreContext()` → the melt resumes. Rendering → emulate `prefers-reduced-motion` → reload: no lock, the page scrolls, `html` never gets `home-live`.
2. `/about` — keyboard only: ArrowDown, Tab, Tab: focus walks the contact links, the track never jumps back. Then `/about#contact` lands on the third panel.
3. `/websites` — open a row, resize the window: no gap. Network panel: both previews `eager`, desktop variant `w=1200`, phone (iPhone 14) `w=1080`.
4. `/xperiments` — Tab from the topbar: the first gen row opens with the amber ring, aura live; Tab again moves to the second.
5. Low-end: in DevTools console before load, `Object.defineProperty(Navigator.prototype,'deviceMemory',{get:()=>1})` (or a Network throttling profile with Save-Data): no `<canvas>`, no three chunk in the Network panel, the amber plates and the DOM name stay.
6. Zoom the browser to 200% with the field on screen: `document.querySelector('.field-canvas canvas').width` doubles (capped at 1.5× CSS px).
