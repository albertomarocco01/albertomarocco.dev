"use client"; // Error boundaries must be Client Components

import Link from "next/link";

/**
 * Fallback for the immersive demos. These routes are pure WebGL/sensor work
 * with no site chrome around them, so an uncaught throw left a black viewport
 * with no way out. Always offer the way back to the index.
 */
export default function XperimentsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
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
        font: "0.82rem/1.7 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        letterSpacing: "0.06em",
      }}
    >
      <p style={{ maxWidth: "34rem", opacity: 0.7 }}>
        This demo couldn&apos;t start. It needs WebGL, and the camera or
        microphone where the experience asks for them.
      </p>
      <div style={{ display: "flex", gap: "1.6rem" }}>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{ color: "inherit", font: "inherit", letterSpacing: "inherit" }}
        >
          ↻ try again
        </button>
        <Link href="/graphic-designs" style={{ color: "inherit" }}>
          ← back to the index
        </Link>
      </div>
      {error.digest && (
        <p style={{ opacity: 0.35, fontSize: "0.7rem" }}>ref {error.digest}</p>
      )}
    </main>
  );
}
