// Server-side locale resolution. Every type, dictionary and helper lives in
// ./dictionary.ts (which imports nothing server-only, so client components can
// use it too) and is re-exported here, so `@/lib/i18n` remains the one import
// server components need.

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./dictionary";

export * from "./dictionary";

/**
 * Read the active locale from the `locale` cookie, validated against the
 * supported set and falling back to {@link DEFAULT_LOCALE}. Awaiting
 * `cookies()` (async in this Next.js) opts the route into dynamic rendering —
 * expected and acceptable here.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("locale")?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
