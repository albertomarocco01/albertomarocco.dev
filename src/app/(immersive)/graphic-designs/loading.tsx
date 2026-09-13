import { LOADER_TAG } from "@/lib/boundary-copy";
import { getLocale } from "@/lib/i18n";

/**
 * Enables partial prefetching for the five demo routes under /graphic-designs/*
 * (see (site)/loading.tsx for why they are dynamic). Also covers the real gap
 * here: these pages mount a WebGL canvas and, for Tarassaco and Mani, the
 * MediaPipe wasm + model, so there is a genuine wait to fill with something
 * other than white.
 *
 * A Server Component that reads the locale cookie: the word is right from the
 * first byte. It used to be a Client Component reading `<html lang>` after
 * hydration, which server-rendered "caricamento" for everyone and swapped it
 * to "loading" a beat later for EN visitors. The whole tree is dynamic anyway
 * (the root layout awaits `cookies()`), so a prefetch already runs request-time
 * code and still carries this fallback — verified on the dev server with an
 * `RSC: 1` + `Next-Router-Prefetch: 1` request.
 */
export default async function DemoLoading() {
  const locale = await getLocale();
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
        fontFamily: "var(--mono)",
        fontSize: "0.72rem",
        letterSpacing: "0.24em",
        textTransform: "lowercase",
        opacity: 0.5,
      }}
    >
      {LOADER_TAG[locale]}
    </div>
  );
}
