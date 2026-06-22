"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Silence THREE.Clock deprecation warnings coming from React Three Fiber (R3F v9)
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("THREE.Clock")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Minimum time the dark intro veil is held before it may lift, so the entrance
// always reads as a deliberate loading beat even when the field mounts fast.
const INTRO_MIN_MS = 1400;

interface AppState {
  /** the entrance has played — auto-triggered on mount (immediate under reduced motion) */
  entered: boolean;
  /** user prefers reduced motion — no shader loop, no entrance, no cursor */
  reducedMotion: boolean;
  /**
   * The WebGL field has mounted and painted a visible frame (the ambient white
   * bubbles are actually on screen). Reported by the field itself via
   * `markFieldReady`. Gates the gen-row aura chunks (don't reveal a <View> until
   * the shared canvas is proven live) and the intro veil's lift.
   */
  fieldReady: boolean;
  /** Called by the WebGL field once it has painted a visible frame. */
  markFieldReady: () => void;
  /**
   * The intro veil has lifted: the dark loading screen is done. True immediately
   * under reduced motion (the intro never shows). Otherwise flips once BOTH
   * INTRO_MIN_MS has elapsed AND fieldReady (the WebGL bubbles have mounted and
   * painted), so the veil only lifts onto a live field.
   */
  introDone: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fieldReady, setFieldReady] = useState(false);
  // The INTRO_MIN_MS hold has elapsed. Paired with fieldReady below to lift the
  // veil. Forced true under reduced motion (the intro is skipped entirely).
  const [minElapsed, setMinElapsed] = useState(false);

  // Detect reduced-motion on mount; if set, enter immediately (no entrance) and
  // satisfy the intro's min-time gate so the veil never shows.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) {
        setEntered(true);
        setMinElapsed(true);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Hold the intro veil for at least INTRO_MIN_MS so the loading beat always
  // reads, then let fieldReady decide when it may actually lift.
  useEffect(() => {
    const id = window.setTimeout(() => setMinElapsed(true), INTRO_MIN_MS);
    return () => window.clearTimeout(id);
  }, []);

  // Auto-play the entrance on load — there's no gate to click anymore. Flip on
  // the next animation frame so the hero has painted as static HTML first; the
  // opening (topbar fade + field bloom, see Shell) then plays over it without
  // ever hiding the hero, so LCP is unaffected. Under reduced motion the effect
  // above already set `entered`, making this a harmless idempotent no-op.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // fieldReady is reported by the field itself (markFieldReady) the moment it has
  // painted a visible frame. The intro veil now covers the hero during load (LCP
  // ≈ the intro duration by design), so the field mounts immediately (FieldMount)
  // rather than waiting for an idle slot — the bubbles are the whole point of the
  // loading screen, so we want them live as early as possible and the veil only
  // ever lifts onto an already-painting field. Idempotent (one-way latch).
  const markFieldReady = useCallback(() => setFieldReady(true), []);

  // The intro is done once the min hold has elapsed AND the field is live (or
  // immediately under reduced motion, where minElapsed was forced true and the
  // field never mounts — so gate the field requirement on motion preference).
  const introDone = minElapsed && (reducedMotion || fieldReady);

  // Mark <html> while the intro is active so CSS can raise the canvas above the
  // veil (bubbles play on the dark loading screen) and drop it back behind the
  // hero once the intro lifts. Removed as soon as introDone.
  useEffect(() => {
    const root = document.documentElement;
    if (introDone) {
      root.classList.remove("intro-playing");
    } else {
      root.classList.add("intro-playing");
    }
    return () => root.classList.remove("intro-playing");
  }, [introDone]);

  const value = useMemo<AppState>(
    () => ({ entered, reducedMotion, fieldReady, markFieldReady, introDone }),
    [entered, reducedMotion, fieldReady, markFieldReady, introDone],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
