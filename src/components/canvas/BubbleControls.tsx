"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

// The panel itself is its own chunk (BubblePanel.tsx): a dev tool has no
// business in the bundle every visitor downloads, so only the gate below ships
// with the layout and the UI is fetched the first time it is actually wanted.
const BubblePanel = dynamic(
  () => import("./BubblePanel").then((m) => m.BubblePanel),
  { ssr: false },
);

// Opt-in gate as an external-store snapshot: false on the server and during
// hydration (so SSR/first paint render null with no mismatch), then the real
// client value. Doing it this way — rather than setState-in-effect — keeps the
// component free of cascading-render lint and matches React's intended pattern.
const noopSubscribe = () => () => {};
function tunerEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    new URLSearchParams(window.location.search).has("tune") ||
    window.location.hash === "#tune"
  );
}

/**
 * A tiny live tuner for the ambient white bubble field — the in-house version of
 * the AI-Studio simulator's control panel (see BubblePanel.tsx for the UI).
 *
 * Opt-in so it never shows for visitors: it renders only in `next dev`, or when
 * the URL carries `?tune` (or `#tune`) — e.g. albertomarocco.dev/?tune in prod.
 * Mounted unconditionally in the layout; returns null until it decides it's on,
 * so SSR/first-paint stay null and there's no hydration mismatch.
 */
export function BubbleControls() {
  const enabled = useSyncExternalStore(noopSubscribe, tunerEnabled, () => false);
  if (!enabled) return null;
  return <BubblePanel />;
}
