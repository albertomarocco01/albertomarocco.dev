import { useEffect, type RefObject } from "react";
import {
  CLICK_MS,
  CLICK_PX,
  DOUBLE_TAP_MS,
  DOUBLE_TAP_PX,
  FLICK_MIN_PX,
  FLICK_SPEED,
  TAP_PX,
} from "../hands.config";
import type { HandsInput } from "../engine/input";

/**
 * Pointer mode: the mouse or a touch is one hand, pressing is pinching.
 *
 * - Mouse: hover moves the reticle, press-and-hold pinches. Shift while a card
 *   is held plants a second, still hand where the pointer is; dragging away
 *   from it pulls the card apart — the tear. Double-click pushes from there.
 *   A click (short, still) opens the print under it; while one is open, a
 *   quick flick anywhere — or a double-click — closes it.
 * - Touch: each finger is a hand (two at most), touching is pinching, so two
 *   fingers on one card spread apart tear it. Double-tap pushes; a tap opens,
 *   a swipe closes.
 *
 * Only active while `enabled`; in camera mode the hands own the slots.
 */
export function usePointerHands(
  stage: RefObject<HTMLElement | null>,
  input: HandsInput,
  enabled: boolean,
): void {
  useEffect(() => {
    const el = stage.current;
    if (!enabled || !el) return;

    // pointerId → slot
    const slots = new Map<number, 0 | 1>();
    let shiftAnchor = false;
    let lastTap = { t: -1e9, x: 0, y: 0 };
    let downAt = { t: -1e9, x: 0, y: 0, lone: false };
    let mouseX = 0.5;
    let mouseY = 0.5;
    // The pressed pointer's recent path (≤ ~90 ms) for the flick, once per press.
    let path: { t: number; x: number; y: number }[] = [];
    let flicked = false;

    const norm = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return {
        u: (e.clientX - r.left) / Math.max(1, r.width),
        v: (e.clientY - r.top) / Math.max(1, r.height),
      };
    };
    const write = (slot: 0 | 1, u: number, v: number, pinch: boolean) => {
      input.slots[slot] = { kind: "explicit", u, v, pinch, t: performance.now() };
    };
    // A release must reach the frame loop as an explicit `pinch=false` (an
    // immediate release with the current velocity) before the slot goes away;
    // two frames later the hand itself is gone. Nulling straight away would
    // route it through the lost-hand grace with a stale velocity instead.
    const lift = (slot: 0 | 1, u: number, v: number) => {
      write(slot, u, v, false);
      const written = input.slots[slot];
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (input.slots[slot] === written) input.slots[slot] = null;
        }),
      );
    };
    let anchorU = 0;
    let anchorV = 0;
    const device = (e: PointerEvent) => {
      input.lastDevice = e.pointerType === "touch" ? "touch" : "pointer";
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("a, button")) return;
      device(e);
      const { u, v } = norm(e);
      const now = performance.now();
      // Double-tap / double-click → push. Only a second *lone* press right
      // after a completed tap counts — a second finger landing next to the
      // first is the start of a tear, not a tap.
      if (
        slots.size === 0 &&
        now - lastTap.t < DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX
      ) {
        lastTap.t = -1e9;
        input.pushes.push({ u, v });
        return;
      }
      lastTap.t = -1e9;
      downAt = { t: now, x: e.clientX, y: e.clientY, lone: slots.size === 0 };
      path = [{ t: now, x: e.clientX, y: e.clientY }];
      flicked = false;

      let slot = slots.get(e.pointerId);
      if (slot === undefined) {
        const taken = [...slots.values()];
        if (!taken.includes(0)) slot = 0;
        else if (!taken.includes(1) && !shiftAnchor) slot = 1;
        else return; // a third finger: ignored
        slots.set(e.pointerId, slot);
      }
      el.setPointerCapture?.(e.pointerId);
      write(slot, u, v, true);
      // Shift already down when pressing: plant the second hand right here.
      if (e.shiftKey && slot === 0 && e.pointerType === "mouse") plantAnchor(u, v);
    };

    const onMove = (e: PointerEvent) => {
      const { u, v } = norm(e);
      if (e.pointerType === "mouse") {
        mouseX = u;
        mouseY = v;
      }
      const slot = slots.get(e.pointerId);
      if (slot !== undefined) {
        write(slot, u, v, true);
        flick(e);
      } else if (e.pointerType === "mouse" && slots.size === 0) {
        // Hover: the reticle follows, not pinching.
        input.lastDevice = "pointer";
        write(0, u, v, false);
      }
    };

    // A flick / swipe: the pressed pointer faster than FLICK_SPEED short sides
    // per second over its last few samples, after a little travel. Once per
    // press; the world only acts on it while a print is open.
    const flick = (e: PointerEvent) => {
      const now = performance.now();
      path.push({ t: now, x: e.clientX, y: e.clientY });
      while (path.length > 1 && now - path[0].t > 90) path.shift();
      if (flicked || path.length < 2) return;
      const a = path[0];
      const dtm = now - a.t;
      if (dtm < 30) return;
      const dx = e.clientX - a.x;
      const dy = e.clientY - a.y;
      const dist = Math.hypot(dx, dy);
      const r = el.getBoundingClientRect();
      const short = Math.max(1, Math.min(r.width, r.height));
      const travel = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      if (dist / (dtm / 1000) > FLICK_SPEED * short && travel > FLICK_MIN_PX && dist > 1e-3) {
        flicked = true;
        input.flicks.push({ dx: dx / dist, dy: dy / dist });
      }
    };

    const onUp = (e: PointerEvent) => {
      const slot = slots.get(e.pointerId);
      if (slot === undefined) return;
      slots.delete(e.pointerId);
      const now = performance.now();
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      const lone = downAt.lone && slots.size === 0;
      // A short, still, single press is a tap; two of them are a push.
      if (lone && now - downAt.t < DOUBLE_TAP_MS && moved < DOUBLE_TAP_PX) {
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      const { u, v } = norm(e);
      // A click / tap opens the print under it (the world decides which).
      if (lone && now - downAt.t < CLICK_MS && moved < (e.pointerType === "touch" ? TAP_PX : CLICK_PX)) {
        input.taps.push({ u, v });
      }
      if (e.pointerType === "mouse") write(slot, u, v, false);
      else lift(slot, u, v);
      if (slot === 0 && shiftAnchor) liftAnchor();
    };

    const plantAnchor = (u: number, v: number) => {
      if (input.slots[1]) return;
      shiftAnchor = true;
      anchorU = u;
      anchorV = v;
      write(1, u, v, true);
    };
    const liftAnchor = () => {
      if (!shiftAnchor) return;
      shiftAnchor = false;
      lift(1, anchorU, anchorV);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Shift" || e.repeat) return;
      // Shift while a mouse press is holding: the second hand appears under it.
      if ([...slots.values()].includes(0)) plantAnchor(mouseX, mouseY);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") liftAnchor();
    };
    const onLeave = () => {
      if (slots.size === 0) input.slots[0] = null;
    };
    const onBlur = () => {
      slots.clear();
      shiftAnchor = false;
      input.slots[0] = null;
      input.slots[1] = null;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [stage, input, enabled]);
}
