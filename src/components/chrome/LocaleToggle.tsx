"use client";

import type { Dictionary, Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["en", "it"];

// Persist the choice for a year. Kept at module scope so the cookie write (a
// side effect on the global `document`) stays out of the component body.
function persistLocale(locale: Locale) {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * EN/IT switch for the topbar's left cluster. Two real buttons in the topbar's
 * mono/lowercase register: the active locale reads in `--ink`, the inactive in
 * `--ink-dim` (lifting toward `--ink` on hover/focus). Selecting the inactive
 * locale writes the `locale` cookie and reloads the document — deliberately not
 * `router.refresh()`: a full load re-evaluates the Loader module (resetting its
 * `veilPlayed` flag), so the switch replays the whole first-load ceremony —
 * veil, fill, field bloom, entrance — in the new language, instead of swapping
 * the words in place. The current locale comes down from the server as a prop.
 */
export function LocaleToggle({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Dictionary["locale"];
}) {
  const select = (next: Locale) => {
    if (next === locale) return;
    persistLocale(next);
    window.location.reload();
  };

  return (
    <div className="locale-toggle" role="group" aria-label={labels.label}>
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            className="locale-opt"
            aria-pressed={active}
            aria-label={code === "en" ? labels.en : labels.it}
            onClick={() => select(code)}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
