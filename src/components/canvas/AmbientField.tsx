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
}: {
  active: boolean;
  staticOnly?: boolean;
}) {
  return (
    <View className="ambient-track">
      <Aura
        white
        active={active}
        reducedMotion={staticOnly}
        // Master fade ceiling. Raised (0.5 → 0.7) so the field reads as a clear
        // full-site presence and the controller's `glow` knob has real range up
        // to it. Final alpha = u_fade(≤maxFade) · presence · vignette · glow, so
        // the live `glow` param still dials the actual on-screen opacity down.
        maxFade={0.7}
        fadeSpeed={1.4}
        throttleMs={33}
        timeScale={3.1}
      />
    </View>
  );
}
