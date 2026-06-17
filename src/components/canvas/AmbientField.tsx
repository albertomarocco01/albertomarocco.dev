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
 */
export function AmbientField({ active }: { active: boolean }) {
  return (
    <View className="ambient-track">
      <Aura
        white
        active={active}
        reducedMotion={false}
        maxFade={0.22}
        fadeSpeed={1.4}
        throttleMs={33}
      />
    </View>
  );
}
