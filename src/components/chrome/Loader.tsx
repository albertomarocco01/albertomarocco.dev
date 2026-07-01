"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";
import { registerGsap, FIELD_EASE } from "@/lib/motion";

// Crossfade (s) of the veil out onto the live field once the bar fills.
const FADE = 0.5;
// Hard ceiling (ms) — dismiss the veil even if GSAP never runs (chunk failure,
// CustomEase missing, etc.). Comfortably past the full fill + fade (~2.2s).
const SAFETY_MS = 3020;

/**
 * Loading veil, shown on every load / refresh. A full-viewport opaque void panel
 * (the wordmark + an amber progress bar + a mono counter) that buys a deliberate
 * beat over the real network/hydration cost, then dissolves to reveal the home.
 *
 * It is server-rendered as static HTML, so on slow connections the browser paints
 * it before React has even loaded (it covers the genuine wait), and only once
 * hydrated does GSAP run the fake fill. The fill hesitates on its way to 100 so it
 * reads as an authentic load rather than a uniform sweep; as it completes, `enter()`
 * fires the site entrance (topbar fade + white-field bloom, see Shell) so the
 * signature opening plays *as the veil lifts* rather than wastefully behind it.
 *
 * Never shown under reduced motion (CSS hides it; AppProvider has already entered),
 * and a `<noscript>` rule in the layout hides it when JS is off.
 */
export function Loader({ tag }: { tag: string }) {
  const { reducedMotion, enter } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  // Guards against the entrance firing twice (GSAP completion vs. safety timeout,
  // and StrictMode's double-invoke in dev).
  const doneRef = useRef(false);

  // Reveal the home: unlock scroll + fire the site entrance. Idempotent.
  const reveal = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    document.documentElement.classList.remove("loading");
    enter();
  }, [enter]);

  useGSAP(
    () => {
      if (reducedMotion) return;
      registerGsap();
      const root = rootRef.current;
      const fill = fillRef.current;
      const count = countRef.current;
      if (!root || !fill || !count) return;

      // Drive a single 0→100 proxy; both the bar (scaleX) and the counter read
      // from it each tick, so the number and the fill never drift apart.
      const prog = { v: 0 };
      const paint = () => {
        fill.style.transform = `scaleX(${prog.v / 100})`;
        count.textContent = String(Math.round(prog.v)).padStart(3, "0");
      };
      paint();

      gsap
        .timeline({ onUpdate: paint })
        // Quick off the line, then two deliberate hesitations before settling —
        // the "stall" cadence that reads as a real load buying time.
        .to(prog, { v: 34, duration: 0.36, ease: "power2.out" })
        .to(prog, { v: 58, duration: 0.36, ease: "power1.inOut" }, "+=0.12")
        .to(prog, { v: 82, duration: 0.31, ease: "power1.inOut" }, "+=0.1")
        .to(prog, { v: 100, duration: 0.36, ease: FIELD_EASE }, "+=0.07")
        // Fill is full: reveal the home now, so the topbar fade + field bloom
        // run concurrently with — not after — the veil dissolving.
        .add(reveal)
        .to(root, {
          autoAlpha: 0,
          duration: FADE,
          ease: FIELD_EASE,
          onComplete: () => {
            root.style.pointerEvents = "none";
          },
        });
    },
    { dependencies: [reducedMotion] },
  );

  // Lock scroll while the veil is up, and arm the safety dismissal. The lock is
  // released by `reveal()` (and on cleanup); the safety timeout force-dismisses
  // the veil if GSAP never completed it.
  useEffect(() => {
    if (reducedMotion) return;
    const root = document.documentElement;
    root.classList.add("loading");
    const safety = window.setTimeout(() => {
      if (doneRef.current) return;
      reveal();
      const el = rootRef.current;
      if (el) {
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
      }
    }, SAFETY_MS);
    return () => {
      window.clearTimeout(safety);
      root.classList.remove("loading");
    };
  }, [reducedMotion, reveal]);

  // Reduced motion never shows the veil (AppProvider has already entered).
  if (reducedMotion) return null;

  return (
    <div className="loader" ref={rootRef} aria-hidden="true">
      <p className="loader-name">
        albertomaroccodev<span className="loader-dot">.</span>xyz
      </p>
      <span className="loader-bar">
        <span className="loader-fill" ref={fillRef} />
      </span>
      <span className="loader-meta">
        <span className="loader-tag">{tag}</span>
        <span className="loader-count" ref={countRef}>
          000
        </span>
      </span>
    </div>
  );
}
