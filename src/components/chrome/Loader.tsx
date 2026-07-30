"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";
import { registerGsap, FIELD_EASE } from "@/lib/motion";

// Crossfade (s) of the veil out onto the live field once the bar fills.
const FADE = 0.5;
// The navigation sweep (s): veil up, one uninterrupted fill, veil down. Short on
// purpose — the deliberate first-load beat is a front door, not a toll to pay on
// every click — but never skipped, so the veil reads as the site's one transition.
const NAV_IN = 0.12;
const NAV_FILL = 0.42;
const NAV_OUT = 0.28;
// Hard ceiling (ms) — dismiss the veil even if GSAP never runs (chunk failure,
// CustomEase missing, etc.). Comfortably past the full fill + fade (~1.35s).
// A CSS-only `veil-out` in globals.css backs even this up, for the case where
// no JS runs at all.
const SAFETY_MS = 2000;

/**
 * Has the veil already played in this *page load*? Module-scoped, deliberately
 * not sessionStorage: the module is re-evaluated on every load, so a refresh
 * always pays the full deliberate opening, while a client-side navigation that
 * remounts this layout (returning from an immersive route) keeps the flag and
 * gets the fast dissolve instead of re-paying the beat. Set inside reveal(),
 * i.e. only once the veil has actually run — StrictMode's mount → cleanup →
 * remount kills the first timeline long before it gets there, so dev still
 * sees the real thing.
 */
let veilPlayed = false;

/**
 * The veil has finished dissolving. Park it — and retire the CSS `veil-out`
 * fail-safe while doing so.
 *
 * That second half is not cosmetic. `veil-out` is declared `forwards`, so once
 * it has run it keeps applying `opacity: 0; visibility: hidden` from the
 * *animation origin*, which outranks every author declaration including inline
 * styles. Left in place it silently wins over GSAP, and the navigation sweep
 * below would run its whole timeline on an element the cascade refuses to show.
 * Cancelling it here is safe by construction: this only runs once the scripted
 * path has actually dismissed the veil, which is the exact thing the fail-safe
 * exists to cover for.
 */
function park(el: HTMLElement) {
  el.style.pointerEvents = "none";
  el.style.animation = "none";
}

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
 * It also plays — short, but always — on every client-side route change, so the
 * veil is the site's single transition rather than a first-load-only flourish.
 * See the second `useGSAP` below.
 *
 * Never shown under reduced motion (CSS hides it; AppProvider has already entered),
 * and a `<noscript>` rule in the layout hides it when JS is off.
 */
export function Loader({ tag }: { tag: string }) {
  const { reducedMotion, enter } = useApp();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  // Guards against the entrance firing twice (GSAP completion vs. safety timeout,
  // and StrictMode's double-invoke in dev).
  const doneRef = useRef(false);
  // Previous route, for the navigation sweep below. `null` means "not navigated
  // yet", which is what separates a real route change from this effect's own
  // first run (and from StrictMode's remount, which keeps the ref).
  const prevPath = useRef<string | null>(null);

  // Reveal the home: unlock scroll + fire the site entrance. Idempotent.
  const reveal = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    veilPlayed = true;
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

      // Every page load pays the full deliberate veil; only a later mount
      // *within* that load — returning from an immersive route remounts this
      // layout — skips to a fast dissolve, so the beat isn't re-paid on
      // navigation. A refresh always gets the whole opening back (see
      // `veilPlayed`).
      if (veilPlayed) {
        reveal();
        gsap.to(root, {
          autoAlpha: 0,
          duration: 0.3,
          ease: FIELD_EASE,
          onComplete: () => park(root),
        });
        return;
      }

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
        // Halved from the original cadence: 1.68s of invented progress was
        // charged on top of the real hydration cost before the site could be
        // touched. Same four beats, same hesitations, ~0.85s.
        .to(prog, { v: 34, duration: 0.18, ease: "power2.out" })
        .to(prog, { v: 58, duration: 0.18, ease: "power1.inOut" }, "+=0.06")
        .to(prog, { v: 82, duration: 0.16, ease: "power1.inOut" }, "+=0.05")
        .to(prog, { v: 100, duration: 0.18, ease: FIELD_EASE }, "+=0.04")
        // Fill is full: reveal the home now, so the topbar fade + field bloom
        // run concurrently with — not after — the veil dissolving.
        .add(reveal)
        .to(root, {
          autoAlpha: 0,
          duration: FADE,
          ease: FIELD_EASE,
          onComplete: () => park(root),
        });
    },
    { dependencies: [reducedMotion] },
  );

  // The same veil, on every client-side route change. The App Router does not
  // remount this layout between (site) routes, so nothing here would fire on its
  // own — the pathname is the signal.
  //
  // The timing lands right by construction: `usePathname()` updates when the
  // transition *commits*, which is the exact moment the route's `loading.tsx`
  // fallback would flash. The veil goes up over it and lifts once the real page
  // has streamed in behind it.
  //
  // No scroll lock, unlike the first load: the router resets the scroll itself,
  // and freezing the page for the length of a sweep is worse than not covering
  // it. useGSAP's scoped context does the rest — a second navigation reverts the
  // in-flight sweep before starting its own, so rapid clicks never stack.
  useGSAP(
    () => {
      if (reducedMotion) return;
      const prev = prevPath.current;
      prevPath.current = pathname;
      // Mount (prev === null), or a re-run that isn't a route change at all.
      if (prev === null || prev === pathname) return;
      // The first load's own timeline still owns the veil until it has revealed
      // the page; only after that does a sweep make sense.
      if (!veilPlayed) return;

      const root = rootRef.current;
      const fill = fillRef.current;
      const count = countRef.current;
      if (!root || !fill || !count) return;
      registerGsap();

      const prog = { v: 0 };
      const paint = () => {
        fill.style.transform = `scaleX(${prog.v / 100})`;
        count.textContent = String(Math.round(prog.v)).padStart(3, "0");
      };
      paint();
      // Re-assert both, in case a sweep somehow lands before the first load's
      // timeline has parked the veil. Idempotent.
      park(root);

      gsap
        .timeline({ onUpdate: paint })
        .to(root, { autoAlpha: 1, duration: NAV_IN, ease: FIELD_EASE })
        // From 0, so the bar is already moving as the veil arrives — a single
        // gesture rather than fade-then-fill.
        .to(prog, { v: 100, duration: NAV_FILL, ease: FIELD_EASE }, 0)
        .to(root, { autoAlpha: 0, duration: NAV_OUT, ease: FIELD_EASE });
    },
    { dependencies: [pathname, reducedMotion] },
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
        park(el);
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
        albertomarocco<span className="loader-dot">.</span>dev
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
