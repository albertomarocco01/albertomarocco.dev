// The locale primitives on their own — a few bytes the client-only modules
// (`useLocale`, the error boundaries, the immersive loading fallback) can
// import without pulling both full dictionaries into their chunks. Everything
// here is re-exported by ./dictionary.ts and ./i18n.ts, so server code keeps
// its single import.

export type Locale = "en" | "it";
export const DEFAULT_LOCALE: Locale = "it";

/** Open Graph `og:locale` value per locale. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  it: "it_IT",
};

/** Narrow an arbitrary cookie / `lang` attribute value to a supported locale. */
export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "it";
}
