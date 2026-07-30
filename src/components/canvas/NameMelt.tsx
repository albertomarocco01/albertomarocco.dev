"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useApp } from "@/components/providers/AppProvider";

// Client-only, code-split: the melt (and its three/drei imports) rides the same
// deferred path as the field — never in the hero's LCP-critical chunk.
const NameMeltView = dynamic(
  () => import("./NameMeltView").then((m) => m.NameMeltView),
  { ssr: false },
);

const noopSubscribe = () => () => {};
const hasHover = () => window.matchMedia("(hover: hover)").matches;

/**
 * Gate for the h1 liquid-melt overlay (NameMeltView). Mounts only when the
 * shared WebGL field is allowed to exist (past first paint + idle, no reduced
 * motion — the same gates as FieldMount) and the device actually has a hover
 * pointer: on touch the home's drag gesture already belongs to the intro
 * machine, so the name simply stays static there. Server/first paint render
 * null, so hydration is clean and LCP never sees any of this.
 */
export function NameMelt() {
  const { fieldReady, reducedMotion } = useApp();
  const hover = useSyncExternalStore(noopSubscribe, hasHover, () => false);
  if (!fieldReady || reducedMotion || !hover) return null;
  return <NameMeltView />;
}
