"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Custom cursor: a dot that snaps to the pointer + a ring that lags behind
 * (lerp 0.16) and grows over interactive elements. Disabled on touch and
 * under reduced motion (the CSS hides it; the effect also bails early).
 */
export function Cursor() {
  const { reducedMotion } = useApp();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    // Both marks start centered so the dot doesn't sit in the top-left corner
    // until the first pointer move (the ring was already centered, the dot wasn't).
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      // Wake the ring loop only when the pointer actually moves. At rest the loop
      // stays parked, so the main thread is free — interactions paint sooner (INP).
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      // Once the ring has caught up, stop re-arming. onMove restarts us on the
      // next move — no perpetual 60fps style write while the cursor sits still.
      if (Math.abs(mx - rx) < 0.1 && Math.abs(my - ry) < 0.1) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    // Delegate hover detection instead of binding to a snapshot of elements at
    // mount: elements rendered after navigation (e.g. the /graphic-designs rows)
    // would otherwise never grow the ring. pointerover bubbles, so one listener
    // covers everything, present and future.
    const SELECTOR = "a, button, .row, .g-enter";
    const onOver = (e: PointerEvent) => {
      const el = e.target as Element | null;
      ring.classList.toggle("is-hot", !!el?.closest?.(SELECTOR));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
    };
  }, [reducedMotion]);

  return (
    <>
      <div ref={ringRef} className="cur-ring" aria-hidden="true" />
      <div ref={dotRef} className="cur-dot" aria-hidden="true" />
    </>
  );
}
