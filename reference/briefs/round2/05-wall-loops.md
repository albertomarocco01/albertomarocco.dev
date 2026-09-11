# 05 — Parete · round 2b: the loops and their colours, visible

**Model: Sonnet 5 · effort high** (fallback: Opus 5 · medium). After 04.
Folder: the wall. Read the round-2 section of `reports/wall.md`, then
`components/loop-source.ts`, `components/wall-material.ts`, `components/Hud.tsx`,
`wall.css`, `copy.ts`, `wall.config.ts`, and — read-only —
`src/components/canvas/aura-material.ts` (`VARIANT_PALETTE`). Open
`/xperiments` in the browser and expand a row.

Alberto, on the colours: he likes them and wants the wall's content to be
"come quelle che c'è negli xperiments — colori diversi che si possono
cambiare, colori che abbiano degli effetti su questo led wall". The four
palettes exist (`← amber →`, bottom-right) but one small arrow pair is
missed. Make the switch visible, and make it an event on the wall.

## 1. A palette row instead of the arrow pair

Bottom-right, replacing `← amber →`: one swatch per variant in
`LOOP.variants` — a small disc in the variant's `hot` colour (from
`VARIANT_PALETTE`, sRGB as-is) with the name under it in mono lowercase; the
current one ringed in `--ink`, the others `--ink-dim`; click / tap selects,
← / → still cycle, `aria-pressed`, 44 px targets on touch, the same
`wall-key` register as the pager. The spec line keeps
`loop: liminal field / amber`. No fifth "white" loop — the orb field needs
the site's blob physics (`Aura.tsx`) and is out of scope; say so in the
report.

## 2. The switch is something the wall does

Today the palette crossfades uniformly over 1.2 s. Wanted: a switch that
reads like real LED content changing — a **wipe across the cabinets**.
Mechanism: at switch start, blit the current loop target into a snapshot
target (one extra 1024 × 512, allocated once); the wall shader mixes
`snapshot → live` along a soft front that travels across `uv.x` over
`LOOP.switchSeconds` (front width ≈ one cabinet, smoothstep) while the live
target keeps tweening its palette as today. The `RectAreaLight`s follow the
live palette as now. Reduced motion / software: instant, as today. Dispose
the snapshot. If the blit costs a visible hitch on the real GPU, keep the
crossfade and say so.

## 3. As vivid as the index

With the "Liminal Field" row open on `/xperiments` and the wall at the front
preset side by side: if the wall is dimmer or duller than the row, raise
`LED.intensity` and move `BLOOM.luminanceThreshold` with it (the report's
§Colour explains the coupling); stop before the smoke's body lifts off black.
Record the values and why.

## Verify (add to the report)

Four switches each way; a switch during a switch; keyboard on the swatches
(Tab, Enter, Space); a phone viewport; reduced motion; no fps regression.

## Commit

`feat(wall): palette row, cabinet wipe on switch`.
