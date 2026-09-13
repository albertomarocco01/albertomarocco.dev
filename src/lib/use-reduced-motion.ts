import { useSyncExternalStore } from "react";

/**
 * The OS "reduce motion" setting, live, shared by the immersive demos and the
 * site chrome (AppProvider). Read synchronously on the first client render so a
 * cheap path can be chosen before anything mounts — no frame of motion for a
 * visitor who asked for none.
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
// `false` on the server, the real value while hydrating. Returning the server's
// `false` there would be corrected by React only in a passive effect *after*
// the children's own effects ran, so every consumer on a server-rendered page
// would first mount in motion mode (veil timeline, locks, Lenis, cursor) and
// tear it down again. Safe because no server-rendered markup branches on the
// flag: the site's WebGL mounts wait for `fieldReady` (false while hydrating)
// and the veil always renders, hidden by CSS. Keep it that way.
const getServerSnapshot = () => typeof window !== "undefined" && getSnapshot();

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
