"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";
import { registerGsap, FIELD_EASE } from "@/lib/motion";
import { hasVeilPlayed, markVeilPlayed } from "@/lib/veil";
import { fieldBooting, onFieldBoot } from "@/components/canvas/field-boot";

// Crossfade (s) of the veil out onto the live field once the bar fills.
const FADE = 0.5;
// The navigation sweep (s): veil up, one uninterrupted fill, veil down. Short on
// purpose — the deliberate first-load beat is a front door, not a toll to pay on
// every click — but never skipped, so the veil reads as the site's one transition.
// Since every page is prerendered and prefetched, the route is almost always in
// by the time the bar fills, so the sweep is the whole cost of a click: ~0.44s
// (was ~0.7s, 2026-10-01). A route still streaming parks it at the full bar.
const NAV_IN = 0.1;
const NAV_FILL = 0.24;
const NAV_OUT = 0.2;
// Hard ceiling (ms) — dismiss the veil even if GSAP never runs (chunk failure,
// CustomEase missing, etc.). Comfortably past the full fill + fade (~1.35s).
// A CSS-only `veil-out` in globals.css backs even this up, for the case where
// no JS runs at all.
const SAFETY_MS = 2000;
// How long (ms) a full fill may wait for the page (and, on a first load, for
// the field's first frame) before the veil lifts anyway.
// Counted from the moment the fill parks, not from mount: (site)/loading.tsx's
// fallback is the only thing it can be waiting on, and a page that has not
// streamed in by then is better shown as it arrives than kept behind a veil.
// Sized so the whole beat stays under the 4 s CSS fail-safe.
const VEIL_HOLD_MS = 2400;
// The field is waited for only until this point of the page load (ms since
// navigation start, `performance.now()`): past it the bar resumes without it,
// so the scripted reveal still lands before the CSS `veil-out` fail-safe (4 s)
// would hide the veil on its own. A connection that slow gets the old
// behaviour — the field blooms in after the reveal — rather than a veil that
// vanishes under a page still locked as loading.
const FIELD_WAIT_UNTIL_MS = 3500;
// Once a fill resumes from a hold, how far (ms) the safety dismissal is pushed
// back so the scripted last segment + fade can finish instead of being snapped.
const SAFETY_AFTER_HOLD_MS = 1500;


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
 * Is the real page in the DOM? Under the (site) layout `#main` wraps either the
 * route's page or, while it streams, (site)/loading.tsx's near-empty fallback
 * (`aria-busy="true"`, 60vh of nothing). "Lifts once the real page has
 * streamed in" is only true if the veil waits for the former.
 */
function pageReady(): boolean {
  const main = document.getElementById("main");
  return (
    !!main &&
    main.children.length > 0 &&
    !main.querySelector('[aria-busy="true"]')
  );
}

/**
 * A pause in `tl` that lasts until the page is in the DOM — and, with
 * `waitField`, until the WebGL field has drawn its first frame (field-boot.ts;
 * no later than FIELD_WAIT_UNTIL_MS) — or `maxMs`. Placed with
 * `.add(hold.start)`: when the playhead gets there and both are already in,
 * nothing happens and the beat is unchanged; otherwise the timeline pauses, and
 * a MutationObserver on `#main` plus the field's own signal play it on the
 * moment the last one lands. `onChange` reports the hold so the safety
 * dismissal can stand aside while it runs; `cancel` is for a navigation that
 * interrupts the sweep (or a StrictMode re-run) — it reports the hold over
 * without playing.
 */
