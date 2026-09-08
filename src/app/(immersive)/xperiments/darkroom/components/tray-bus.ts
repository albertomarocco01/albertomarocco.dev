/**
 * The one mutable object the DOM and the GPU loop share.
 *
 * App.tsx writes pointer / key / command state into it from event handlers;
 * the engine reads and consumes it once per simulation step. The engine writes
 * HUD snapshots back through the tiny external store below, which the HUD
 * component subscribes to with `useSyncExternalStore` — so the 60 fps loop
 * never touches React and React never touches the loop.
 *
 * No three.js in here: this module is shared by the chrome (App.tsx) and the
 * lazy scene, and must not drag the 3D chunk into the chrome.
 */

import { PRINTS } from "../darkroom.config";

export type DarkroomMode = "fluid" | "brush";

export type Phase = "developing" | "fixing" | "fixed" | "draining";

export interface HudSnapshot {
  /** 0-based index of the print in the tray */
  index: number;
  count: number;
  /** mean exposure over the print, 0..1 */
  coverage: number;
  phase: Phase;
  /** any input on THIS print yet (hides the idle hint) */
  touched: boolean;
  /** anything at all has happened this session (hides the title cover) */
  started: boolean;
}

export interface TrayPointer {
  /** tray UV, y up */
  x: number;
  y: number;
  /** position at the previous consumed step */
  px: number;
  py: number;
  /** smoothed velocity, UV per second */
  vx: number;
  vy: number;
  down: boolean;
  /** moved since the last consumed step */
  dirty: boolean;
  /** never consumed yet — no velocity can be derived */
  fresh: boolean;
  /** lifted / left / cancelled: the engine consumes its last segment, then drops it */
  ended: boolean;
  /** seconds since the engine last consumed this pointer */
  dtAcc: number;
}

export class TrayBus {
  readonly pointers = new Map<number, TrayPointer>();
  /** Space held right now */
  spaceHeld = false;
  /** Space presses since the last step (not auto-repeat) */
  spacePresses = 0;
  /** queued print changes, consumed in order */
  readonly commands: ("next" | "prev")[] = [];
  /** any input event since the last step */
  input = false;
  /** the scene sets this in demand mode so an input wakes one frame */
  wake: (() => void) | null = null;

  private snapshot: HudSnapshot = {
    index: 0,
    count: PRINTS.length,
    coverage: 0,
    phase: "developing",
    touched: false,
    started: false,
  };
  private readonly listeners = new Set<() => void>();

  // ── DOM side ────────────────────────────────────────────────────────────

  pointerMove(id: number, x: number, y: number, down: boolean) {
    const p = this.pointers.get(id);
    if (p && !p.ended) {
      p.x = x;
      p.y = y;
      p.down = down;
      p.dirty = true;
    } else {
      // new, or back after leaving: no velocity can be derived from before
      this.pointers.set(id, { x, y, px: x, py: y, vx: 0, vy: 0, down, dirty: false, fresh: true, ended: false, dtAcc: 0 });
    }
    this.poke();
  }

  pointerDown(id: number, down: boolean) {
    const p = this.pointers.get(id);
    if (p) p.down = down;
    this.poke();
  }

  /** Lifted, left or cancelled. Only marked here — a dirty last segment from
   *  the same frame is still consumed by the engine, which then drops it. */
  pointerEnd(id: number) {
    const p = this.pointers.get(id);
    if (p) p.ended = true;
    // not an input — but a demand-mode frame may have a stroke left to measure
    this.wake?.();
  }

  space(down: boolean, repeat: boolean) {
    if (down && !repeat) this.spacePresses += 1;
    this.spaceHeld = down;
    if (down) this.poke();
  }

  command(c: "next" | "prev") {
    this.commands.push(c);
    this.poke();
  }

  /** Window blur / tab hidden: a key can't be trusted to release, and a press
   *  queued in that frame must not fire when the tab comes back. */
  releaseAll() {
    this.spaceHeld = false;
    this.spacePresses = 0;
    this.pointers.clear();
  }

  /** Engine disposed: nothing queued may reach the next engine. */
  clear() {
    this.pointers.clear();
    this.commands.length = 0;
    this.spacePresses = 0;
    this.spaceHeld = false;
    this.input = false;
    this.wake = null;
  }

  private poke() {
    this.input = true;
    this.wake?.();
  }

  // ── HUD store ───────────────────────────────────────────────────────────

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  publish(next: Partial<HudSnapshot>) {
    const s = this.snapshot;
    if (
      (next.index ?? s.index) === s.index &&
      (next.count ?? s.count) === s.count &&
      (next.coverage ?? s.coverage) === s.coverage &&
      (next.phase ?? s.phase) === s.phase &&
      (next.touched ?? s.touched) === s.touched &&
      (next.started ?? s.started) === s.started
    ) {
      return;
    }
    this.snapshot = { ...s, ...next };
    this.listeners.forEach((l) => l());
  }
}
