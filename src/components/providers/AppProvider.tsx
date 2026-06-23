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
  /** the entrance has played — fired by the loading veil as it dissolves
   * (immediate under reduced motion, which skips the veil) */
  entered: boolean;
  /** play the entrance — called once by the loader when its fake fill completes */
  enter: () => void;
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

  // The entrance is driven by the loading veil (Loader): as its fake fill
  // completes it calls `enter()`, so the opening (topbar fade + field bloom, see
  // Shell) plays exactly as the veil dissolves. Under reduced motion the effect
  // above already set `entered` (the veil is skipped), making `enter` a no-op.
  const enter = useCallback(() => setEntered(true), []);

  // Pure insurance: if the loader never reports back (it threw before its own
  // safety timeout could run, say), still reveal the site so it's never stuck
  // behind the veil. Fires well after the loader's own fill + safety window;
  // `setEntered(true)` is idempotent, so the normal path no-ops this.
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 6000);
    return () => window.clearTimeout(id);
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
    () => ({ entered, enter, reducedMotion, fieldReady }),
    [entered, enter, reducedMotion, fieldReady],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
