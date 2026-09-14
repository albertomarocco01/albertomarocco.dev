# Round 3 — package A report (chrome and motion core)

Session: the round-3 A session crashed with the machine at ~18:54 on
2026-09-13 mid-fix; this run verified its uncommitted work, split it into
per-item commits and finished the brief. Baseline `8896be7`; A1 (`13f5db2`)
was already committed by the director.

Every commit below passed `npx tsc --noEmit` (whole project) and
`npx eslint` on `src/components/chrome`, `src/components/providers`,
`src/lib/use-reduced-motion.ts`, `src/lib/use-tab-visible.ts`,
`src/components/vortex` with zero findings, and was verified in headless
Chrome (agent-browser session `A-r3`) at 1440×900 and the iPhone 14 viewport
against the dev server, console captured from document start.

## What changed (commit → items)

| commit | item | what |
|---|---|---|
| `b1732c1` | A2 · B10 | One navigation sweep at a time. The sweep is a plain `useLayoutEffect` whose cleanup kills the in-flight timeline; the next sweep takes the veil from where it was and carries the interrupted fill's progress (`navProg`). Verified: a committed sweep interrupted at 025 % by `history.back()` continued from 070 to 100, one rise, one fall, no re-rise, no `loading` class. |
| `972f236` | A3 · B11 | The veil stops Lenis too: `prevent: whileVeiled` (any node while `html.loading`) on `ReactLenis`. Not `data-lenis-prevent` on `<body>` (HomeSequence owns that attribute) and not `lenis.stop()` (kills pinch-zoom). Verified: 44 wheel events during a fresh `/graphic-designs` veil left `scrollY` at 0; 5 wheel events after it scrolled 600 px. |
| `4bd24d3` | A11 · B25 | Cursor ignores `pointerType === "touch"`, hides both marks on `pointerout` with no `relatedTarget` (`.is-out`), dead `.g-enter` selector removed. Verified with synthetic PointerEvents. |
| `be04359` | A6 · B18 | `scrollbar-gutter: auto` on `html.home-live:not(.home-scroll)` and `html.about-live`, like `.immersive`. Verified: home and /about fixed layers (`.field-canvas`, `.topbar`) now 1440 px wide on a 1440 window (were 1425); scrolling pages keep the gutter. The 15 px reflow happens under the opaque veil in the same effect flush. |
| `3ec3d27` | A12 · I23 | Dead `.wrap.in` rule and Shell's `in` toggle on `.wrap` removed. |
| `155efa4` | A5 · B13 | `reducedMotion` from the synchronous `useSyncExternalStore` snapshot (`src/lib/use-reduced-motion.ts`; `getServerSnapshot` returns the real media query on the client), `entered` latched during render, topbar `in` only on the motion path, `.teaser` hide-states inside `prefers-reduced-motion: no-preference`. Plus one fix over the predecessor's WIP: `Loader` no longer `return null`s under the flag — that left an orphan server-rendered veil that React never claimed (no warning: React 19 skips unmatched server nodes silently; found via the missing `__reactFiber$` key). Verified with `set media … reduced-motion` on `/`, `/about`, `/websites`: no `loading`, no `home-live`/`about-live`, no `data-lenis-prevent`, topbar at 1, teasers at 1, `.loader` React-owned, zero console output; motion mode on `/` unchanged (fill 000→100, veil parked, `topbar in`). |
| `273b40c` | A8 · I15 | `--ring: #b07846` + one `:is(…):focus-visible { outline: 2px solid var(--ring); outline-offset: 3px }` for topbar links, en/it, teasers, rows, `.gd-back`, demo cards, about CTAs and pager, contact links, footer links, tuner buttons; the eleven per-element `outline: none` declarations that outranked it in the cascade are gone. Verified by tabbing on `/`, `/about`, `/websites`, `/graphic-designs`: every target computes `solid 2px rgb(176,120,70)` offset 3 px. |
| `db86fbe` | A4 · B12 | Topbar entrance once per page load: `Loader` exports `hasVeilPlayed()`; Shell reads it once at mount (`useState(hasVeilPlayed)`) and skips the 1.15 s hide + 1.2 s fade + `html.entering` on a remount. Verified: after a demo exit the topbar is at opacity 1 from the first sample and `entering` never fires; a fresh load (same-origin iframe) still plays the full opening. |
| `41fbc09` | A7 · B19 | The veil lifts onto the page, not `(site)/loading.tsx`. `holdForPage()` pauses a timeline until `#main` holds the page (no `[aria-busy="true"]`, ≥ 1 child) via a MutationObserver, bounded by `VEIL_HOLD_MS`; first load parks the fill at 82 %, the nav sweep and the fast dissolve park at the full bar; the 2 s safety dismissal stands aside during a hold and is re-armed `SAFETY_AFTER_HOLD_MS` after it resumes. Verified with a planted `aria-busy` fallback: sweep held at 100 % for its whole life and faded within 50 ms of its removal; first load parked at 082, completed as it went, released the lock, faded smoothly; control run unchanged. |
| `9021b23` | A9 · S13 | Vortex CSS (160 lines) moved to `src/components/vortex/vortex.css`, imported from `VortexExperience.jsx`. Rules and names unchanged. Verified: the demo loads its own CSS chunk (12 `.vortex-*` rules; exit link fixed/mono/11.2 px); site pages carry zero `.vortex-*` rules. |
| `2735afc` | A10 · I13, I14 | Phones (≤ 560 px): topbar 0.7rem (11.2 px; 0.6875rem ≤ 380 px) with tracking/gaps pulled in; the mono register floor 0.7rem for `.loader-meta .teaser-idx .teaser-cue .sect-label .c-cue .preview-cta .about-eyebrow .about-meta .about-list dt .about-cue .about-pager button .contact-key .a-label .gd-demo-meta .gd-demo-cta`. Hit boxes ≥ 40 px tall via absolutely positioned pseudo-elements on every pointer: topbar wordmark/nav/en-it, footer links, about CTAs, pager (`::after`; `::before` is its tick), contact links, `.gd-back`. Verified at 390: wordmark 40, en/it 40, nav 42, footer 41, CTAs 40/41, pager 41, contacts 46, no overlapping footer boxes; EN nav on one row at 390/375/360, wraps at 320; desktop 44/44/46/41. |
| `7d190a6` | 13 (safe area) | `env(safe-area-inset-bottom)` added to the footer's bottom padding, the about "scroll" cue, the phone pager and the contact panel's bottom padding (the home flow footer already had it). Computed values unchanged where the inset is 0. |
| (this file) | report | `reference/briefs/round3/reports/A.md`. |

