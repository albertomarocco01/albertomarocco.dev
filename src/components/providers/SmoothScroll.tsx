"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Lenis ignores all input while the loading veil is up (Loader's `html.loading`).
 * `overflow: hidden` only stops native scrolling, and Lenis scrolls
 * programmatically: a wheel during the veil used to reveal the page already
 * scrolled. Not `data-lenis-prevent` on <body>: HomeSequence owns that attribute
 * on the home, and the veil releasing it would strip the home's own lock. A
 * prevented event returns before Lenis calls `preventDefault`, so pinch-zoom
 * survives (unlike `lenis.stop()`). Module scope because ReactLenis re-creates
 * the instance whenever the JSON of its options changes — a function is not
 * part of that key either way.
 */
const whileVeiled = () =>
  document.documentElement.classList.contains("loading");

/**
 * Lenis smooth scroll mounted once at the root and driven by the GSAP ticker,
 * so scroll-coupled animations stay in lockstep with the scroll position.
 * Disabled under reduced motion (native scroll).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const { reducedMotion } = useApp();
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    if (reducedMotion) return;
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
    };
  }, [reducedMotion]);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      autoRaf={false}
      options={{
        // 0.1 takes ~370ms to settle each wheel notch, which reads as lag
        // rather than smoothness. 0.18 keeps the easing but halves the delay.
        lerp: reducedMotion ? 1 : 0.18,
        smoothWheel: !reducedMotion,
        syncTouch: false,
        prevent: whileVeiled,
      }}
    >
      {children}
    </ReactLenis>
  );
}
