/**
 * "A DOM tracker is moving — render every frame until then."
 *
 * The shared canvas runs on demand at ~30fps (the ambient field's throttle),
 * which is plenty while every <View> tracker sits still. When a page animates
 * the box a View tracks — /about slides its whole panel track for ~1.2s — the
 * GPU copy would step at 30fps beside DOM text moving at 60, so the mover
 * declares a hold here and the tracking views invalidate on every frame while
 * it lasts. A three-free module on purpose: the DOM drivers import it without
 * dragging the canvas chunk into their bundle.
 *
 * A hold has to be able to *start* frames, not only prolong them: on a demand
 * loop with the field static (software WebGL) or idle, nothing else would ask
 * for one and the tracker would sit at its old box while the panel slid away
 * from under it. So the views register a waker (their canvas `invalidate`) and
 * every hold fires it once; from that frame on the views keep themselves going.
 */
export const trackMotion = {
  /** performance.now() until which trackers should render every frame */
  until: 0,
};

const wakers = new Set<() => void>();

/** Keep every tracking view at full frame rate for the next `ms`. */
export function holdTracking(ms: number) {
  trackMotion.until = Math.max(trackMotion.until, performance.now() + ms);
  wakers.forEach((wake) => wake());
}

export function isTrackingHeld(): boolean {
  return performance.now() < trackMotion.until;
}

/** Be woken when a hold starts (a tracking view passes its `invalidate`).
 *  Returns the unsubscribe. */
export function onTrackingHold(wake: () => void): () => void {
  wakers.add(wake);
  return () => {
    wakers.delete(wake);
  };
}
