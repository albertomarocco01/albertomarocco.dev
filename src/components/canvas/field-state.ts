import { BLOB_COUNT } from "./field-glsl";

/**
 * The white field's live frame, published by Aura on every frame it renders
 * (white mode only) so a second <View> can paint the *same* orbs into another
 * layer — the /about cut-out figure draws the near orbs over itself from this
 * (FigureView.tsx). Same shape of contract as excite.ts / bubble-params.ts: a
 * plain mutable singleton, mutated in place, no React, no allocation on the hot
 * path. Readers see the last published frame; a one-frame lag at ~30fps is
 * invisible, so registration order between the two views never matters.
 */
export const fieldState = {
  /** per orb: x, y (aspect-corrected, centred at 0, y up) and core radius */
  blobs: new Float32Array(BLOB_COUNT * 3),
  /** cursor parallax offset, the field's u_disp (rest = 0) */
  dispX: 0,
  dispY: 0,
  /** the field's current u_fade — its master opacity envelope */
  fade: 0,
  /** bumps on every publish, so a reader can tell a live field from a stale one */
  frame: 0,
};

type OrbLike = { x: number; y: number; r: number };

export function publishField(
  orbs: readonly OrbLike[],
  fade: number,
  dispX: number,
  dispY: number,
) {
  const b = fieldState.blobs;
  const n = Math.min(orbs.length, BLOB_COUNT);
  for (let i = 0; i < n; i++) {
    const o = orbs[i];
    b[i * 3] = o.x;
    b[i * 3 + 1] = o.y;
    b[i * 3 + 2] = o.r;
  }
  fieldState.fade = fade;
  fieldState.dispX = dispX;
  fieldState.dispY = dispY;
  fieldState.frame++;
}
