import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Frameloop } from "@react-three/fiber";
import type { WallCopy } from "./copy";
import { LOOP, PRESETS, TOUR } from "./wall.config";
import { Hud } from "./components/Hud";
import { Tour } from "./components/Tour";
import { WallBus } from "./components/wall-bus";
import { WallCanvas } from "./components/WallCanvas";
import { hasWebGL2 } from "@/lib/webgl-caps";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useTabVisible } from "@/lib/use-tab-visible";

/**
 * Parete — the chrome around the room.
 *
 * React here holds only what changes the tree: WebGL availability, context
 * loss, which preset and which loop are current, whether the visitor has
 * touched anything yet, the frameloop, and the tour — which station is in
 * view and whether its card is showing. The camera, the loop's clock, the
 * live distance, the walk keys and the tour label's position never pass
 * through it.
 */

const isChrome = (t: EventTarget | null) => t instanceof Element && t.closest("a, button") !== null;

/** the walk: `a` / `d` orbit, `w` / `s` dolly — as directions */
const WALK_KEYS: Record<string, readonly [orbit: number, dolly: number]> = {
  a: [-1, 0],
  d: [1, 0],
  w: [0, 1],
  s: [0, -1],
};

const TOUR_LAST = TOUR.stations.length - 1;

export default function App({ copy }: { copy: WallCopy }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const visible = useTabVisible();
  const [webgl] = useState(hasWebGL2);
  const [contextLost, setContextLost] = useState(false);
  const [software, setSoftware] = useState(false);
  const [bus] = useState(() => new WallBus());
  const [preset, setPreset] = useState(0);
  // Bumped on every choice, including re-choosing the view you are already on:
  // `setPreset(same)` is swallowed by React's state equality, and a pager button
  // that does nothing after you have orbited away is the wrong answer.
  const [presetNonce, setPresetNonce] = useState(0);
  const [loopIndex, setLoopIndex] = useState(0);
  const [started, setStarted] = useState(false);
  // The tour: the station the camera is flying to or standing on, or null.
  const [tour, setTour] = useState<number | null>(null);
  // Its card: which station it shows and whether it is on. It goes off the
  // moment a step is taken — the old words fade out — and comes back with the
  // new station once the camera has landed, so the words follow the room.
  const [card, setCard] = useState({ station: 0, on: false });
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const held = useRef(new Set<string>());
  // The tour as the input handlers see it: a ref, so the key and pointer
  // listeners never re-subscribe on a step (re-subscribing releases the walk).
  const tourRef = useRef<number | null>(null);
  const wasTouring = useRef(false);
  const returnFocus = useRef(false);
  const cardTimer = useRef(0);

  const variant = LOOP.variants[loopIndex];
  // hidden → nothing at all; reduced motion, or a CPU rasteriser that cannot
  // keep up → a still room that still answers the hand; otherwise the loop runs.
  const frameloop: Frameloop = !visible ? "never" : reduced || software ? "demand" : "always";

  // One signal for "someone is here": it retires the title cover and tells the
  // camera rig to drop its drift and start counting idle time again.
  const wake = useCallback(() => {
    bus.wake();
    setStarted(true);
  }, [bus]);

  // ── the tour ──
  const openTour = useCallback(() => {
    if (tourRef.current !== null) return;
    tourRef.current = 0;
    setTour(0);
    setCard({ station: 0, on: false });
    wake();
  }, [wake]);

  // `toLabel`: whether focus should go back to the label — yes for Esc and
  // the close button, no when the visitor simply took the wheel (a preset, a
  // walk key), where the focus is already where they put it.
  const closeTour = useCallback((toLabel: boolean) => {
    if (tourRef.current === null) return;
    tourRef.current = null;
    returnFocus.current = toLabel;
    window.clearTimeout(cardTimer.current);
    setTour(null);
  }, []);

  const stepTour = useCallback(
    (direction: number) => {
      const current = tourRef.current;
      if (current === null) return;
      const next = Math.min(TOUR_LAST, Math.max(0, current + direction));
      if (next === current) return;
      tourRef.current = next;
      window.clearTimeout(cardTimer.current);
      setTour(next);
      setCard((c) => ({ ...c, on: false }));
      wake();
    },
    [wake],
  );

  const choosePreset = useCallback(
    (index: number) => {
      closeTour(false); // choosing a view is taking the wheel: the tour ends
      setPreset(index);
      setPresetNonce((n) => n + 1);
      wake();
    },
    [wake, closeTour],
  );

  // ← / → cycle, and the wipe runs the way the arrow points
  const stepLoop = useCallback(
    (step: number) => {
      const count = LOOP.variants.length;
      bus.setLoopSweep(step);
      setLoopIndex((current) => (current + step + count) % count);
      wake();
    },
    [bus, wake],
  );

  // a swatch: the wipe runs toward it, the way the palette row reads
  const chooseLoop = useCallback(
    (index: number, sweep: number) => {
      bus.setLoopSweep(sweep);
      setLoopIndex(index);
      wake();
    },
    [bus, wake],
  );

  // The camera has landed on a station (or was already there): the card comes
  // on a beat later, and the "where" station steps the palette on arrival.
  // The rig reports through the bus because the flight is its own tween —
  // a timer here would only be a guess at when it ends.
  useEffect(() => {
    bus.registerSettle((station) => {
      if (tourRef.current !== station) return;
      window.clearTimeout(cardTimer.current);
      cardTimer.current = window.setTimeout(
        () => setCard({ station, on: true }),
        reduced ? 0 : TOUR.cardDelayMs,
      );
      if (station === TOUR.paletteStation) stepLoop(1);
    });
    return () => {
      bus.registerSettle(null);
      window.clearTimeout(cardTimer.current);
    };
  }, [bus, reduced, stepLoop]);

  // Focus: onto the card when the tour opens, back to the label when it
  // closes on Esc or its close button. The label is hidden while touring and
  // reappears on the rig's next frame, so the return waits a frame for it;
  // if it is still hidden (the tour closed at 0.9 m from the wall, where the
  // label does not show) the stage takes the focus instead.
  useEffect(() => {
    if (tour !== null) {
      if (!wasTouring.current) cardRef.current?.focus({ preventScroll: true });
      wasTouring.current = true;
      return;
    }
    if (!wasTouring.current) return;
    wasTouring.current = false;
    if (!returnFocus.current) return;
    returnFocus.current = false;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => {
        if (!bus.focusLabel()) stageRef.current?.focus({ preventScroll: true });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [tour, bus]);

  // ── keys: 1 2 3 4 views, ← → loop, wasd walks (held), i tour, ↓ ↑ Space in it, Esc ──
  useEffect(() => {
    const keys = held.current;
    const syncWalk = () => {
      let orbit = 0;
      let dolly = 0;
      for (const k of keys) {
        orbit += WALK_KEYS[k][0];
        dolly += WALK_KEYS[k][1];
      }
      bus.setWalk(Math.sign(orbit), Math.sign(dolly));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Alt+← is browser back and Ctrl/Cmd+1..4 switches tab — a demo that eats
      // those is a demo you cannot leave. Auto-repeat would also restart the
      // 1.2 s crossfade thirty times a second (and a held walk key is tracked
      // from its first press, so its repeats carry nothing).
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const touring = tourRef.current !== null;
      if (event.key === "Escape") {
        // the first Esc closes the tour; the second leaves the demo
        if (touring) closeTour(true);
        else router.push("/graphic-designs");
        return;
      }
      if (event.key === "i" || event.key === "I") {
        openTour();
        return;
      }
      if (touring) {
        // ↓ and Space step forward, ↑ back. Space on a button stays the
        // button's own (it would fire the click as well).
        if (event.key === "ArrowDown" || (event.key === " " && !isChrome(event.target))) {
          event.preventDefault();
          stepTour(1);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          stepTour(-1);
          return;
        }
      }
      const walk = event.key.toLowerCase();
      if (walk in WALK_KEYS) {
        closeTour(false); // walking is taking the wheel: the tour ends
        keys.add(walk);
        syncWalk();
        wake();
        return;
      }
      const view = PRESETS.findIndex((_, index) => event.key === String(index + 1));
      if (view >= 0) {
        choosePreset(view);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        stepLoop(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepLoop(-1);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const walk = event.key.toLowerCase();
      if (keys.delete(walk)) syncWalk();
    };
    // a key held across an alt-tab never sends its keyup: let go of everything
    const release = () => {
      if (keys.size === 0) return;
      keys.clear();
      syncWalk();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      release();
    };
  }, [router, choosePreset, stepLoop, wake, bus, openTour, closeTour, stepTour]);

  // ── the hand on the room: a drag, the wheel, a finger ──
  // Inside the tour the wheel and a vertical one-finger swipe step between
  // stations instead (the camera rig has taken them off the controls): one
  // step per gesture, then a cooldown that swallows a trackpad's inertia.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let wheelAcc = 0;
    let steppedAt = -Infinity;
    let touchId = -1;
    let touchY = 0;
    const step = (direction: number) => {
      const now = performance.now();
      if (now - steppedAt < TOUR.stepCooldownMs) return;
      steppedAt = now;
      stepTour(direction);
    };
    // a click on the exit link or a HUD button is chrome, not the room —
    // those wake through their own handlers
    const wakeFromRoom = (event: Event) => {
      if (!isChrome(event.target)) wake();
    };
    const onPointerDown = (event: PointerEvent) => {
      wakeFromRoom(event);
      if (tourRef.current === null || event.pointerType !== "touch" || touchId >= 0) return;
      touchId = event.pointerId;
      touchY = event.clientY;
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== touchId) return;
      touchId = -1;
      if (event.type !== "pointerup" || tourRef.current === null) return;
      const dy = touchY - event.clientY; // the finger moving up is "next"
      if (Math.abs(dy) >= TOUR.swipePx) step(dy > 0 ? 1 : -1);
    };
    const onWheel = (event: WheelEvent) => {
      wakeFromRoom(event);
      if (tourRef.current === null) return;
      if (performance.now() - steppedAt < TOUR.stepCooldownMs) {
        wheelAcc = 0;
        return;
      }
      wheelAcc += event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
      if (Math.abs(wheelAcc) < TOUR.wheelStep) return;
      const direction = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      step(direction);
    };
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointerup", onPointerEnd, { passive: true });
    el.addEventListener("pointercancel", onPointerEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", wakeFromRoom, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", wakeFromRoom);
    };
  }, [wake, stepTour]);

  return (
    <div ref={stageRef} className="wall-stage" role="region" aria-label={copy.aria} tabIndex={-1}>
      {webgl && (
        <WallCanvas
          variant={variant}
          preset={preset}
          presetNonce={presetNonce}
          tour={tour}
          reduced={reduced}
          software={software}
          frameloop={frameloop}
          bus={bus}
          onSoftware={setSoftware}
          onContextLost={setContextLost}
        />
      )}

      {!webgl && (
        <p className="wall-msg" role="alert">
          {copy.noWebgl}
        </p>
      )}
      {webgl && contextLost && (
        <p className="wall-msg" role="alert">
          {copy.contextLost}
        </p>
      )}

      <Link href="/graphic-designs" className="wall-exit">
        {copy.exit}
      </Link>

      {webgl && !contextLost && (
        <Hud
          copy={copy}
          bus={bus}
          variant={variant}
          preset={preset}
          started={started}
          onPreset={choosePreset}
          onLoop={chooseLoop}
          onTour={openTour}
        />
      )}

      {webgl && !contextLost && tour !== null && (
        <Tour
          ref={cardRef}
          copy={copy}
          station={card.station}
          on={card.on}
          onNext={() => stepTour(1)}
          onBack={() => stepTour(-1)}
          onClose={() => closeTour(true)}
        />
      )}
    </div>
  );
}
