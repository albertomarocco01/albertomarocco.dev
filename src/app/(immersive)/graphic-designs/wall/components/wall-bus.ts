import { HUD } from "../wall.config";

/**
 * The one number on the HUD that changes while you move: how far the camera
 * stands from the wall. It belongs on the spec line — pitch and viewing
 * distance are the pair a client actually asks about — but it must not cost a
 * React render per frame, so the scene writes it straight into the DOM node the
 * HUD hands over here, throttled and dead-banded.
 *
 * The same shape as the sibling demos' buses: one mutable object, mutated only
 * through its own methods, so nothing crosses a hook or a prop as a raw field.
 */
export class WallBus {
  private el: HTMLElement | null = null;
  private decimal = ".";
  private last = Number.NaN;
  private wokeAt = 0;
  /** R3F’s `invalidate`, registered by the scene: on the demand frameloop a
   *  stamp alone changes nothing until a frame runs. */
  private wakeFrame: (() => void) | null = null;

  /**
   * "Someone is here." Every input — a key, a drag, the wheel, a HUD button —
   * stamps this; the camera rig watches it to know when to stop drifting, and
   * App uses the first one to retire the title cover.
   */
  /** The scene hands over R3F’s `invalidate` (and null on unmount). A method
   *  rather than a public field: writing to a prop object is what the React
   *  compiler rules forbid, and the sibling demos take the same shape. */
  registerWake(fn: (() => void) | null): void {
    this.wakeFrame = fn;
  }

  wake(): void {
    this.wokeAt = performance.now();
    this.wakeFrame?.();
  }

  /** The last stamp, for a consumer that compares it with its own. */
  lastWake(): number {
    return this.wokeAt;
  }

  /** The HUD calls this with its span (and null on unmount). */
  registerDistance(el: HTMLElement | null, decimal: string): void {
    this.el = el;
    this.decimal = decimal;
    this.last = Number.NaN; // force the next sample to paint
  }

  /**
   * Called every frame by the camera rig. The dead band is the whole throttle:
   * a time-based one would drop the single frame a preset cut produces on the
   * demand loop and leave the spec sheet reading the previous distance.
   */
  setDistance(metres: number): void {
    const el = this.el;
    if (!el) return;
    if (Math.abs(metres - this.last) < HUD.distanceEpsilon) return;
    this.last = metres;
    el.textContent = metres.toFixed(1).replace(".", this.decimal);
  }
}
