"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { holdTracking } from "@/lib/track-motion";

/**
 * Driver for /about — three full-height panels (the path, the discipline, the
 * contacts), one input per move. Renders nothing: the panels are static
 * server HTML and this only toggles classes and one custom property
 * (`--panel`) that CSS animates.
 *
 * The page never scrolls. `html.about-live` fixes the stage to the viewport
 * and locks the document (the same shift-free idiom as the home's lock), the
 * panel track translates by whole viewports on the signature ease, and scroll
 * *intent* — a wheel notch, a swipe, a key — is read from listeners the lock
 * has already neutralised and mapped onto "next" or "previous". Exactly one
 * move per gesture: while a move runs every further tick is ignored, and once
 * it settles a trackpad's inertia tail (deltas that only ever shrink, arriving
 * within WHEEL_GAP_MS of each other) is swallowed until a fresh gesture starts.
 *
 * A panel whose content overflows its viewport (a short phone in landscape)
 * scrolls natively inside itself first; paging only happens from the edge it
 * would otherwise have to push past. Touch decides once per gesture, at the
 * threshold, so a swipe that scrolls the panel never also turns the page.
 *
 * Every other way through the page lands somewhere sensible: focus moving
 * into a panel brings that panel up (Tab through the contact links can never
 * land off-screen), the pager buttons jump, `#contact` — the footer's link
 * from every other page, and the CTA on the second panel — opens on the
 * third, and the copy reveal of the first panel waits for `entered` so it
 * composes as the veil lifts rather than under it.
 *
 * One thing the browser would do on its own has to be undone: the stage is
 * `overflow: hidden`, and an overflow-hidden box still scrolls when focus or
 * a hash jump lands inside it — by whole viewports here, under the track's
 * own transform. So the stage is pinned at scrollTop 0 whenever it moves; the
 * transform is the only thing that ever pages.
 *
 * Reduced motion: no lock, no listeners, no class — the CSS scoped to
 * `about-live` collapses to an ordinary three-section document that scrolls.
 * Same for JS off or a broken chunk. The media query is read here as well as
 * taken from AppProvider, whose flag starts false and settles a beat later:
 * without that the driver would mount for that beat, lock the document and
 * scroll it to the top — undoing the browser's own `#contact` jump. The one
 * thing the in-flow page still does is make that jump again once entered.
 */

/** Fewer panels than this and there is nothing to page. */
const MIN_PANELS = 2;
/** Must match `.about-track`'s transition in globals.css. */
const MOVE_MS = 1150;
/** Grace after the move settles before the next intent counts. */
const SETTLE_MS = 180;
/** Wheel travel (px) that reads as one intent — under a single mouse notch. */
const WHEEL_STEP = 40;
/** Silence (ms) that ends a wheel gesture: a longer gap is a new one. */
const WHEEL_GAP_MS = 320;
/** Finger travel (px) that reads as one intent. */
const TOUCH_STEP = 48;
/** deltaMode 1 (lines) → px; 40px ≈ one Chrome wheel notch's worth per 3 lines. */
const LINE_PX = 40;
const HASH_PANEL: Record<string, number> = { "#contact": 2, "#contatti": 2 };

