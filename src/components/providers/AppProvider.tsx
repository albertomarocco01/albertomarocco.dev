"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AppState {
  /** the entrance has played — auto-triggered on mount (immediate under reduced motion) */
  entered: boolean;
  /** user prefers reduced motion — no shader loop, no entrance, no cursor */
  reducedMotion: boolean;
  /** past first paint + requestIdleCallback — safe to mount the WebGL field */
  fieldReady: boolean;
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

  // Detect reduced-motion on mount; if set, enter immediately (no entrance).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) setEntered(true);
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
  // readies as soon as the browser is idle.
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

  const value = useMemo<AppState>(
    () => ({ entered, reducedMotion, fieldReady }),
    [entered, reducedMotion, fieldReady],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
