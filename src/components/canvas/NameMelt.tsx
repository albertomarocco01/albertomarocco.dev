"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/components/providers/AppProvider";

// Client-only, code-split: the melt (and its three/drei imports) rides the same
// deferred path as the field — never in the hero's LCP-critical chunk.
const NameMeltView = dynamic(
  () => import("./NameMeltView").then((m) => m.NameMeltView),
  { ssr: false },
);

/**
 * Gate for the h1 liquid-melt overlay (NameMeltView). Mounts only when the
 * shared WebGL field is allowed to exist (past first paint + idle, no reduced
 * motion — the same gates as FieldMount). Mouse and finger alike: the view
 * listens to both (see NameMeltView), so there is no pointer-type gate here.
 * Server/first paint render null, so hydration is clean and LCP never sees any
 * of this.
 */
export function NameMelt() {
  const { fieldReady, reducedMotion } = useApp();
  if (!fieldReady || reducedMotion) return null;
  return <NameMeltView />;
}
