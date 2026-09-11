# 07 — Release: the whole tree, round 2

**Model: Opus 5 · effort high.** After every other round-2 brief has landed
and been committed. Nothing else runs alongside it.

1. `git log e858585..HEAD` — read every round-2 commit and every report's
   "Round 2" section (`reference/briefs/reports/*.md`).
2. `npx tsc --noEmit`; `npm run lint` — no new findings against `e858585`;
   `npm run build`.
3. Real browser, all five demos from `/graphic-designs`: card → demo → exit →
   index; the round-2 checklists for darkroom, hands and wall; the old
   `/xperiments/<id>` URLs redirect; `/xperiments` still shows the rows;
   Lighthouse on `/graphic-designs` unchanged. Heap and console across three
   enter / exit cycles per demo.
4. Cards and copy: update `gd.demos.{darkroom,hands,wall}` in
   `src/lib/dictionary.ts` (EN + IT) where the piece changed — darkroom: it
   develops by itself; hands: close your hand on a print to open it; wall:
   walk behind it, the tour. Keep the meta lines' shape
   (`3d preview · led wall · 2026`).
5. Covers: re-capture `public/wall/cover.webp` (oblique, no figure, amber)
   and `public/hands/cover.webp` (one print opened with its caption, reticles
   visible); 800 × 1000, < 120 KB, dark. Darkroom's stays unless the dissolve
   gives a better frame.
6. Docs: `README.md` says `/graphic-designs/<id>`; `DECISIONS.md` gets one
   "Round 2" entry per demo with the decisions that were not in the briefs
   (the dissolve, the fist gesture, the endless ground, the tour).
7. Commit `chore(release): round 2 — cards, covers, docs`. Do not push.