export function AboutSequence() {
  const { entered, reducedMotion } = useApp();
  // The panel the page is on, carried across the effect's re-runs: `entered`
  // flips when the veil lifts (0.4–6 s after mount) and the listeners are live
  // before that, so a wheel notch under the veil must not be undone by the
  // re-run rebuilding the index from the hash and sliding the track back.
  const idxRef = useRef<number | null>(null);

  useEffect(() => {
    const rm =
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm) {
      // In flow: an arrival on `#contact` (the footer's link) has to land on
      // the section, and the browser's own jump can race hydration.
      if (entered && HASH_PANEL[location.hash] != null) {
        document.getElementById("contact")?.scrollIntoView();
      }
      return;
    }
    const stage = document.querySelector<HTMLElement>(".about-stage");
    const track = stage?.querySelector<HTMLElement>(".about-track");
    const panels = Array.from(
      stage?.querySelectorAll<HTMLElement>(".about-panel") ?? [],
    );
    const pager = Array.from(
      stage?.querySelectorAll<HTMLButtonElement>(".about-pager button") ?? [],
    );
    if (!stage || !track || panels.length < MIN_PANELS) return;
    const last = panels.length - 1;

    const root = document.documentElement;
    root.classList.add("about-live");
    // On <body>, not <html>: Lenis slices its own root out of the composedPath
    // before its prevent checks (see HomeSequence).
    document.body.setAttribute("data-lenis-prevent", "");
    // A reload can restore a mid-page scroll position past the lock; park
    // restoration while this owns the viewport (the veil hides the snap).
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const resume = idxRef.current != null;
    let idx = Math.min(idxRef.current ?? HASH_PANEL[location.hash] ?? 0, last);
    idxRef.current = idx;
    let busy = false;
    let pending: number | null = null; // a focus jump asked for mid-move
    let settle: number | null = null;
    let safety: number | null = null;

    // The pin (see the header): the browser's own scroll of the stage, on a
    // focus or a hash jump, is undone before it can paint under the transform.
    const pin = () => {
      if (stage.scrollTop !== 0 || stage.scrollLeft !== 0) stage.scrollTo(0, 0);
    };

    const apply = () => {
      pin();
      track.style.setProperty("--panel", String(idx));
      // The reveal of the copy is what `is-active` drives; on a fresh load it
      // waits for the veil to lift so the words compose in the open, not
      // behind an opaque panel.
      panels.forEach((p, i) => p.classList.toggle("is-active", entered && i === idx));
      pager.forEach((b, i) => {
        if (i === idx) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
    };

    const clearTimers = () => {
      if (settle != null) window.clearTimeout(settle);
      if (safety != null) window.clearTimeout(safety);
      settle = null;
      safety = null;
    };
    const release = () => {
      clearTimers();
      busy = false;
      if (pending != null) {
        const to = pending;
        pending = null;
        go(to);
      }
    };

    // The move. A queued (focus) jump waits for the running move to settle
    // rather than interrupting it; everything else is simply dropped.
    function go(to: number, queue = false) {
      const next = Math.max(0, Math.min(last, to));
      if (busy) {
        if (queue && next !== idx) pending = next;
        return;
      }
      if (next === idx) return;
      idx = next;
      idxRef.current = idx;
      busy = true;
      holdTracking(MOVE_MS + 120); // the GPU figures follow their boxes at full rate
      apply();
      clearTimers();
      safety = window.setTimeout(release, MOVE_MS + SETTLE_MS + 120);
    }
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== track || e.propertyName !== "transform") return;
      clearTimers();
      settle = window.setTimeout(release, SETTLE_MS);
    };

    // Native inner scroll first: a panel taller than the viewport scrolls
    // itself, and only from its edge does the same intent turn the page.
    const panelScrolls = (dir: number) => {
      const p = panels[idx];
      return dir > 0
        ? p.scrollTop + p.clientHeight < p.scrollHeight - 1
        : p.scrollTop > 0;
    };

    // ---- wheel: accumulate to a step, one move per gesture ----
    let acc = 0;
    let lastAt = 0;
    let lastAbs = 0;
    let tail = false; // inside the inertia tail of the gesture that moved us
    const onWheel = (e: WheelEvent) => {
      const px =
        e.deltaMode === 1
          ? e.deltaY * LINE_PX
          : e.deltaMode === 2
            ? e.deltaY * window.innerHeight
            : e.deltaY;
      const now = performance.now();
      const abs = Math.abs(px);
      // A new gesture: a pause, or a delta that *grows* (inertia only decays).
      const fresh = now - lastAt > WHEEL_GAP_MS || abs > lastAbs * 1.5 + 2;
      lastAt = now;
      lastAbs = abs;
      if (busy) {
        tail = true;
        return;
      }
      if (tail) {
        if (!fresh) return;
        tail = false;
      }
      if (fresh) acc = 0;
      acc += px;
      if (Math.abs(acc) < WHEEL_STEP) return;
      const dir = acc > 0 ? 1 : -1;
      acc = 0;
      if (panelScrolls(dir)) return;
      go(idx + dir);
      tail = true;
    };

    // ---- touch: one decision per gesture, at the threshold ----
    let touchY: number | null = null;
    let touchDone = false;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
      touchDone = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null || touchDone || e.touches.length !== 1) return; // pinch — not ours
      const dy = touchY - e.touches[0].clientY;
      if (Math.abs(dy) < TOUCH_STEP) return;
      touchDone = true;
      if (busy) return;
      const dir = dy > 0 ? 1 : -1;
      if (panelScrolls(dir)) return; // the finger is scrolling the panel itself
      go(idx + dir);
    };

    // ---- keys ----
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      // Space on a button is its click; leave it to the button.
      const onControl =
        t instanceof HTMLElement && /^(button|input|textarea|select)$/i.test(t.tagName);
      switch (e.key) {
        case " ":
          if (onControl) return;
          go(idx + (e.shiftKey ? -1 : 1));
          break;
        case "ArrowDown":
        case "PageDown":
          go(idx + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          go(idx - 1);
          break;
        case "End":
          go(last);
          break;
        case "Home":
          go(0);
          break;
      }
    };

    // Focus is the other way through the page and must never land off-screen:
    // into a panel brings that panel up, queued behind any running move.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      const k = panels.findIndex((p) => p.contains(t));
      if (k < 0) return;
      pin(); // focus() scrolled the stage before this fired
      if (k !== idx) go(k, true);
    };
    const onHash = () => {
      pin();
      const k = HASH_PANEL[location.hash];
      if (k != null) go(k, true);
    };
    const pagerClicks = pager.map((b, i) => {
      const fn = () => go(i, true);
      b.addEventListener("click", fn);
      return fn;
    });
    // The CTA on the second panel is a real `#contact` anchor. The browser only
    // fires `hashchange` when the hash actually changes, so after an arrival on
    // /about#contact (or a first click) the link would be inert: page on the
    // click itself. The hash still updates, and a hashchange, if one fires,
    // asks for the same panel (go() is idempotent).
    const onClick = (e: MouseEvent) => {
      const t = e.target;
      const a =
        t instanceof Element ? t.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      if (!a) return;
      const k = HASH_PANEL[a.getAttribute("href") ?? ""];
      if (k != null) go(k, true);
    };

    // A `#contact` load lands on the third panel with no slide: the stage is
    // still under the veil, so the jump is unseen either way. A re-run (the
    // veil lifting) re-applies where it already is and lets a move in flight
    // finish on its own ease.
    if (idx !== 0 && !resume) track.classList.add("no-motion");
    apply();
    if (idx !== 0 && !resume) {
      void track.offsetHeight; // flush the untransitioned position
      track.classList.remove("no-motion");
    }

    stage.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    document.addEventListener("focusin", onFocusIn);
    stage.addEventListener("scroll", pin);
    track.addEventListener("transitionend", onTransitionEnd);

    return () => {
      stage.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("scroll", pin);
      track.removeEventListener("transitionend", onTransitionEnd);
      pager.forEach((b, i) => b.removeEventListener("click", pagerClicks[i]));
      clearTimers();
      root.classList.remove("about-live");
      document.body.removeAttribute("data-lenis-prevent");
      history.scrollRestoration = "auto";
    };
  }, [entered, reducedMotion]);

  return null;
}
