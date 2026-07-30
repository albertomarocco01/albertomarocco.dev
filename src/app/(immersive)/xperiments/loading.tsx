"use client";

import { getDictionary } from "@/lib/dictionary";
import { useLocale } from "@/lib/use-locale";

/**
 * Enables partial prefetching for the demo routes (see (site)/loading.tsx for
 * why they are dynamic). Also covers the real gap here: these pages mount a
 * WebGL canvas and, for Tarassaco, a 13MB MediaPipe payload, so there is a
 * genuine wait to fill with something other than white.
 *
 * A Client Component, deliberately: reading the cookie with `getLocale()` would
 * make this fallback request-dependent and forfeit the prefetch it exists for.
 * `useLocale` reads the locale off `<html lang>` after hydration instead — the
 * same tag the site veil uses, so the word matches `dict.loader.tag`.
 */
export default function XperimentsLoading() {
  return (
    <div
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#e8e4dd",
        font: "0.72rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        letterSpacing: "0.24em",
        textTransform: "lowercase",
        opacity: 0.5,
      }}
    >
      {getDictionary(useLocale()).loader.tag}
    </div>
  );
}
