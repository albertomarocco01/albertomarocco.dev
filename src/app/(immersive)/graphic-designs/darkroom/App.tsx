import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Frameloop } from "@react-three/fiber";
import { hasWebGL2 } from "@/lib/webgl-caps";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useTabVisible } from "@/lib/use-tab-visible";
import type { DarkroomCopy } from "./copy";
import { DarkroomCanvas } from "./components/DarkroomCanvas";
import { Hud } from "./components/Hud";
import { TrayBus, type DarkroomMode } from "./components/tray-bus";
import type { DarkroomCapabilities } from "./components/darkroom-engine";

/**
 * Camera Oscura — the chrome around the tray.
 *
 * The stage is the tray: pointer and key events land here, are written into
 * the shared `TrayBus`, and the GPU loop (DarkroomCanvas → DarkroomScene →
 * DarkroomEngine) consumes them. React state here is only what changes the
 * tree: WebGL availability, context loss, the render mode and tab visibility.
 * Everything that moves at frame rate stays out of React.
 */

const isChrome = (t: EventTarget | null) => t instanceof Element && t.closest("a, button") !== null;

export default function App({ copy }: { copy: DarkroomCopy }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const visible = useTabVisible();
  // three ≥ r163 is WebGL2-only, so that is what the piece needs
  const [webgl] = useState(hasWebGL2);
  const [contextLost, setContextLost] = useState(false);
  const [caps, setCaps] = useState<DarkroomCapabilities | null>(null);
  const [bus] = useState(() => new TrayBus());
  const stageRef = useRef<HTMLDivElement>(null);

  // The brush path is one flag away from the fluid: reduced motion, no
  // renderable half-float target, or a software rasteriser (both checked on the
  // real context in onCreated).
  const mode: DarkroomMode | null = caps === null ? null : reduced || !caps.halfFloat || caps.software ? "brush" : "fluid";
  const frameloop: Frameloop = !visible || !mode || contextLost ? "never" : mode === "brush" ? "demand" : "always";

  // ── pointer / touch → the bus, in tray UV (y up) ──
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const at = (e: PointerEvent): [number, number] => {
      const r = el.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
    };
    const onMove = (e: PointerEvent) => {
      if (isChrome(e.target)) {
        // over the exit link / next button the pointer is gone for the tray —
        // otherwise its first move back would read as a teleport
        bus.pointerEnd(e.pointerId);
        return;
      }
      const [x, y] = at(e);
      bus.pointerMove(e.pointerId, x, y, e.buttons > 0);
    };
    const onDown = (e: PointerEvent) => {
      if (isChrome(e.target)) return;
      const [x, y] = at(e);
      bus.pointerMove(e.pointerId, x, y, true);
    };
    const onUp = (e: PointerEvent) => {
      // a lifted finger is gone; a released mouse button is still a pointer.
      // pointerEnd only marks it: the engine consumes the last segment first.
      if (e.pointerType === "mouse") bus.pointerDown(e.pointerId, false);
      else bus.pointerEnd(e.pointerId);
    };
    const onEnd = (e: PointerEvent) => bus.pointerEnd(e.pointerId);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onEnd);
    el.addEventListener("pointerleave", onEnd);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onEnd);
      el.removeEventListener("pointerleave", onEnd);
    };
  }, [bus]);

  // ── keys: Space agitates, ← → change print, Esc exits ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // browser shortcuts (Alt+← back, Ctrl/⌘ combos) are not ours
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "Escape") {
        if (!e.repeat) router.push("/graphic-designs");
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (!e.repeat) bus.command(e.key === "ArrowRight" ? "next" : "prev");
        return;
      }
      // Space on the focused exit link / next button belongs to that control
      if ((e.code === "Space" || e.key === " ") && !isChrome(e.target)) {
        e.preventDefault();
        bus.space(true, e.repeat);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") bus.space(false, false);
    };
    // keyup never comes if the window loses focus mid-press — release on both signals
    const release = () => bus.releaseAll();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [bus, router]);

  const onNext = useCallback(() => bus.command("next"), [bus]);

  return (
    <div ref={stageRef} className="darkroom-stage" role="region" aria-label={copy.aria}>
      {webgl && (
        <DarkroomCanvas
          bus={bus}
          mode={mode}
          frameloop={frameloop}
          onCapabilities={setCaps}
          onContextLost={setContextLost}
        />
      )}

      {/* the rim: a hairline inset, the only hint of a tray */}
      <div className="darkroom-rim" aria-hidden="true" />

      {!webgl && (
        <p className="darkroom-msg" role="alert">
          {copy.noWebgl}
        </p>
      )}
      {webgl && contextLost && (
        <p className="darkroom-msg" role="alert">
          {copy.contextLost}
        </p>
      )}

      <Link href="/graphic-designs" className="darkroom-exit">
        {copy.exit}
      </Link>

      {webgl && !contextLost && <Hud bus={bus} copy={copy} mode={mode} onNext={onNext} />}
    </div>
  );
}
