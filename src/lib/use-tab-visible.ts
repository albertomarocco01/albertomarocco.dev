import { useSyncExternalStore } from "react";

/**
 * Whether the tab can be seen, shared by the immersive demos: their frameloops
 * run only while it can (a hidden tab renders nothing, and every loop they own
 * pauses with it).
 */
const subscribe = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};
const getSnapshot = () => document.visibilityState === "visible";
const getServerSnapshot = () => true;

export function useTabVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
