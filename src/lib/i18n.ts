// Server-side locale resolution. Every type, dictionary and helper lives in
// ./dictionary.ts (which imports nothing server-only, so client components can
// use it too) and is re-exported here, so `@/lib/i18n` remains the one import
// server components need.

import { locale } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./dictionary";

export * from "./dictionary";

/**
 * The active locale: the `[locale]` root segment every page lives under,
 * validated against the supported set and falling back to
 * {@link DEFAULT_LOCALE}. The visitor never sees that segment — src/proxy.ts
 * reads the `locale` cookie and rewrites `/about` to `/it/about` (or `/en/…`)
 * — so the URLs stay cookie-driven while every page is prerendered once per
 * locale. Reading the cookie here instead (`cookies()`) made the whole tree
 * dynamic: every visit and every navigation paid a serverless render.
 */
export async function getLocale(): Promise<Locale> {
  const value = await locale();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
