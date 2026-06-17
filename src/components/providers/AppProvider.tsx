"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AppState {
  /** the entrance gate has been passed (or skipped under reduced motion) */
  entered: boolean;
  /** pass the gate — fades content in and triggers the canvas wash */
  enter: () => void;
  /** user prefers reduced motion — no shader loop, no gate, no cursor */
  reducedMotion: boolean;
  /** entered AND past requestIdleCallback — safe to mount the WebGL field */
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

  // Detect reduced-motion on mount; if set, skip the gate entirely.
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

  // The hero paints with zero 3D. Only after entry + an idle slot do we let the
  // WebGL field (and the gen-row aura chunks) mount — keeps 3D off the LCP path.
  useEffect(() => {
    if (!entered || fieldReady) return;
    const ric = window.requestIdleCallback as
      | typeof window.requestIdleCallback
      | undefined;
    if (typeof ric === "function") {
      const id = ric(() => setFieldReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setFieldReady(true), 200);
    return () => window.clearTimeout(id);
  }, [entered, fieldReady]);

  // Lock scrolling (and hide the scrollbar) while the entrance gate is shown.
  // The reserved scrollbar gutter (globals.css) keeps this shift-free. Under
  // reduced motion the gate is skipped, so the page is never locked.
  useEffect(() => {
    const locked = !entered && !reducedMotion;
    const root = document.documentElement;
    root.classList.toggle("gate-locked", locked);
    return () => root.classList.remove("gate-locked");
  }, [entered, reducedMotion]);

  const enter = useCallback(() => setEntered(true), []);

  const value = useMemo<AppState>(
    () => ({ entered, enter, reducedMotion, fieldReady }),
    [entered, enter, reducedMotion, fieldReady],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
