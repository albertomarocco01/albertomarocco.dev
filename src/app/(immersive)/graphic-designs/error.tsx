"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { ERROR_COPY } from "@/lib/boundary-copy";
import { useLocale } from "@/lib/use-locale";

/**
 * Fallback for the immersive demos. These routes are pure WebGL/sensor work
 * with no site chrome around them, so an uncaught throw left a black viewport
 * with no way out. Always offer the way back to the index.
 *
 * Copy that is specific to this boundary lives here (the demos' own copy.ts
 * files are per-demo and this boundary covers all five under
 * /graphic-designs/*); the retry/ref labels come
 * from boundary-copy.ts, the shared dictionary's own strings. See
 * (site)/error.tsx for why the locale is read off `<html lang>` rather than
 * passed in. Unlike loading.tsx this cannot be a Server Component (an error
 * boundary is client-side by definition), but it also never flashes: a
 * boundary's fallback is rendered on the client from scratch, not hydrated, so
 * `useLocale` returns the real value on its first render.
 */
const COPY = {
  en: {
    body: "This demo couldn't start. It needs WebGL, and the camera or microphone where the experience asks for them.",
    back: "← back to the index",
  },
  it: {
    body: "Questa demo non è riuscita a partire. Le serve WebGL, e la fotocamera o il microfono dove l'esperienza li richiede.",
    back: "← torna all'indice",
  },
} as const;

export default function DemoError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const locale = useLocale();
  const copy = COPY[locale];
  const shared = ERROR_COPY[locale];
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.2rem",
        padding: "2rem",
        textAlign: "center",
        background: "#000",
        color: "#e8e4dd",
        fontFamily: "var(--mono)",
        fontSize: "0.82rem",
        lineHeight: 1.7,
        letterSpacing: "0.06em",
      }}
    >
      <p style={{ maxWidth: "34rem", opacity: 0.7 }}>{copy.body}</p>
      <div style={{ display: "flex", gap: "1.6rem" }}>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{ color: "inherit", font: "inherit", letterSpacing: "inherit" }}
        >
          {shared.retry}
        </button>
        <Link href="/graphic-designs" style={{ color: "inherit" }}>
          {copy.back}
        </Link>
      </div>
      {error.digest && (
        <p style={{ opacity: 0.35, fontSize: "0.7rem" }}>
          {shared.ref} {error.digest}
        </p>
      )}
    </main>
  );
}
