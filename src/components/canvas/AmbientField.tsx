"use client";

import { View } from "@react-three/drei";
import { Aura } from "./Aura";

/**
 * The ambient white field — a full-viewport <View> that scissors the whole
 * canvas and renders the desaturated cool-white aura. It sits behind the gate
 * (B1) and persists behind the hero on the home (B2): the same effect, made
 * continuous rather than the old one-shot amber wash.
 *
 * Kept deliberately faint and slow — `white` desaturates the palette, `maxFade`
 * holds the opacity low (quiet background presence, name/CTA stay legible), a
 * gentle `fadeSpeed` eases it in/out, and `throttleMs` caps the loop to ~30fps
 * so it never becomes continuous 60fps main-thread work. The owning Field gates
 * `active` on hero-visibility + tab-visibility, so at rest nothing renders.
 *
 * `staticOnly` (software-rendered WebGL, e.g. SwiftShader / Lighthouse) paints
 * one static frame and never loops — software-rasterizing a fullscreen fbm each
 * frame would be a long main-thread task. On a real GPU the loop runs.
 */
export function AmbientField({
  active,
  staticOnly = false,
  onReady,
}: {
  active: boolean;
  staticOnly?: boolean;
  /** called once the field has painted a visible frame (drives the intro lift) */
  onReady?: () => void;
}) {
  return (
    <View className="ambient-track">
      <Aura
        white
        active={active}
        reducedMotion={staticOnly}
        maxFade={1.0}
        fadeSpeed={2.5}
        throttleMs={33}
        timeScale={3.1}
        onReady={onReady}
      />
    </View>
  );
}
