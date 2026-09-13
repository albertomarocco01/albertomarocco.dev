/**
 * Scroll *intent*, read the same way everywhere. The home and /about lock the
 * document and read wheel, touch and keys as intent rather than as scroll; the
 * work rows decide hover vs tap. Each used to carry its own copy of these few
 * lines (deltaMode → px, the single-finger check, the "is this a control"
 * guard, the touch predicate), which is exactly how they drift apart. One
 * module, no DOM writes, no three.js — every driver can import it.
 */

/** deltaMode 1 (lines) → px; 40px ≈ one Chrome wheel notch's worth per 3 lines. */
export const LINE_PX = 40;

/** A wheel event's vertical travel in CSS px, whatever its `deltaMode`. */
export function wheelDeltaPx(e: WheelEvent): number {
  return e.deltaMode === 1
    ? e.deltaY * LINE_PX
    : e.deltaMode === 2
      ? e.deltaY * window.innerHeight
      : e.deltaY;
}

/** The y of a one-finger gesture, or null for a pinch / no finger — a pinch
 *  is never ours (zoom stays native). */
export function singleTouchY(e: TouchEvent): number | null {
  return e.touches.length === 1 ? e.touches[0].clientY : null;
}

/** The key's target is a control (link, button, form field): the key is that
 *  control's — Space is its click, Enter its activation — and a sequence
 *  driver must not also read it as intent. */
export function isControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    /^(a|button|input|textarea|select)$/i.test(target.tagName)
  );
}

/** The primary input cannot hover: a finger, not a mouse. `hover: none` and
 *  not `pointer: coarse` — a touch laptop with a mouse attached still hovers
 *  (and still gets the row hover-intent and the cursor); a phone never does.
 *  Read once per mount: it does not change under a page. */
export const TOUCH_MQ = "(hover: none)";
export function isTouchOnly(): boolean {
  return window.matchMedia(TOUCH_MQ).matches;
}
