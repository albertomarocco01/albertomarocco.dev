import { useSyncExternalStore } from "react";

/**
 * The OS "reduce motion" setting, live, shared by the immersive demos. Read
 * synchronously on the first client render (their trees are client-only) so a
 * cheap path can be chosen before anything mounts — no frame of motion for a
 * visitor who asked for none. The site chrome keeps its own flag in AppProvider
 * (see [[about-driver-gotchas]] in the memory notes for why it settles late).
 */
const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const getSnapshot = () =>
  typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
