/**
 * Transient bubble-field excitation state — the teaser-hover agitation.
 *
 * Same shape of contract as bubble-params.ts, but for a transient interaction
 * rather than a persisted look: TeaserFX (DOM side) writes the hovered/focused
 * label's rect here, projected into the white field's aspect-corrected
 * normalized space (the shader/physics `p` space: y spans [-0.5, 0.5], x is
 * scaled by the aspect ratio); Aura's physics reads it every frame and eases
 * `level` toward `targetLevel`, so the agitation breathes in and out and never
 * snaps. A plain mutable singleton — no React, no allocation on the hot path.
 *
 * One slot on purpose: only one teaser is hovered/focused at a time, and a
 * switch mid-ease smooths the centre over (Aura lerps x/y toward tx/ty).
 */

export type ExciteState = {
  /** 1 while a teaser is hovered/focused, 0 otherwise (set by TeaserFX) */
  targetLevel: number;
  /** eased envelope, owned by Aura's frame loop */
  level: number;
  /** eased centre, owned by Aura's frame loop */
  x: number;
  y: number;
  /** target centre in field space (set by TeaserFX) */
  tx: number;
  ty: number;
  /** label half-size in field space (before the exciteRadius multiplier) */
  r: number;
};

export const excite: ExciteState = {
  targetLevel: 0,
  level: 0,
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  r: 0.15,
};

/** Aim the excitation at a screen rect (the hovered label). */
export function setExciteRect(rect: DOMRect) {
  const vw = Math.max(window.innerWidth, 1);
  const vh = Math.max(window.innerHeight, 1);
  const aspect = vw / vh;
  excite.tx = ((rect.left + rect.width / 2) / vw - 0.5) * aspect;
  excite.ty = 0.5 - (rect.top + rect.height / 2) / vh;
  excite.r = Math.max(rect.width, rect.height) * 0.5 / vh;
  excite.targetLevel = 1;
}

/** Let the agitation ease back out. */
export function clearExcite() {
  excite.targetLevel = 0;
}
