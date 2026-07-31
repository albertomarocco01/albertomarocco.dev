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
 *   p 1 → 2     the teaser column enters — a hysteresis toggle like the
 *               curtain's (in past TEASER_IN, out past TEASER_OUT), with the
 *               01 → 02 → 03 stagger left to CSS transition delays. One clean
 *               movement in either direction, never a half-composed column.
 *   p 2 → 2.6   the footer rises as a curtain over the bottom edge of the
 *               viewport (`is-up` at CURTAIN_UP) and lowers again on upward
 *               intent (at CURTAIN_DOWN — the gap is hysteresis, so a jittery
 *               trackpad can't flutter an 0.85s transition).
 *
 * All three movements advance on their own after an idle beat (IDLE_MS, per
 * gate — the curtain waits longer, it is the one step that puts something *over*
 * the page rather than composing what is already there), and forward input
 * *adds* to that pace instead of replacing it: touching the page can only make
 * it faster, never slower. Backward input cancels the running scrub — otherwise
 * the clock would shove back down against the hand — and re-arms the beat from
 * wherever the scrub-back landed. So the whole thing is a loop with no dead
 * ends: scroll up and the teasers fold away, scroll down *or simply wait* and
 * they compose again, at any position, in either direction.
 *
 * `p` is therefore reversible over its whole range. The one thing that ends the
 * loop is an escape hatch (below): it latches the floor at P_COMPOSED and
 * settles every node through `html.hero-done`. That class is also what makes a
 * locale switch safe — the re-rendered spans are revealed by CSS rather than by
 * this driver's per-node bookkeeping — and every way out of this page goes
 * through a hatch (a teaser or the topbar takes focus or a pointerdown first).
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
 *   - hard timeout: HARD_MS after mount, if the sequence never got going at all
 *     (a broken chunk, a dead clock), everything composes unconditionally. It
 *     asks whether the page has *ever* composed, not where `p` is right now — an
 *     unattended page is long past P_COMPOSED by then, and latching a working
 *     sequence mid-scrub would kill the loop under a visitor who is only playing
 *     with it.
 *
 * None of the hatches can move `p` backwards, so none of them can yank a raised
 * curtain back down.
 */

/** Consumed scroll mapped onto one movement, as a fraction of the viewport. */
const SPAN_VH = 0.72;
/** Finger travel is scarcer than wheel travel. */
const TOUCH_MULT = 1.8;
/** deltaMode 1 (lines) → px; 40px ≈ one Chrome wheel notch's worth per 3 lines. */
const LINE_PX = 40;
const KEY_STEP = 0.12; // ArrowDown / ArrowUp
const KEY_PAGE = 0.3; // Space / PageDown / PageUp
const AUTO_S = 2.2; // auto-advance: seconds to cover one movement
// Compose if the sequence never got going, ~1.6× the slowest honest path to
// P_COMPOSED: the veil (~1.4s) plus two idle beats and two movements is ~9s
// unattended, so this must sit well clear of it or it would cut the teasers in
// halfway through composing.
const HARD_MS = 15000;

/** Movement boundaries on the shared accumulator. */
const P_LEDE = 1; // lede fully composed
const P_COMPOSED = 2; // teasers fully composed — where the escape hatches land
/** The teaser column is a curtain-style hysteresis toggle inside [1, 2]: in
 *  crossing TEASER_IN on the way down, out crossing TEASER_OUT on the way up.
 *  The gap keeps a jittery trackpad from fluttering the 0.9s transition. */
const TEASER_IN = 1.5;
const TEASER_OUT = 1.15;
const CURTAIN_UP = 2.5;
const CURTAIN_DOWN = 2.3;
const P_MAX = 2.6; // nothing past the raised curtain, so reversing is immediate

/** What the clock scrubs towards, and the idle beat it waits out first. The
 *  curtain's is longer: composing the page is the show, but drawing the footer
 *  over it is an interruption, and 1.6s of stillness would feel pushy. */
const GATES = [P_LEDE, P_COMPOSED, P_MAX];
const IDLE_MS = [1600, 1600, 2800];
/** Index of the first gate above `v`, or -1 with nothing left to compose. */
const gateAbove = (v: number) => GATES.findIndex((g) => v < g - 1e-3);

/**
 * Has the sequence already composed in this *page load*? Module-scoped,
 * deliberately not sessionStorage: a refresh re-evaluates the module and replays
 * the whole opening (which is the point — the show is the front door), while a
 * client-side return to `/` from another route skips straight to the composed
 * state and keeps only the curtain live. Set in `apply`, so StrictMode's
 * mount → cleanup → remount still replays.
 */
let composed = false;

export function HomeSequence() {
  const { entered, reducedMotion } = useApp();
  // All transient state lives in refs — the input path never calls setState
  // (same hot-path discipline as Cursor/Shell).
  const p = useRef(0);
  const floor = useRef(0); // 0 while the loop is live, P_COMPOSED once latched
  const words = useRef(0); // lede words currently in
  const tiles = useRef(false); // teaser column currently in
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
    // Only if nothing ever drove the page — see the hatch list above. `composed`
    // and not `p`: the check has to ask whether the sequence *ever* worked, not
    // where it happens to be at 15s, or scrubbing back at the wrong moment would
    // be answered by a latch.
    hard.current = window.setTimeout(() => {
      if (!composed) compose();
    }, HARD_MS);
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
    tiles.current = false;
    curtain.current = false;

    // Returning to `/` inside the same page load: skip the show, keep the
    // curtain live. Everything starts composed and already latched.
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
    // touched. Every branch is symmetric — the same crossing that reveals a node
    // folds it away again on the way back.
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

      // The teaser column, as one unit — same stance as the curtain below;
      // the 01 → 02 → 03 stagger is CSS transition delays on `.is-in`.
      const tin = v >= (tiles.current ? TEASER_OUT : TEASER_IN);
      if (tin !== tiles.current) {
        tiles.current = tin;
        teasers.forEach((el) => el.classList.toggle("is-in", tin));
      }

      const up = v >= (curtain.current ? CURTAIN_DOWN : CURTAIN_UP);
      if (up !== curtain.current) {
        curtain.current = up;
        foot?.classList.toggle("is-up", up);
      }

      // Not a ratchet: `p` stays free to fold everything away again. This only
      // records that the show has played once in this page load, so a
      // client-side return to `/` skips it (a link click normally latches
      // through the focusin hatch, but Safari doesn't focus links on click).
      if (v >= P_COMPOSED) composed = true;
    };

    const set = (to: number) => {
      p.current = Math.min(P_MAX, Math.max(floor.current, to));
      apply();
    };
    const step = (dp: number) => set(p.current + dp);

    // Every escape hatch lands here: the visitor wants the site, not the show.
    // The floor comes up so the composition can't fold away any more, and
    // `hero-done` settles every node revealed independently of the per-node
    // bookkeeping (which is what makes a locale switch safe). Forward-only —
    // a hatch must never yank a raised curtain back down. The curtain itself
    // stays live above the floor, so the clock is re-armed for it.
    const latch = (to: number) => {
      floor.current = P_COMPOSED;
      root.classList.add("hero-done");
      set(Math.max(to, p.current));
      arm();
    };
    jump.current = latch;

    // Auto-composition. An idle beat, then a scrub to the next gate at AUTO_S
    // pace, then the same again for the gate after it — the whole sequence
    // plays itself, unattended, all the way to the raised curtain.
    //
    // Forward input is *not* an idle window: it neither cancels the clock nor
    // re-arms it, the listeners add to `p` directly, so a gesture simply adds to
    // what the clock is contributing. The sequence is never slower than the
    // unattended pace and faster the moment it's touched — really a mobile fix,
    // nobody scrolls in the first second there and the show has to play anyway.
    //
    // Backward input is: it stops the scrub (a clock pushing down while the hand
    // pulls up is a fight, and the hand wins nothing) and re-arms from where the
    // scrub-back landed, so the beat is always the *last* thing that happened.
    let goal = 0; // index in GATES the running scrub is heading for
    let last = 0;
    const stopAuto = () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      if (timer.current != null) window.clearTimeout(timer.current);
      raf.current = null;
      timer.current = null;
    };
    const tick = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      step(dt / AUTO_S);
      if (p.current < GATES[goal]) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      raf.current = null;
      arm(); // the next gate, after its own beat
    };
    // A declaration, not a const: `latch` and `tick` above both call it.
    function arm() {
      stopAuto();
      const g = gateAbove(p.current);
      if (g < 0) return; // curtain up, nothing left to advance
      goal = g;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        last = 0;
        raf.current = requestAnimationFrame(tick);
      }, IDLE_MS[g]);
    }
    // Armed on a return visit too: the show is skipped, but the curtain is live
    // and rises on its own like everywhere else.
    arm();

    // Real intent, as opposed to the clock's — the only path that re-arms.
    const input = (dp: number) => {
      step(dp);
      if (dp < 0) arm();
    };

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
      input(px / span());
    };

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null || e.touches.length !== 1) return; // pinch — not ours
      const y = e.touches[0].clientY;
      input(((touchY - y) * TOUCH_MULT) / span());
      touchY = y;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case " ":
          input(e.shiftKey ? -KEY_PAGE : KEY_PAGE);
          break;
        case "PageDown":
          input(KEY_PAGE);
          break;
        case "PageUp":
          input(-KEY_PAGE);
          break;
        case "ArrowDown":
          input(KEY_STEP);
          break;
        case "ArrowUp":
          input(-KEY_STEP);
          break;
        case "End":
          latch(P_MAX);
          break;
        case "Home":
          // Back to the start of the loop — and the beat starts over with it.
          set(floor.current);
          arm();
          break;
        case "Escape":
          latch(P_COMPOSED);
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
      if (foot?.contains(t)) latch(P_MAX);
      else if (!hero?.contains(t)) latch(P_COMPOSED);
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
      stopAuto();
      jump.current = null;
      root.classList.remove("hero-in");
    };
  }, [entered, reducedMotion, compose]);

  return null;
}
