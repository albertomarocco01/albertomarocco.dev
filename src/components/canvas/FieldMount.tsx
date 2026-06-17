"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/components/providers/AppProvider";

// Client-only, code-split: three/r3f never enter the initial chunk.
const Field = dynamic(() => import("./Field").then((m) => m.Field), {
  ssr: false,
});

/**
 * Mounts the shared WebGL field once the app is entered and idle. Under reduced
 * motion we skip WebGL entirely (no GPU work, no animation) — gen rows fall back
 * to their designed static amber plate.
 */
export function FieldMount() {
  const { fieldReady, reducedMotion } = useApp();
  if (reducedMotion || !fieldReady) return null;
  return <Field />;
}