function holdForPage(
  tl: gsap.core.Timeline,
  maxMs: number,
  onChange: (holding: boolean) => void,
  waitField = false,
) {
  let holding = false;
  let observer: MutationObserver | null = null;
  let unsubscribe: (() => void) | null = null;
  let timer = 0;
  let deadline = 0;
  const fieldPending = () =>
    waitField && fieldBooting() && performance.now() < FIELD_WAIT_UNTIL_MS;
  const ready = () => pageReady() && !fieldPending();
  const cancel = () => {
    observer?.disconnect();
    observer = null;
    unsubscribe?.();
    unsubscribe = null;
    window.clearTimeout(timer);
    window.clearTimeout(deadline);
    if (holding) {
      holding = false;
      onChange(false);
    }
  };
  const resume = () => {
    if (!holding) return;
    cancel();
    tl.play();
  };
  const check = () => {
    if (ready()) resume();
  };
  const start = () => {
    const main = document.getElementById("main");
    if (!main || ready()) return;
    tl.pause();
    holding = true;
    onChange(true);
    observer = new MutationObserver(check);
    observer.observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-busy"],
    });
    if (waitField) {
      unsubscribe = onFieldBoot(check);
      deadline = window.setTimeout(
        check,
        Math.max(0, FIELD_WAIT_UNTIL_MS - performance.now()),
      );
    }
    timer = window.setTimeout(resume, maxMs);
  };
  return { start, cancel };
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
  // The navigation sweep's 0→100 fill, kept across sweeps so an interrupted
  // one can hand its progress to the next.
  const navProg = useRef({ v: 0 });
  // The page-hold on the current timeline, if any (see `holdForPage`), whether
  // it is in progress, and the safety dismissal — its timer and its function —
  // so a hold can stand it aside and, on resuming, push it back.
  const holdRef = useRef<ReturnType<typeof holdForPage> | null>(null);
  const holdingRef = useRef(false);
  const safetyRef = useRef(0);
  const dismissRef = useRef<(() => void) | null>(null);
  const onHold = useCallback((holding: boolean) => {
    holdingRef.current = holding;
    // Resuming with the safety armed: give the scripted fade room to finish.
    if (!holding && safetyRef.current) {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = window.setTimeout(() => {
        dismissRef.current?.();
      }, SAFETY_AFTER_HOLD_MS);
    }
  }, []);

  // Reveal the home: unlock scroll + fire the site entrance. Idempotent.
  const reveal = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markVeilPlayed();
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
      // lib/veil.ts).
      holdRef.current?.cancel();
      if (hasVeilPlayed()) {
        reveal();
        // Even the fast dissolve waits for the page: back from a demo the
        // (site) route may still be streaming behind its fallback.
        const fast = gsap.timeline();
        const hold = holdForPage(fast, VEIL_HOLD_MS, onHold);
        holdRef.current = hold;
        fast.add(hold.start).to(root, {
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

      const tl = gsap.timeline({ onUpdate: paint });
      // The full veil also waits for the field: this is the one moment it can
      // boot unseen (see field-boot.ts and AppProvider's early mount).
      const hold = holdForPage(tl, VEIL_HOLD_MS, onHold, true);
      holdRef.current = hold;
      tl
        // Quick off the line, then two deliberate hesitations before settling —
        // the "stall" cadence that reads as a real load buying time.
        // Halved from the original cadence: 1.68s of invented progress was
        // charged on top of the real hydration cost before the site could be
        // touched. Same four beats, same hesitations, ~0.85s.
        .to(prog, { v: 34, duration: 0.18, ease: "power2.out" })
        .to(prog, { v: 58, duration: 0.18, ease: "power1.inOut" }, "+=0.06")
        .to(prog, { v: 82, duration: 0.16, ease: "power1.inOut" }, "+=0.05")
        // The page — and the field's first frame — have to be in before the
        // bar completes: on a slow connection this is where the fill parks
        // (see `holdForPage`), with the bar still, so three's evaluation and
        // the shader compile stall nothing on screen; the last segment plays
        // as they land. Nothing happens when both are already there.
        .add(hold.start)
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
  // has streamed in behind it — literally: the sweep holds at the full bar
  // until `#main` carries the page rather than that fallback (`holdForPage`).
  //
  // No scroll lock, unlike the first load: the router resets the scroll itself,
  // and freezing the page for the length of a sweep is worse than not covering
  // it.
  //
  // One sweep at a time. A plain layout effect rather than useGSAP: with
  // dependencies and no `revertOnUpdate`, useGSAP never reverts between runs,
  // so a second click stacked a second timeline on the same veil (it flickered
  // back up mid-fade). Reverting instead would snap the veil to its pre-sweep
  // state and fade it in again. So the cleanup *kills* the in-flight sweep and
  // the next one takes the veil from wherever it was left.
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const prev = prevPath.current;
    prevPath.current = pathname;
    // Mount (prev === null), or a re-run that isn't a route change at all.
    if (prev === null || prev === pathname) return;
    // The first load's own timeline still owns the veil until it has revealed
    // the page; only after that does a sweep make sense.
    if (!hasVeilPlayed()) return;

    const root = rootRef.current;
    const fill = fillRef.current;
    const count = countRef.current;
    if (!root || !fill || !count) return;
    registerGsap();

    // A finished fill starts over; one cut short by this navigation carries on
    // from where it is, so the bar never jumps back under a visible veil.
    const prog = navProg.current;
    if (prog.v >= 100) prog.v = 0;
    const paint = () => {
      fill.style.transform = `scaleX(${prog.v / 100})`;
      count.textContent = String(Math.round(prog.v)).padStart(3, "0");
    };
    paint();
    // Re-assert both, in case a sweep somehow lands before the first load's
    // timeline has parked the veil — and take the veil off that timeline's
    // fade if it is still running. Idempotent.
    park(root);
    gsap.killTweensOf(root);
    holdRef.current?.cancel();

    const tl = gsap.timeline({ onUpdate: paint });
    const hold = holdForPage(tl, VEIL_HOLD_MS, onHold);
    holdRef.current = hold;
    tl.to(root, { autoAlpha: 1, duration: NAV_IN, ease: FIELD_EASE })
      // Together with the fade-in, so the bar is already moving as the veil
      // arrives — a single gesture rather than fade-then-fill.
      .to(prog, { v: 100, duration: NAV_FILL, ease: FIELD_EASE }, 0)
      // Full bar, veil up: if the route is still streaming behind its
      // fallback, wait here for it (see `holdForPage`).
      .add(hold.start)
      .to(root, { autoAlpha: 0, duration: NAV_OUT, ease: FIELD_EASE });
    return () => {
      hold.cancel();
      tl.kill();
    };
    // `onHold` is a stable useCallback([]); listed so the effect's inputs are
    // complete without ever re-running it on its account.
  }, [pathname, reducedMotion, onHold]);

  // Lock scroll while the veil is up, and arm the safety dismissal. The lock is
  // released by `reveal()` (and on cleanup); the safety timeout force-dismisses
  // the veil if GSAP never completed it.
  //
  // Only when the full veil is actually going to play. A remount within the
  // page load (back from a demo) takes the fast path above, which has already
  // called `reveal()` from its layout effect by the time this passive effect
  // runs: locking here would add `loading` *after* its only release, and the
  // safety timer would see `doneRef` set and leave it on for good.
  useEffect(() => {
    if (reducedMotion || hasVeilPlayed()) return;
    const root = document.documentElement;
    root.classList.add("loading");
    const dismiss = () => {
      if (doneRef.current) return;
      // The fill is holding for the page (bounded — see `holdForPage`); its
      // own ceiling plays the timeline on, and that re-arms this. Stand aside.
      if (holdingRef.current) return;
      reveal();
      const el = rootRef.current;
      if (el) {
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        park(el);
      }
    };
    dismissRef.current = dismiss;
    safetyRef.current = window.setTimeout(dismiss, SAFETY_MS);
    return () => {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = 0;
      dismissRef.current = null;
      root.classList.remove("loading");
    };
  }, [reducedMotion, reveal]);

  // Rendered whatever the motion setting: under reduced motion CSS hides it
  // (`.loader { display: none }` in the `reduce` block) and AppProvider has
  // already entered. Not `return null` there — the server renders it (the flag
  // is false on the server), so a client that skipped it would leave an orphan
  // veil in the body that React never claims, right where its sibling markup
  // is reconciled.
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
