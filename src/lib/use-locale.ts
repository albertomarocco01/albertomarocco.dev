"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locale";

const noopSubscribe = () => () => {};

/** Server / hydration snapshot — the same fallback `getLocale()` uses. */
const serverSnapshot = (): Locale => DEFAULT_LOCALE;

/**
 * `<html lang>`, which the root layout has already rendered from the `locale`
 * cookie. Reading the resolved attribute rather than re-parsing the cookie means
 * the client can never disagree with what the server decided.
 */
const clientSnapshot = (): Locale => {
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
};

/**
 * The active locale, for the two error boundaries — Client Components that Next
 * hands no props, so they can't be given a dictionary from the server.
 *
 * `useSyncExternalStore` with a distinct server snapshot is the documented
 * hydration-safe way to read a browser-only value: React renders
 * DEFAULT_LOCALE on the server and through hydration, then re-renders with the
 * real one. Same pattern as BubbleControls' opt-in gate — no mismatch warning.
 */
export function useLocale(): Locale {
  return useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
}
