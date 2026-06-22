"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/components/providers/AppProvider";

// Client-only, code-split: three/r3f never enter the initial chunk.
const Field = dynamic(() => import("./Field").then((m) => m.Field), {
  ssr: false,
});

/**
 * Mounts the shared WebGL field on the client as early as possible. The intro
 * veil covers the (static, server-rendered) hero during load, so mounting the
 * field immediately doesn't cost the hero's first paint — and the sooner the
 * canvas is live, the sooner the ambient bubbles play on the dark loading
 * screen. The field reports back via markFieldReady once it has painted, which
 * is what gates the gen rows and the intro lift (see AppProvider). Under reduced
 * motion we skip WebGL entirely — gen rows fall back to their static amber plate.
 */
export function FieldMount() {
  const { reducedMotion } = useApp();
  if (reducedMotion) return null;
  return <Field />;
}
