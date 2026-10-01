"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { hasVeilPlayed } from "@/lib/veil";

// Silence THREE.Clock deprecation warnings coming from React Three Fiber (R3F v9).
// Scoped to an effect with a restore, not applied at module scope: patching on
// import meant console.warn was replaced for the life of the tab and never put
// back, so every HMR cycle stacked another wrapper and unrelated three warnings
// stayed swallowed while debugging the WebGL scenes.
function useSilenceClockWarning() {
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      // startsWith, not includes: only three's own prefixed deprecation line.
      if (typeof args[0] === "string" && args[0].startsWith("THREE.Clock")) {
        return;
      }
      originalWarn.apply(console, args);
    };
    return () => {
      console.warn = originalWarn;
    };
  }, []);
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
  // Known on the first client render, hydration included (see the hook), so no
  // consumer ever mounts a motion pass it then has to tear down.
  const reducedMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [fieldReady, setFieldReady] = useState(false);

  useSilenceClockWarning();

  // Reduced motion skips the veil, so the site is entered from the first
  // render. Adjusted during render, not in an effect, for the same reason as
  // above; and latched, so turning the setting off later leaves the site
  // entered instead of hiding the topbar again.
  if (reducedMotion && !entered) setEntered(true);

  // The entrance is driven by the loading veil (Loader): as its fake fill
  // completes it calls `enter()`, so the opening (topbar fade + field bloom, see
  // Shell) plays exactly as the veil dissolves. Under reduced motion `entered`
  // is already set (the veil is skipped), making `enter` a no-op.
  const enter = useCallback(() => setEntered(true), []);

  // Pure insurance: if the loader never reports back (it threw before its own
  // safety timeout could run, say), still reveal the site so it's never stuck
  // behind the veil. Fires well after the loader's own fill + safety window;
  // `setEntered(true)` is idempotent, so the normal path no-ops this.
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 6000);
    return () => window.clearTimeout(id);
  }, []);

  // The hero paints with zero 3D: the WebGL field (and the gen-row aura
  // chunks) only mount after hydration, so 3D is never on the LCP path.
  // Intentionally NOT gated on `entered`.
  //
  // When the full loading veil is about to play, mount right away rather than
  // on idle: the opaque veil is the one moment three's evaluation and the
  // shader compile can run unseen, and the Loader parks its bar until the
  // field's first frame (field-boot.ts). Waiting for idle instead pushed them
  // under the reveal — a stutter as the veil lifted and, on a slow network,
  // the field popping in after its own entrance. Under reduced motion there
  // is no veil, and on a remount (back from a demo) it has already played:
  // there the idle slot still decides.
  useEffect(() => {
    if (fieldReady) return;
    if (!reducedMotion && !hasVeilPlayed()) {
      // The next frame — hydration has committed, nothing else to wait for.
      const id = requestAnimationFrame(() => setFieldReady(true));
      return () => cancelAnimationFrame(id);
    }
    const ric = window.requestIdleCallback as
      | typeof window.requestIdleCallback
      | undefined;
    if (typeof ric === "function") {
      const id = ric(() => setFieldReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setFieldReady(true), 200);
    return () => window.clearTimeout(id);
  }, [fieldReady, reducedMotion]);

  const value = useMemo<AppState>(
    () => ({ entered, enter, reducedMotion, fieldReady }),
    [entered, enter, reducedMotion, fieldReady],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
