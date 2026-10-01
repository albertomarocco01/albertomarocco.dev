import { LOADER_TAG } from "@/lib/boundary-copy";
import { getLocale } from "@/lib/i18n";

/**
 * The streaming fallback for the five demo routes under /graphic-designs/*
 * (see (site)/loading.tsx — the pages are prerendered, so it only shows when a
 * click beats the prefetch). Also covers the real gap here: these pages mount a WebGL canvas and, for Tarassaco and Mani, the
 * MediaPipe wasm + model, so there is a genuine wait to fill with something
 * other than white.
 *
 * A Server Component reading the locale (the `[locale]` root segment): the
 * word is right from the first byte, prerendered once per locale. It used to
 * be a Client Component reading `<html lang>` after hydration, which
 * server-rendered "caricamento" for everyone and swapped it to "loading" a
 * beat later for EN visitors.
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
