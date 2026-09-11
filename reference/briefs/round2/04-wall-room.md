# 04 — Parete · round 2a: the room, the back of the wall, the camera

**Model: Fable 5.1 · effort high.** After 01. Before 05 and 06.
Folder: `src/app/(immersive)/graphic-designs/wall/` (or `…/xperiments/wall/`).
Read `03-wall.md`, `reports/wall.md`, then the folder — `components/WallScene.tsx`,
`components/CameraRig.tsx`, `wall.config.ts`, `components/backdrop-material.ts`,
`components/room-light.ts`, `wall.css`, `copy.ts`.

Alberto's verdict: "molto bello" — the zoom and the colours especially. He
wants it far more detailed and a real space: walk around the back, no
figure, a ground that never ends. 05 (the loops) and 06 (the tour) follow in
this folder: leave the HUD and the loop switcher alone here except for §3.

## 0. Audit (00-shared.md)

Suspects: the idle drift restarting on a HUD click; the `RectAreaLight`
lighting nothing behind the wall; the documented reflector leak (drei's —
note, do not chase); a resize not re-framing (documented, by design).

## 1. No figure

Remove the scale silhouette entirely — `ROOM.figure` and its meshes. Scale
now comes from the riser, the cabinets, the cabling and the ground.

## 2. The ground is endless

Alberto sees the edge of the square the wall stands on. Wanted: a floor with
no edge and a room with no walls — a dark, endless ground, "un mondo stile
Minecraft", where you can go anywhere and the wall is the only object.

- Floor much larger (≥ 400 m) and everything fades to black with distance:
  `scene.fog` (`FogExp2` on `#000`, density so that ~40 m is fully black;
  linear `Fog` is fine too). Verify drei's `MeshReflectorMaterial` honours fog
  in both the main and the mirrored render (it extends `MeshStandardMaterial`);
  if it does not, fade the floor in its own shader instead. The wall's own
  materials (`LedWallMaterial`, the emissive face) stay **out** of the fog —
  custom `ShaderMaterial`s ignore it unless opted in; keep it so.
- The backdrop cylinder goes, and the lifted `backdropBottom` band with it.
  Delete `backdrop-material.ts` if nothing else uses it.
- Optional scale cue, only if the ground reads as a void without the figure:
  a very faint 1 m grid on the floor near the wall, additive, gone by ~12 m —
  a separate transparent plane with its own tiny shader. Hairline weight,
  `--ink` at ≤ 6 % alpha. If it reads as Tron or as a UI grid, delete it.
- The floor's reflection and the pool of light are the hero and must keep
  their character at every preset.

## 3. Walk around the back

- `CameraRig`: no azimuth limit (`±Infinity`), polar 55°–100°, dolly
  0.6–20 m, truck still off. Keyboard walk: `a` / `d` orbit, `w` / `s` dolly
  (held keys, damped, added to the key line in `copy.ts`). Touch unchanged.
- A fourth preset **`back`** (key `4`): 6 m behind the wall (azimuth 180°),
  eye height, target the wall centre; `fit: true`. Add it to the pager
  (`back` / `retro`) and to `aria`.
- Model the back so it is worth going there — "the physical details a client
  asks about" — driven by `LED_CABINETS` (12 × 6) so it stays consistent
  with the front:
  - **cabinet backs:** an `InstancedMesh` of 72 shallow boxes with a 4 mm
    gap, `#0b0b0d`, a slightly lighter frame lip, each with a small connector
    block and a handle recess (a second, smaller instanced mesh);
  - **cables:** power and data daisy-chained cabinet to cabinet along each
    row — thin black `TubeGeometry` on a shallow catenary between neighbouring
    connectors; one vertical drop per column end down to the riser, then
    along the riser to one side, where a processor box sits;
  - **ground support:** three or four square-section uprights behind the
    wall with diagonal outriggers to the floor, bolted to the riser, matte
    dark aluminium (`roughness` high, `metalness` ≈ 0.5);
  - **light:** the `RectAreaLight` faces forward, so the back is unlit. Add
    one dim source for it — a second `RectAreaLight` facing backward at
    ~10 % of the front, tinted by the loop like the front one, or a soft spot
    from above — readable, never bright. A service view.
  - Budget: ≤ 60 draw calls, instancing for anything repeated, no new
    dependency, no loaded model. Dispose everything on unmount.
- Optional: one more segment on the spec line, `ground support · daisy-chain`
  (English in both locales — they are the trade terms).

## 4. Keep

Presets 1–3 (re-check the oblique still holds the whole wall with no figure
to avoid — it may come back to the right side), the idle drift, the loop
switcher, bloom, the reflector values, the still paths (reduced motion /
software).

## Verify (add to the report)

Front, oblique, close, back; a full 360° drag without an edge or a seam
anywhere; `wasd`; max dolly at 20 m still black at the horizon; fps within
the report's headroom on the real GPU (bloom + reflector + the new geometry);
reduced motion; the software path; a phone viewport; exit / re-enter ×3.

## Commit

`feat(wall): endless ground, no figure, the back — cabinets, cabling, support`
— after the audit-fixes commit, if any.
