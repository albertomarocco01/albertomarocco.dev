import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Frameloop } from "@react-three/fiber";
import type { WallCopy } from "./copy";
import { LOOP, PRESETS } from "./wall.config";
import { Hud } from "./components/Hud";
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
 * touched anything yet, and the frameloop. The camera, the loop's clock, the
 * live distance and the walk keys never pass through it.
 */

const isChrome = (t: EventTarget | null) => t instanceof Element && t.closest("a, button") !== null;

/** the walk: `a` / `d` orbit, `w` / `s` dolly — as directions */
const WALK_KEYS: Record<string, readonly [orbit: number, dolly: number]> = {
  a: [-1, 0],
  d: [1, 0],
  w: [0, 1],
  s: [0, -1],
};

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
  const stageRef = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<string>());

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

  const choosePreset = useCallback(
    (index: number) => {
      setPreset(index);
      setPresetNonce((n) => n + 1);
      wake();
    },
    [wake],
  );

  const stepLoop = useCallback(
    (step: number) => {
      const count = LOOP.variants.length;
      setLoopIndex((current) => (current + step + count) % count);
      wake();
    },
    [wake],
  );

  // ── keys: 1 2 3 4 views, ← → loop, wasd walks (held), Esc exits ──
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
      if (event.key === "Escape") {
        router.push("/graphic-designs");
        return;
      }
      const walk = event.key.toLowerCase();
      if (walk in WALK_KEYS) {
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
  }, [router, choosePreset, stepLoop, wake, bus]);

  // ── the hand on the room: a drag, the wheel, a finger ──
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onInput = (event: Event) => {
      // a click on the exit link or a HUD button is chrome, not the room —
      // those wake through their own handlers
      if (isChrome(event.target)) return;
      wake();
    };
    el.addEventListener("pointerdown", onInput, { passive: true });
    el.addEventListener("wheel", onInput, { passive: true });
    el.addEventListener("touchstart", onInput, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onInput);
      el.removeEventListener("wheel", onInput);
      el.removeEventListener("touchstart", onInput);
    };
  }, [wake]);

  return (
    <div ref={stageRef} className="wall-stage" role="region" aria-label={copy.aria}>
      {webgl && (
        <WallCanvas
          variant={variant}
          preset={preset}
          presetNonce={presetNonce}
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
          onLoopStep={stepLoop}
        />
      )}
    </div>
  );
}
