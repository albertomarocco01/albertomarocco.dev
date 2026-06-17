"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";

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
        lerp: reducedMotion ? 1 : 0.1,
        smoothWheel: !reducedMotion,
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
