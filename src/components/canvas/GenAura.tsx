"use client";

import type { RefObject } from "react";
import { View } from "@react-three/drei";
import { Aura } from "./Aura";
import type { AuraVariant } from "./aura-material";

// Cap the open gen-row aura to ~30fps (mirrors AmbientField's throttleMs). Without
// this the demand loop runs unthrottled at 60fps while a row is open, and drei's
// <View> reads getBoundingClientRect() — a forced synchronous reflow — every one
// of those frames. During native momentum scroll on mobile that reflow lands on
// the scroll's critical path and stutters it. 30fps is imperceptible for the soft
// smoke and halves the reflow cost. Sight-tunable.
const GEN_THROTTLE_MS = 33;

/**
 * A generative row's aura. Outside the canvas, drei's <View> renders and tracks
 * its OWN div, so we let that div (.aura-view) absolutely fill the row's reveal
 * container — drei then scissors the shared canvas to it. As the reveal grows
 * (GSAP height), the scissor grows with it: the wipe. `sizeRef` (the reveal)
 * feeds the live aspect ratio. Loaded as a separate chunk (next/dynamic).
 */
export function GenAura({
  sizeRef,
  variant,
  active,
  reducedMotion,
}: {
  sizeRef: RefObject<HTMLElement | null>;
  variant?: AuraVariant;
  active: boolean;
  reducedMotion: boolean;
}) {
  return (
    <View className="aura-view">
      <Aura
        variant={variant}
        active={active}
        reducedMotion={reducedMotion}
        sizeRef={sizeRef}
        throttleMs={GEN_THROTTLE_MS}
      />
    </View>
  );
}
