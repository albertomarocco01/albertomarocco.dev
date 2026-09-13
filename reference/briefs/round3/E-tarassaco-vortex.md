# E — Tarassaco, then Image Vortex

**Session `alberto-marocco-0f` · Opus 5 · effort high.** Read
`00-shared.md`, then `audit-2026-09-13.md`, then this file, then
`reference/briefs/00-shared-rules.md` §1.4 (the two demos as they were
described) and `reference/albertomarocco-build-spec.md` §6.

## Owns

- `src/app/(immersive)/graphic-designs/tarassaco/**`
- `src/app/(immersive)/graphic-designs/vortex/**`
- `src/components/vortex/**` (A will create `vortex.css` here and add one
  import line in `VortexExperience.jsx` — leave both where A puts them)
- `reference/briefs/reports/tarassaco.md`, `reference/briefs/reports/vortex.md` (new)
- `package.json` **only** to remove `lucide-react` (E5) — tell C, who owns
  README/DECISIONS lines that mention it.

Shared css (`globals.css`) → A. The MediaPipe path in
`tarassaco/hooks/useWindPhysics.ts:199` will change: C moves the wasm to
`public/mediapipe/1.0.1/` and messages you the base path — apply first thing
(own commit).

Do **tarassaco** first (🔴 items), then **vortex**. When both are committed,
message the director: if `F-wall.md` is still unassigned you get it.

## Tarassaco — audit-verify, then fix (each its own commit)

Verify in the real browser: gate with the camera prompt never answered
(Chrome: block the prompt via `--use-fake-ui-for-media-stream` off, or
DevTools → Sensors is not enough — simplest: deny, then read the error
dialog and press Space on its button, B9); iPhone viewport: does the page
scroll and the flower cover the poem (B9); reduced motion (I20). Report.

1. **E1 · B9** — gate never a dead end: arm the 9 s timeout when the click
   happens, not after `getUserMedia` resolves; on timeout show the same
   error dialog with "continua con la tastiera" (Space to blow) and a
   retry. `useWindPhysics.ts:140-144`: no `preventDefault` on Space when
   `e.target` is a button/link/input. Add `facingMode: "user"` to the video
   constraint (`:253-256`). FaceLandmarker: try GPU, fall back to CPU
   delegate (`:201-219`), mic-only as the last step, and say which mode is
   active in the HUD.
2. **E2 · B9 layout** — `tarassaco/App.tsx:120` + `tarassaco.css:19-29`:
   root `position: fixed; inset: 0; overflow: hidden` like the three new
   demos; on phones scale the dandelion (`DandelionScene.tsx:27-30`) so poem
   and flower share the viewport without overlap; nothing scrolls.
3. **E3 · I17, I20** — stage `role="application"` + `aria-label` from
   `copy.ts` (add `aria`, `noWebgl`, `contextLost` keys, EN + IT, same
   shape as the other four); a no-WebGL message with `role="alert"` (use
   the shared `hasWebGL2()` from `src/lib/webgl-caps.ts`); a
   `prefers-reduced-motion` path of its own: seeds settle without the
   physics loop, poem revealed at once.
4. **E4 · I3, I22** — exit link and gate register: `← esci dalla demo` /
   `← exit the demo`, lowercase mono, top-left, same `.vortex-exit` idiom
   (copy the rule into `tarassaco.css` as the others do); gate button
   lowercase mono ("attiva fotocamera e microfono" / "enable camera and
   microphone"), status "avvio in corso…" / "initializing…"; `var(--mono)`
   and `var(--serif)` instead of `"Inter"`/`ui-monospace`
   (`tarassaco.css:25,112,203,226`); move `GateScene.tsx:38-53` inline styles
   to the css; `import type { Locale } from "@/lib/locale"`.
5. **E5 · I22** — drop `lucide-react`: three inline SVG glyphs in
   `GateScene.tsx` (keep the same size/stroke), remove the dependency from
   `package.json` (commit `package.json` + `package-lock.json` with a
   pathspec; run `npm uninstall lucide-react` — no other dep changes).
6. **E6 · S12** — cheaper wind: keep the SVG but move the per-frame
   transform to the top-level `<g>` groups only (seeds as instanced
   `<use>` or a single transformed group per seed cluster), or render the
   seeds on a small 2D canvas layered under the poem; words animate with a
   CSS transition triggered once, not per frame. Target: a 3 s rAF probe on
   the iPhone viewport ≥ 45 fps while blowing (synthetic mic level).
7. **E7 · I7, B24** — `metaDescription` ≤ 160 EN/IT; clear the 50 ms
   timer in `IntroScene.tsx:32-41`; `getUserMedia` directly in the click
   handler (`App.tsx:122`).

## Image Vortex — audit-verify, then fix

Verify: hold Esc from the gallery (B8); Alt+← ; `100vh` on an iPhone
viewport with the toolbar (B20); heap after enter/exit ×3 (S2). Report.

8. **E8 · B8, I18** — `VortexExperience.jsx:87-110`: ignore `repeat` and
   modifier keys; Esc/Backspace one state per press.
9. **E9 · B20** — `hasWebGL2()` from `src/lib/webgl-caps.ts` instead of the
   local probe (`VortexScene.jsx:32-40`); release probe contexts;
   `.vortex-frame` `100dvh` with `100vh` fallback (send A the rule — the
   file is now `src/components/vortex/vortex.css`, yours after A's move —
   check `git log` before editing); `touch-action: pan-y pinch-zoom` on the
   frame so page gestures do not leak but zoom works.
10. **E10 · S2** — memory and load: `useLoader.clear` (or dispose textures
    and images) on unmount of the experience; load the 54 images
    progressively (first ring visible from the 12 nearest, the rest on
    idle) so the entry long task drops under 200 ms; reuse vectors in
    `GalleryScene.jsx:183-187`; kill hover/highlight tweens on unmount
    (`VortexLayout.jsx:182-191`, `VortexCard.jsx:166-177`).
11. **E11 · I3, I1, I10, I17, I22** — `vortex/copy.ts`: exit "← exit the
    demo" / "← esci dalla demo" (no ✕, no "vortice"); drop the "— Merge"
    suffix from `metaTitle` (C sets the title rule — ask); apostrophes
    straight; `import type { Locale } from "@/lib/locale"`; `role="alert"`
    on the no-WebGL/context-lost messages; fonts `var(--serif)`/`var(--mono)`
    in `VortexScene.jsx:52`, `GalleryScene.jsx:229`; a `loading` fallback
    for the `dynamic()` chunk that is not a black div (reuse the texture
    overlay style).
12. Apply C's per-route OG change to `tarassaco/page.tsx` and
    `vortex/page.tsx` when C sends it.

## Test in two minutes (put it in the reports' "Round 3")

Tarassaco: deny the camera → dialog → Space works → blow with Space; phone
viewport: no scroll, poem readable, flower not over the text; no-WebGL
message; reduced motion still. Vortex: hold Esc → one step; enter/exit ×3
→ heap flat; phone with toolbar → carousel centred.

Reports: append "Round 3" to `reference/briefs/reports/tarassaco.md`
(create if missing, with a short "Round 1/2 recap" line) and create
`reference/briefs/reports/vortex.md`.
