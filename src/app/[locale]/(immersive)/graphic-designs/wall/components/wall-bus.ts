import { HUD, LOOP, TOUR, type LoopVariant } from "../wall.config";

/**
 * What crosses between the chrome and the room without a React render: the
 * live distance (the scene writes it straight into the HUD's span, throttled
 * and dead-banded), the "someone is here" stamp, the keyboard walk (which
 * keys are held, read by the camera rig every frame), the tour's entry
 * label — a DOM button the camera rig places over its point in the room —
 * and the chrome's commands: the view chosen, the tour station in view, the
 * loop's palette. Those used to be props of the canvas, and every tour step
 * re-rendered <Canvas> and the whole scene; now App sets them here and the
 * rig and the scene pick them up in the next frame, keyed on a sequence
 * number so choosing the view you are already on still re-frames the room.
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
  /** the held walk keys, as directions: orbit −1 | 0 | 1, dolly −1 | 0 | 1 */
  private readonly walking = { orbit: 0, dolly: 0 };
  /** the view chosen, and how many times one was — so re-choosing the current one counts */
  private presetIndex = 0;
  private presetsIssued = 0;
  /** the tour station in view, or null when the tour is closed; its own count */
  private tourStation: number | null = null;
  private toursIssued = 0;
  /** the loop's palette, its count, and which way the switch wipes: +1 left → right, −1 right → left */
  private loopName: LoopVariant = LOOP.variants[0];
  private loopsIssued = 0;
  private sweep = 1;
  /** "the camera has landed on station n": App's card and the scene's staging both listen */
  private readonly settleFns = new Set<(station: number) => void>();
  /** the tour label: the button, where it was last put, and whether it shows */
  private label: HTMLElement | null = null;
  private labelX = Number.NaN;
  private labelY = Number.NaN;
  private labelShown = false;
  /** on a phone the label is docked by the CSS rather than placed from the room */
  private labelDocked = false;

  // ── commands. Each setter buys a frame on the demand loop: a stamp alone
  //    changes nothing there until a frame runs. ──

  /** A view was chosen (the pager, keys 1–4) — also when it is the current one. */
  setPreset(index: number): void {
    this.presetIndex = index;
    this.presetsIssued++;
    this.wakeFrame?.();
  }

  preset(): number {
    return this.presetIndex;
  }

  /** A sequence number: the rig applies a command when it moves, whatever the index. */
  presetSeq(): number {
    return this.presetsIssued;
  }

  /** The tour: a station to fly to, or null to close it. */
  setTour(station: number | null): void {
    this.tourStation = station;
    this.toursIssued++;
    this.wakeFrame?.();
  }

  tour(): number | null {
    return this.tourStation;
  }

  tourSeq(): number {
    return this.toursIssued;
  }

  /** A palette, and the direction the wipe should run to reach it. */
  setLoop(variant: LoopVariant, sweep: number): void {
    this.loopName = variant;
    this.sweep = sweep;
    this.loopsIssued++;
    this.wakeFrame?.();
  }

  loop(): LoopVariant {
    return this.loopName;
  }

  loopSeq(): number {
    return this.loopsIssued;
  }

  loopSweep(): number {
    return this.sweep;
  }

  /** The scene hands over R3F’s `invalidate` (and null on unmount). A method
   *  rather than a public field: writing to a prop object is what the React
   *  compiler rules forbid, and the sibling demos take the same shape. */
  registerWake(fn: (() => void) | null): void {
    this.wakeFrame = fn;
  }

  /**
   * "Someone is here." Every input — a key, a drag, the wheel, a HUD button —
   * stamps this; the camera rig watches it to know when to stop drifting, and
   * App uses the first one to retire the title cover.
   */
  wake(): void {
    this.wokeAt = performance.now();
    this.wakeFrame?.();
  }

  /** The last stamp, for a consumer that compares it with its own. */
  lastWake(): number {
    return this.wokeAt;
  }

  /** App keeps this current from keydown / keyup; the rig applies it per frame. */
  setWalk(orbit: number, dolly: number): void {
    this.walking.orbit = orbit;
    this.walking.dolly = dolly;
  }

  walk(): Readonly<{ orbit: number; dolly: number }> {
    return this.walking;
  }

  /** The HUD calls this with its span (and null on unmount). */
  registerDistance(el: HTMLElement | null, decimal: string): void {
    this.el = el;
    this.decimal = decimal;
    this.last = Number.NaN; // force the next sample to paint
  }

  /** Listen for a station being reached; returns the unsubscribe. */
  addSettle(fn: (station: number) => void): () => void {
    this.settleFns.add(fn);
    return () => void this.settleFns.delete(fn);
  }

  /** The camera rig: the flight to `station` has landed, or there was nothing to fly. */
  settle(station: number): void {
    for (const fn of this.settleFns) fn(station);
  }

  /** The HUD calls this with the tour label (and null on unmount). */
  registerLabel(el: HTMLElement | null): void {
    this.label = el;
    this.labelX = Number.NaN;
    this.labelShown = false;
  }

  /**
   * Called every frame by the camera rig with the label's point projected to
   * CSS pixels, and whether it should show at all (not while touring, not
   * within arm's reach of the wall, not through the wall). Only a change is
   * written: the class when the visibility flips, the transform when the
   * point has moved by half a pixel. The label is kept inside the viewport:
   * pushed left when its point projects too near the right edge.
   */
  placeLabel(x: number, y: number, visible: boolean): void {
    const el = this.label;
    if (!el) return;
    if (this.labelDocked) {
      this.labelDocked = false;
      el.classList.remove("is-docked");
    }
    this.showLabel(el, visible);
    if (!visible) return;
    const max = window.innerWidth - el.offsetWidth - TOUR.labelEdgePx;
    if (x > max) x = max;
    if (x < TOUR.labelEdgePx) x = TOUR.labelEdgePx;
    if (Math.abs(x - this.labelX) < 0.5 && Math.abs(y - this.labelY) < 0.5) return;
    this.labelX = x;
    this.labelY = y;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%)`;
  }

  /**
   * On a phone the point beside the wall projects off-screen at the framed
   * presets, so the label docks where the CSS puts it — under the wall,
   * where the card will open — and only its visibility is driven from here.
   */
  dockLabel(visible: boolean): void {
    const el = this.label;
    if (!el) return;
    if (!this.labelDocked) {
      this.labelDocked = true;
      this.labelX = Number.NaN;
      el.classList.add("is-docked");
      el.style.transform = "";
    }
    this.showLabel(el, visible);
  }

  private showLabel(el: HTMLElement, visible: boolean): void {
    if (visible === this.labelShown) return;
    this.labelShown = visible;
    el.classList.toggle("is-hidden", !visible);
  }

  /** Focus the label if it is showing — where focus returns when the tour closes. */
  focusLabel(): boolean {
    if (!this.label || !this.labelShown) return false;
    this.label.focus({ preventScroll: true });
    return true;
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
