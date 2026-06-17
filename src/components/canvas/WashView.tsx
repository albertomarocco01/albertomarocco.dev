"use client";

import { View } from "@react-three/drei";
import { Aura } from "./Aura";

/**
 * The entrance wash: a full-viewport <View> that scissors the whole canvas and
 * renders a brief amber bloom when `active`, fading in then out (slow fadeSpeed).
 */
export function WashView({ active }: { active: boolean }) {
  return (
    <View className="wash-track">
      <Aura variant="amber" active={active} reducedMotion={false} fadeSpeed={2.4} />
    </View>
  );
}
