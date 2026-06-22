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

interface AppState {
  /** the entrance has played — auto-triggered on mount (immediate under reduced motion) */
  entered: boolean;
  /** user prefers reduced motion — no shader loop, no entrance, no cursor, no intro */
  reducedMotion: boolean;
  /** past first paint + requestIdleCallback — safe to mount the WebGL field */
  fieldReady: boolean;
  /** First-visit only: the intro loader should play (cookie absent, server-decided). */
  showIntro: boolean;
  /**
   * The intro loader has lifted (or never showed). True immediately on repeat
   * visits and under reduced motion. On a first visit it flips when the loader's
   * crossfade begins (Intro calls `markIntroDone`). Gates the Shell entrance so
   * the topbar fade reveals concurrently with the loader dissolving rather than
   * unseen behind it.
   */
  introDone: boolean;
  /** Called by the intro loader as its crossfade begins. */
  markIntroDone: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

export function AppProvider({
  children,
  showIntro,
}: {
  children: React.ReactNode;
  showIntro: boolean;
}) {
  const [entered, setEntered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fieldReady, setFieldReady] = useState(false);
  // Done from the start on repeat visits (no loader to wait for); the loader
  // flips it via markIntroDone on a first visit, and reduced motion forces it.
  const [introDone, setIntroDone] = useState(!showIntro);

  // Detect reduced-motion on mount; if set, enter immediately (no entrance) and
  // mark the intro done so the home shows instantly (the loader never renders).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) {
        setEntered(true);
        setIntroDone(true);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
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

  // The hero paints with zero 3D. Only after first paint + an idle slot do we
  // let the WebGL field (and the gen-row aura chunks) mount — keeps 3D off the
  // LCP path. Intentionally NOT gated on `entered`: the ambient white field
  // readies as soon as the browser is idle (well within the intro's short hold,
  // so the bubbles are live by the time the loader crossfades away).
  useEffect(() => {
    if (fieldReady) return;
    const ric = window.requestIdleCallback as
      | typeof window.requestIdleCallback
      | undefined;
    if (typeof ric === "function") {
      const id = ric(() => setFieldReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setFieldReady(true), 200);
    return () => window.clearTimeout(id);
  }, [fieldReady]);

  const markIntroDone = useCallback(() => setIntroDone(true), []);

  const value = useMemo<AppState>(
    () => ({
      entered,
      reducedMotion,
      fieldReady,
      showIntro,
      introDone,
      markIntroDone,
    }),
    [entered, reducedMotion, fieldReady, showIntro, introDone, markIntroDone],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