Verified but unchanged: A1 (`13f5db2`) holds after enter/exit ×3 and Esc exit
of Tarassaco — no `loading`, `html` overflow visible, body `hidden auto`,
scroll by touch (`scrollBy`), keyboard (PageDown → 1038 px) and wheel on the
phone viewport after a demo.

## Requests applied (owner pass, 2026-09-14)

The cross-owner requests the other packages could not apply themselves,
taken once all six had finished. Each verified in headless Chrome (session
`A-req-r3`, 1440×900 and the iPhone 14 viewport) against the dev server,
console clean; tsc and eslint (zero findings) before the commits.

| commit | request | what |
|---|---|---|
| `f08c1dd` | C → `LocaleToggle.tsx` (I12 · C10) | `persistLocale()` from `@/lib/locale` (`9419695`) replaces the toggle's own cookie line: `Secure` when served over https, plain on http so localhost keeps working. Verified: en → `document.cookie` `locale=en`, `html.lang` en; back → `locale=it`. |
| `a9d03fc` | B → `Cursor.tsx` (I19) | `isTouchOnly()` from `lib/scroll-intent` (`7738b9f`) replaces the local `(hover: none)` matchMedia — same query, one place. Verified: a synthetic mouse `pointermove` moves the dot, a touch one is ignored. |
| `0275152` | (own) | The one eslint warning on the chrome folder, left by `41fbc09`: `onHold` (a `useCallback([])`, stable) listed in the sweep effect's deps. Behaviour-neutral; the zero-findings bar. |
| `9c0dc93` | C → `globals.css` (B2 · C4, I14) | `.notfound { cursor: auto; min-height: 100dvh }` and `.notfound .gd-back { cursor: pointer }` as sent. **Changed against the request:** its `padding: 0.9rem 0; margin: -0.9rem 0` is not applied — `.gd-back::before` (`2735afc`) already gives the hit box, and 0.9rem would have landed at 42.8 px; instead `.notfound .gd-back::before { inset: -0.95rem -0.3rem }` takes it from 39.6 to 44.4 px, the 44 the request asked for. **Added:** `.notfound nav { display: flex; flex-wrap: wrap; gap: 2rem 2.4rem }` — at 390 px the IT copy wraps onto two rows 30 px apart, where two 44 px boxes overlapped by 9.6 px; 2rem leaves them 1.6 px clear (the footer's own trade in `2735afc`). Verified with the inline styles stripped in-page: body `none`, `.notfound` `auto`, links/wordmark/footer `pointer`, boxes 44.4 px at 390 (IT two rows, EN one) and at 1440; rules served by the sheet. |
| `8d80d80` | D → `vortex.css` (I14) | `.vortex-exit::before, .vortex-back::before` 44 px under `(pointer: coarse)`, the hands/darkroom/wall idiom (`bd21e27`, `191a4cc`, `2ec2417`), replacing E's `padding: 0.85rem 1rem` (`cdabc8c`), which reached ~42.6 px and changed the pill on touch. `.vortex-back` included: the pair shares the block and would otherwise differ on a phone. Verified: pill 32 px unchanged, the pseudo box 44 px centred on it, no padding rule left in the CSSOM. |

Follow-ups for the other owners (not A's files):

- **C, `src/app/not-found.tsx`:** remove `style={{ cursor: "auto", minHeight: "100dvh" }}` on `.notfound`, `style={{ cursor: "pointer" }}` on both `.gd-back` links, and `style={{ display: "flex", flexWrap: "wrap", gap: "1rem 2.4rem" }}` on the `nav` — the sheet carries all three now, and the inline 1rem row gap would put the overlap back.
- **E, `tarassaco.css:259-263`:** `.tara-exit` is the one exit still growing its padding on coarse pointers; the `::before` idiom above (now in four of five demos) would make the fifth match.

## New tunables

- `src/components/chrome/Loader.tsx` — `VEIL_HOLD_MS` (2400): how long a fill
  may wait for the page before the veil lifts anyway, counted from the moment
  it parks. `SAFETY_AFTER_HOLD_MS` (1500): how far the safety dismissal is
  pushed back once a held fill resumes.
- `src/app/globals.css` — `--ring` (`#b07846`, the accent opaque): the
  keyboard focus ring colour.

## Deliberate exceptions and limits

- `.wrap:focus { outline: none }` stays: `#main` is the programmatic skip-link
  target, not a control. The skip link keeps its own boxed style.
- `.vortex-exit` / `.vortex-back` (now in `vortex.css`) keep their
  `outline: none` + border-colour lift: it is the idiom the three demo
  stylesheets copy (`.darkroom-exit`, `.hands-exit`, `.wall-exit`), and the
  demos style their own controls. Suggested to E as an optional follow-up.
- The dev-only bubble tuner (`.bubble-ctl`, never in production) keeps the
  browser's default focus style on its range inputs and head button.
- Tap targets: the one layout change is a wider row gap (1.6rem) for wrapped
  footer links and about CTAs on phones, so adjacent 40 px boxes do not
  overlap. On the two-row phone bar the en/it boxes are 24 px wide (they split
  their 0.5rem gap); the brief asked for height.
- The topbar nav wraps to a second row below ~330 px (EN copy); at 360–390 it
  is one row.
- A6: in flow mode on a narrow *desktop* window with classic scrollbars
  (`home-scroll`), the gutter returns when the lock releases — a 15 px reflow
  at that moment, in exchange for no black band while locked.
- A5 rule to keep: no server-rendered markup may branch on `reducedMotion`
  (the veil always renders; WebGL mounts wait for `fieldReady`). Lenis 1.3.26
  also has `respectReducedMotion: true` of its own.
- Safe-area values could only be verified with `env()` = 0 (headless); the
  rules are in the diff of `7d190a6`.
- Test artefact, not a bug: synthetic `TouchEvent`s without `targetTouches`
  throw inside Lenis (`event.targetTouches[0]`); real touches carry them.

## Test in two minutes

1. Fresh load `/` (desktop): veil fills once, lifts, topbar fades in once
   (`html.entering` ~2.35 s). Wheel during the veil on a fresh `/websites`:
   the page reveals at the top.
2. Topbar → graphic designs → a card → "← esci dalla demo" (or Esc): the
   topbar does not blink and does not re-fade, the field does not bloom
   again, the page scrolls with wheel, keyboard and touch. Repeat ×3.
3. Two quick nav clicks (or a click then browser back): one veil sweep, no
   flicker, the bar continues from where it was.
4. Tab through topbar, teasers, footer, /about CTAs and pager, /websites
   rows: a 2 px amber ring, 3 px off the element. Mouse clicks show nothing.
5. DevTools → Rendering → emulate `prefers-reduced-motion`: reload `/`,
   `/about`, `/websites` — no veil, no lock, teasers visible, topbar visible,
   console clean.
6. Windows, classic scrollbars: `/` and `/about` show no black strip on the
   right; `document.documentElement.clientWidth === innerWidth` there.
7. iPhone 14 viewport: topbar text 11.2 px on two rows; every topbar/footer
   link, en/it, about CTA and pager button has a ≥ 40 px tall hit box
   (inspect the `::before`/`::after`); `/graphic-designs/vortex` still styled.
8. Throttle the network (Slow 3G), click a nav link: the veil holds at the
   full bar until the page is in, up to 2.4 s, then lifts onto content.
9. Requests: open a made-up URL — the pointer is visible, the two mono links
   show the hand, and at 390 px in IT their two rows sit 32 px apart (inspect
   `.gd-back::before`: 44 px each, not overlapping). Open the vortex with
   touch emulation: the exit pill keeps its shape, its `::before` is 44 px
   tall. Toggle en/it on `/`: `document.cookie` flips (with `Secure` on the
   deployed https origin only).
