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
 * touched anything yet, and the frameloop. The camera, the loop's clock and the
 * live distance never pass through it.
 */

const isChrome = (t: EventTarget | null) => t instanceof Element && t.closest("a, button") !== null;

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

  // ── keys: 1 2 3 views, ← → loop, Esc exits ──
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Alt+← is browser back and Ctrl/Cmd+1..3 switches tab — a demo that eats
      // those is a demo you cannot leave. Auto-repeat would also restart the
      // 1.2 s crossfade thirty times a second.
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.key === "Escape") {
        router.push("/graphic-designs");
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
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, choosePreset, stepLoop]);

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
