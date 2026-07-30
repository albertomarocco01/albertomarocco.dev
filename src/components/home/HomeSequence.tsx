"use client";

import { useCallback, useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Driver for the whole home page — one viewport, three movements, no document
 * scroll at all. Renders nothing: every string is static server HTML (Hero,
 * Teasers, Footer) and this only toggles the classes CSS animates.
 *
 * The home is exactly `100dvh` and the page is locked from hydration onward, so
 * scroll intent never moves anything: wheel / touch / keys are *consumed* and
 * mapped onto a single accumulator, `p`, that spans the whole sequence.
 *
 *   p 0 → 1     movement 1 fires alongside it — the bubble field detonates
 *               (Aura.tsx) and `html.hero-in` plays the eyebrow + the two name
 *               words, an authored beat that needs no input, so the LCP element
 *               never depends on the visitor. Meanwhile p composes the lede word
 *               by word, in a shuffled order, so it reads as a sentence
 *               assembling rather than a line typing.
 *   p 1 → 2     the teaser column composes, 01 → 02 → 03.
 *   p 2 → 2.6   the footer rises as a curtain over the bottom edge of the
 *               viewport (`is-up` at CURTAIN_UP) and lowers again on upward
 *               intent (at CURTAIN_DOWN — the gap is hysteresis, so a jittery
 *               trackpad can't flutter an 0.85s transition).
 *
 * Both composing movements advance on their own AUTO_DELAY_MS after the one
 * before them settles, and input *adds* to that pace instead of replacing it —
 * touching the page can only make it faster, never slower. The curtain has no
 * clock: it only ever moves on real intent, in either direction.
 *
 * `p` is reversible inside a movement and ratchets at 2: once everything is
 * composed it never folds away again, which is also what makes a locale switch
 * safe (the re-rendered spans are covered by `html.hero-done`, which lands at
 * the same moment, rather than by this driver's per-node bookkeeping).
 *
 * Lenis: `data-lenis-prevent` on <body> for as long as this is mounted, so the
 * shared instance ignores the gesture entirely instead of accumulating it. The
 * attribute and the lock are removed in cleanup, which is what hands real
 * document scroll back to /websites, /graphic-designs, /xperiments and /about —
 * they never mount this component and are untouched by it.
 *
 * Escape hatches, in the spirit of Loader's SAFETY_MS. None of them can leave
 * the page stuck, because "escaping" here means *composing everything at once*,
 * not releasing a lock — there is nothing below the fold to release it for:
 *   - reduced motion: no lock, no listeners, everything visible at first paint,
 *     footer in normal flow (the CSS is scoped to `html.home-live`).
 *   - auto-advance: the sequence always finishes itself, unattended.
 *   - focus leaving the hero (skip link, topbar, a teaser) or a pointer on the
 *     topbar: compose immediately — the visitor wants the site, not the show.
 *   - focus entering the footer: raise the curtain, so tabbing to a link can
 *     never land on something off-screen.
 *   - Escape key: compose.
 *   - hard timeout: HARD_MS after mount everything composes unconditionally.
 */

/** Consumed scroll mapped onto one movement, as a fraction of the viewport. */
const SPAN_VH = 0.72;
/** Finger travel is scarcer than wheel travel. */
const TOUCH_MULT = 1.8;
/** deltaMode 1 (lines) → px; 40px ≈ one Chrome wheel notch's worth per 3 lines. */
const LINE_PX = 40;
const KEY_STEP = 0.12; // ArrowDown / ArrowUp
const KEY_PAGE = 0.3; // Space / PageDown / PageUp
const AUTO_DELAY_MS = 1600; // idle beat before a movement starts composing itself
const AUTO_S = 2.2; // auto-advance: seconds to cover one movement
// Unconditional compose, ~1.6× the slowest honest path: the veil (~1.4s) plus
// two idle beats and two movements is ~9s unattended, so this must sit well
// clear of it or it would cut the teasers in halfway through composing.
const HARD_MS = 15000;

/** Movement boundaries on the shared accumulator. */
const P_LEDE = 1; // lede fully composed
const P_COMPOSED = 2; // teasers fully composed — the ratchet floor
const CURTAIN_UP = 2.5;
const CURTAIN_DOWN = 2.3;
const P_MAX = 2.6; // nothing past the raised curtain, so reversing is immediate

/**
 * Has the sequence already composed in this *page load*? Module-scoped,
 * deliberately not sessionStorage: a refresh re-evaluates the module and replays
 * the whole opening (which is the point — the show is the front door), while a
 * client-side return to `/` from another route skips straight to the composed
 * state and keeps only the curtain live. Set in the ratchet, so StrictMode's
 * mount → cleanup → remount still replays.
 */
let composed = false;

export function HomeSequence() {
  const { entered, reducedMotion } = useApp();
  // All transient state lives in refs — the input path never calls setState
  // (same hot-path discipline as Cursor/Shell).
  const p = useRef(0);
  const floor = useRef(0); // ratchet: 0 until composed, P_COMPOSED after
  const words = useRef(0); // lede words currently in
  const tiles = useRef(0); // teasers currently in
  const curtain = useRef(false);
  const timer = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const hard = useRef<number | null>(null);
  // Set by the driver effect; the hard timeout below is armed at mount, before
  // the driver exists, and reaches it through here.
  const jump = useRef<((to: number) => void) | null>(null);

  const compose = useCallback(() => jump.current?.(P_COMPOSED), []);

  // The lock is applied at mount, not at `entered`: the veil's own `loading`
  // lock is released the instant `enter()` fires, and taking over in the same
  // breath leaves no frame in which a wheel tick could move the page.
  useEffect(() => {
    if (reducedMotion) return;
    const root = document.documentElement;
    root.classList.add("home-live");
    // On <body>, not <html>: Lenis slices its own root element (html) out of
    // the composedPath before running the prevent checks, so an attribute on
    // html is invisible to it. body is the highest node it still honours.
    document.body.setAttribute("data-lenis-prevent", "");
    // A reload can restore a mid-page scroll position (UA scrolls bypass
    // overflow: hidden — and Chrome keeps re-applying restoration *after*
    // hydration), which would lock the home with the hero off-screen. Park
    // restoration while this owns the viewport and snap to the top — the veil is
    // still opaque, so both are unseen; Lenis re-syncs from the native scroll
    // event. Cleanup hands restoration, the scroll and Lenis back.
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    hard.current = window.setTimeout(compose, HARD_MS);
    return () => {
      root.classList.remove("home-live", "hero-in", "hero-done");
      document.body.removeAttribute("data-lenis-prevent");
      history.scrollRestoration = "auto";
      if (hard.current != null) window.clearTimeout(hard.current);
      hard.current = null;
    };
  }, [reducedMotion, compose]);

  // The scrub itself — armed once the veil lifts.
  useEffect(() => {
    if (!entered || reducedMotion) return;
    const root = document.documentElement;
    const hero = document.querySelector<HTMLElement>(".hero");
    const foot = document.querySelector<HTMLElement>(".foot.curtain");
    const lede = Array.from(
      document.querySelectorAll<HTMLElement>(".hero .lede .w"),
    );
    const teasers = Array.from(
      document.querySelectorAll<HTMLElement>(".teasers .teaser"),
    );
    // A remount (StrictMode, a locale switch) hands back nodes that may still
    // carry `is-in` from the previous run — and that run drew a different order,
    // so leftovers would read as words stuck at random.
    [...lede, ...teasers].forEach((el) => el.classList.remove("is-in"));
    foot?.classList.remove("is-up");
    words.current = 0;
    tiles.current = 0;
    curtain.current = false;

    // Returning to `/` inside the same page load: skip the show, keep the
    // curtain live. Everything starts composed and the ratchet is already down.
    const replay = !composed;
    p.current = replay ? 0 : P_COMPOSED;
    floor.current = replay ? 0 : P_COMPOSED;
    if (replay) root.classList.add("hero-in");
    else root.classList.add("hero-done");

    // The order the lede composes in: a Fisher–Yates shuffle of the word
    // indices, drawn once and then fixed. Random *order*, not random *timing* —
    // progress still maps 1:1 onto a position in this list, which is what keeps
    // the scrub reversible: scrolling back folds the words away along the same
    // order, reversed, with no incoherent in-between states. Drawn here in an
    // effect and never at render, so the server HTML and the hydrated markup
    // stay identical (and the count follows the locale for free — en and it
    // don't have the same number of words).
    const order = lede.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    // Map the accumulator onto the three movements; only what changed is
    // touched. Reaching P_COMPOSED drops the ratchet and settles everything
    // through `hero-done`, which reveals independently of this bookkeeping.
    const apply = () => {
      const v = p.current;

      const nw = Math.round(Math.min(v, P_LEDE) * lede.length);
      if (nw !== words.current) {
        for (
          let i = Math.min(words.current, nw);
          i < Math.max(words.current, nw);
          i++
        ) {
          lede[order[i]].classList.toggle("is-in", i < nw);
        }
        words.current = nw;
      }

      const nt = Math.round(
        Math.min(Math.max(v - P_LEDE, 0), 1) * teasers.length,
      );
      if (nt !== tiles.current) {
        // Three elements — cheaper to set all of them than to work out which
        // changed, and it self-heals if a class ever drifts.
        teasers.forEach((el, i) => el.classList.toggle("is-in", i < nt));
        tiles.current = nt;
      }

      const up = v >= (curtain.current ? CURTAIN_DOWN : CURTAIN_UP);
      if (up !== curtain.current) {
        curtain.current = up;
        foot?.classList.toggle("is-up", up);
      }

      if (v >= P_COMPOSED && floor.current < P_COMPOSED) {
        floor.current = P_COMPOSED;
        composed = true;
        root.classList.add("hero-done");
      }
    };

    const set = (to: number) => {
      p.current = Math.min(P_MAX, Math.max(floor.current, to));
      apply();
    };
    const step = (dp: number) => set(p.current + dp);
    jump.current = set;

    // Auto-composition. AUTO_DELAY_MS after the veil lifts the lede starts
    // composing on its own at AUTO_S pace; once it lands, the same idle beat
    // runs again and the teasers follow. This is not an idle *window* — input
    // neither cancels the clock nor re-arms it, the listeners call step()
    // directly, so a gesture simply adds to what the clock is contributing. The
    // sequence is never slower than the unattended pace and faster the moment
    // it's touched. Which is really a mobile fix: nobody scrolls in the first
    // second there, and the show has to play regardless.
    let gate = P_LEDE;
    let last = 0;
    const tick = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      step(dt / AUTO_S);
      if (p.current < gate) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      raf.current = null;
      if (gate < P_COMPOSED) {
        gate = P_COMPOSED;
        arm(); // the same beat again before the teasers compose
      }
    };
    // A declaration, not a const: `tick` above calls it to chain the second beat.
    function arm() {
      timer.current = window.setTimeout(() => {
        timer.current = null;
        last = 0;
        raf.current = requestAnimationFrame(tick);
      }, AUTO_DELAY_MS);
    }
    if (replay) arm();

    const span = () => Math.max(window.innerHeight * SPAN_VH, 1);

    // The page cannot move (overflow: hidden) and Lenis ignores the gesture
    // (data-lenis-prevent), so every listener is passive — we only *read* the
    // input the lock has already neutralised. Pinch-zoom stays native.
    const onWheel = (e: WheelEvent) => {
      const px =
        e.deltaMode === 1
          ? e.deltaY * LINE_PX
          : e.deltaMode === 2
            ? e.deltaY * window.innerHeight
            : e.deltaY;
      step(px / span());
    };

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null || e.touches.length !== 1) return; // pinch — not ours
      const y = e.touches[0].clientY;
      step(((touchY - y) * TOUCH_MULT) / span());
      touchY = y;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case " ":
          step(e.shiftKey ? -KEY_PAGE : KEY_PAGE);
          break;
        case "PageDown":
          step(KEY_PAGE);
          break;
        case "PageUp":
          step(-KEY_PAGE);
          break;
        case "ArrowDown":
          step(KEY_STEP);
          break;
        case "ArrowUp":
          step(-KEY_STEP);
          break;
        case "End":
          set(P_MAX);
          break;
        case "Home":
          set(floor.current);
          break;
        case "Escape":
          set(P_COMPOSED);
          break;
      }
    };

    // Focus is the other way through the page, and it must never land on
    // something that isn't on screen: into the footer raises the curtain, and
    // anywhere outside the hero (skip link, topbar, a teaser) composes — the
    // reveal is visual only, every link is in the DOM and tabbable throughout.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (foot?.contains(t)) set(P_MAX);
      else if (!hero?.contains(t)) set(P_COMPOSED);
    };
    // A pointer on the topbar: the visitor wants the site, not the show.
    const topbar = document.querySelector<HTMLElement>(".topbar");

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    topbar?.addEventListener("pointerdown", compose);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      topbar?.removeEventListener("pointerdown", compose);
      if (raf.current != null) cancelAnimationFrame(raf.current);
      if (timer.current != null) window.clearTimeout(timer.current);
      raf.current = null;
      timer.current = null;
      jump.current = null;
      root.classList.remove("hero-in");
    };
  }, [entered, reducedMotion, compose]);

  return null;
}
