# F — Parete (wall)

**Session: the first of D/E to finish · Opus 5 · effort high.** Read
`00-shared.md`, `audit-2026-09-13.md`, then `round2/04-wall-room.md`,
`05-wall-loops.md`, `06-wall-tour.md` and `reports/wall.md` "Round 2".

## Owns

- `src/app/(immersive)/graphic-designs/wall/**`
- `reference/briefs/reports/wall.md`

Shared css → A. Card copy in the dictionary → C.

## Audit-verify first

iPhone viewport with a real GPU: 3 s rAF probe at rest and during a preset
flight (S3); the "pitch" tour station on a throttled CPU (B23); pinch-zoom
on the stage (I16). Report to the director.

## Fix, in this order (each its own commit)

1. **F1 · S3** — a mobile tier in `wall.config.ts`: on `pointer: coarse` or
   `innerWidth < 720` or `deviceMemory <= 4`: reflector off (or 256², no
   blur), Bloom off or single mip, SMAA → none (DPR 1.5 covers it), one
   `RectAreaLight`, DPR cap 1.25. The look must still read as the same
   room; the wall's own loop stays full quality. Name the knobs in the
   report. Verify: iPhone viewport rAF probe ≥ 45 fps at rest; entry long
   task under 400 ms.
2. **F2 · S3** — `App.tsx:339-395`: `started`/`card`/`tour` must not
   re-render `<Canvas>`/`WallScene` — memoise `WallCanvas` and pass state
   through the existing bus, not props.
3. **F3 · B23** — the pitch pulse waits for the rig's `settle`
   (`WallScene.tsx:123-133`), not a timer; `CameraRig.tsx:266-278`
   StrictMode-safe first-preset guard (dev only, one line).
4. **F4 · I16, I14, I13** — `touch-action` scoped to the canvas (page
   pinch-zoom works); exit link and `wall-key`/`wall-swatch` hit areas
   ≥ 40 px on `pointer: coarse` (the rule exists — extend it);
   `wall-title-sub`, `wall-spec`, `wall-title-keys` ≥ 11 px on phones.
5. **F5 · I6, I4, I7, I5** — `wall/copy.ts`: description says palettes, not
   loops ("cambia palette", "switch palettes") and ≤ 160 chars EN/IT;
   "LED wall" casing consistent in EN (`:73-74,80,93-94`) and "an LED
   wall"; "6 × 3 m" everywhere; apostrophes straight; title rule from C.
   Tell C what the card `gd.demos.wall.desc` should say if it changes.
6. **F6 · B24** — remove context-loss listeners on unmount
   (`WallCanvas.tsx:67-71`).
7. Apply C's per-route OG change to `wall/page.tsx` when C sends it.

## Test in two minutes (report "Round 3")

Phone viewport: room loads under 400 ms of main thread, ≥ 45 fps at rest,
tour stations wait for the camera. Desktop unchanged. Pinch-zoom works,
palette buttons tappable.
