# D — Mani (hands), then Camera Oscura (darkroom)

**Session `alberto-marocco-7e` · Opus 5 · effort high.** Read
`00-shared.md`, then `audit-2026-09-13.md`, then this file, then
`round2/03-hands.md`, `round2/02-darkroom.md` and the two reports'
"Round 2" sections.

## Owns

- `src/app/(immersive)/graphic-designs/hands/**`
- `src/app/(immersive)/graphic-designs/darkroom/**`
- `reference/briefs/reports/hands.md`, `reference/briefs/reports/darkroom.md`

Shared css (`globals.css`) → A. Dictionary card copy → C. The MediaPipe path
constant in `hands/hooks/useHandTracker.ts` will change: C is moving the wasm
to `public/mediapipe/1.0.1/` and will message you the base path — apply it
first thing when it arrives (its own commit).

Do **hands** first (more items, a 🔴), then **darkroom**. When both are
committed, message the director: if `F-wall.md` is still unassigned you get
it.

## Mani — audit-verify, then fix (each its own commit)

Verify in the real browser (pointer path; camera path if a webcam is
attached): hold Esc with a print open (B7); a print with alpha, e.g.
img_001 (B15); landscape iPhone viewport 844×390 with a print open (B22).
Report to the director.

1. **D1 · B7, I18** — key guards. `useKeyboardHands.ts:46-52` and
   `App.tsx:158-160`: ignore `e.repeat`, `altKey/ctrlKey/metaKey`; Esc
   closes the open print on one press and exits only on a *second distinct*
   press (the aria already promises it). Same guard for every other key
   handler in the folder.
2. **D2 · B15** — texture alpha. `engine/cardMaterial.ts:75-89`: sample
   the texture alpha and multiply it into the fragment alpha (the darkroom
   does `print.a`); check the six alpha prints look right and the cut/tear
   masks still work.
3. **D3 · S5** — MediaPipe warm-up. `hooks/useHandTracker.ts:126-164`:
   start `FilesetResolver.forVisionTasks` (wasm) and the model fetch when
   the gate mounts (no permission needed), and only `getUserMedia` on the
   click; the 8 s timeout should cover the camera only, with the download
   progress surfaced in the gate ("scarico il modello… 40 %") if it is
   still running. Cold-cache test with DevTools "Slow 4G".
4. **D4 · I14, I13, I15** — touch and legibility in `hands.css`: exit link,
   "oppure usa il puntatore", "riprova la fotocamera" hit areas ≥ 40 px
   tall (padding, not font); `hands-privacy`, `hands-legend-seg`,
   `hands-title-sub` ≥ 11 px on phones; `.hands-stage` gets a visible
   `:focus-visible` ring (amber, 2 px) instead of `outline:none`; a
   `(pointer: coarse)` block like the wall's.
5. **D5 · B22** — caption on landscape phones: `App.tsx:190` + `hands.css:99-115`:
   clamp the caption top so two lines always fit; on `max-height: 420px`
   put the caption on one line or over the print's bottom edge.
6. **D6 · I16** — `touch-action: none` only on the canvas element / while a
   gesture is active, not on the whole stage; pinch-zoom of the page must
   work (WCAG 1.4.4).
7. **D7 · I17** — `role="alert"` on the no-WebGL and context-lost messages;
   keep `role=application`.
8. **D8 · B24** — cleanups: remove the `webglcontextlost/restored`
   listeners on unmount (`HandsScene.tsx:56-57`); un-patch the console on
   unmount even if the wasm never settled (`useHandTracker.ts:190-206`);
   `world.ts:206-219` `loader.load` error callback (log once, skip the
   print); per-frame allocations (`useHandTracker.ts:295` reuse the
   `Float32Array`; `HandsScene.tsx:223,242-246`, `world.ts:405-415` reuse
   arrays); "swipe to close" hint once per session (`sessionStorage`) as
   the round-2 brief said (`App.tsx:66,199-201`).
9. **D9 · I7, I5, I10** — `hands/copy.ts`: `metaDescription` ≤ 160 chars EN
   and IT; straight apostrophes only (`:111-113,125` already straight —
   keep); C will tell you the title rule ("Mani — Hands" vs "Mani · Hands").
   Apply C's per-route OG change to `hands/page.tsx` when C sends it.

## Camera Oscura — audit-verify, then fix

Verify: reduced-motion path on a phone viewport (`.darkroom-next` size,
B21); a phone viewport with a real GPU at DPR 1.5 (frame time — read
`performance.now()` deltas from a rAF probe for 3 s, S4). Report.

10. **D10 · S4** — a mobile tier. `darkroom-engine.ts:929-934,1234-1240`:
    on `pointer: coarse` or `innerWidth < 720` or `deviceMemory <= 4`, cut
    Jacobi iterations (20 → 8), pass count and internal resolution (0.75×),
    one `develop()` where two are; keep the look. Expose the knobs in
    `darkroom.config.ts`; name them in the report.
11. **D11 · B21, I13, I14, I16** — `.darkroom-next` ≥ 40 px, exit link hit
    area, `darkroom-hint-keys`/`title-sub` ≥ 11 px on phones, `touch-action`
    scoped as in D6.
12. **D12 · B24, S4** — remove context-loss listeners on unmount
    (`DarkroomCanvas.tsx:32-36`); `ImageBitmapLoader` (with `TextureLoader`
    fallback) for the prints (`:184,597-627`); keep brush strokes made on the
    placeholder when the incoming print arrives (`:631-641,687-695`) or
    block strokes until it is bound — say which.
13. **D13 · I10, I5, I7** — `darkroom/copy.ts`: aria IT without the
    tautology ("Camera Oscura — sviluppo interattivo…"), apostrophes
    straight, title rule from C, `metaDescription` ≤ 160.

## Test in two minutes (put both in the reports' "Round 3")

Hands: gate → pointer → open a print → hold Esc 1 s → still in the demo,
print closed → Esc → index. Alpha print (img_001) shows no grey box.
Landscape phone: caption readable. Darkroom: phone viewport, 3 s rAF probe
≥ 45 fps on the mobile tier; reduced motion: next button tappable.

Reports: append "Round 3" to `reference/briefs/reports/hands.md` and
`reference/briefs/reports/darkroom.md`.
