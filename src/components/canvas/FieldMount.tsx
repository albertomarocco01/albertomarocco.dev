"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/components/providers/AppProvider";

// Client-only, code-split: three/r3f never enter the initial chunk.
const Field = dynamic(() => import("./Field").then((m) => m.Field), {
  ssr: false,
});

/** Mounts the shared WebGL field once the app is entered and idle. */
export function FieldMount() {
  const { fieldReady } = useApp();
  if (!fieldReady) return null;
  return <Field />;
}
