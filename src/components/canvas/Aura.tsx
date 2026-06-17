"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { AuraMaterial, type AuraMaterialImpl } from "./aura-material";

// AuraMaterial must be extended once; importing for its side effect.
void AuraMaterial;

interface AuraProps {
  variant?: "amber" | "ember";
  /** the owning row (or the wash) is open — drive the loop */
  active: boolean;
  reducedMotion: boolean;
  /** fade lerp rate; lower = slower, dreamier (used by the entrance wash) */
  fadeSpeed?: number;
  /**
   * Element whose live box gives the aspect ratio. drei's per-view size is
   * captured at mount (when the reveal is collapsed), so we read the DOM
   * directly each frame instead. Falls back to the viewport (entrance wash).
   */
  sizeRef?: RefObject<HTMLElement | null>;
  /** desaturate toward the ambient cool-white tint (gate/home field) */
  white?: boolean;
  /** opacity ceiling the fade settles to when active (white field stays faint) */
  maxFade?: number;
  /**
   * Cap the render cadence (ms between frames). 0 = run at the demand loop's
   * natural rate (per-row reveals, brief). The persistent ambient field passes
   * ~30ms so it never drives a continuous 60fps loop on the main thread.
   */
  throttleMs?: number;
  /** multiply the drift rate; >1 makes the noise visibly move while staying slow */
  timeScale?: number;
}

/**
 * The aura, rendered as a fullscreen triangle inside whichever <View> hosts it.
 * Render-on-demand: u_time + u_fade advance only while active (or while the
 * fade is still settling), each frame requesting the next via invalidate()
 * (optionally throttled). Under reduced motion it paints a single static frame
 * and never loops.
 */
export function Aura({
  variant = "amber",
  active,
  reducedMotion,
  fadeSpeed = 6,
  sizeRef,
  white = false,
  maxFade = 1,
  throttleMs = 0,
  timeScale = 1,
}: AuraProps) {
  const matRef = useRef<AuraMaterialImpl>(null);
  const invalidate = useThree((s) => s.invalidate);
  const nextTimer = useRef<number | null>(null);

  // Fullscreen triangle in clip space (one tiny geometry per Aura instance).
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
        3,
      ),
    );
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Request the next frame, capping cadence to throttleMs when set. A single
  // pending timer at a time keeps the chain from compounding.
  const requestNext = useCallback(() => {
    if (throttleMs <= 0) {
      invalidate();
      return;
    }
    if (nextTimer.current != null) return;
    nextTimer.current = window.setTimeout(() => {
      nextTimer.current = null;
      invalidate();
    }, throttleMs);
  }, [invalidate, throttleMs]);

  // Kick a frame whenever active flips (the demand loop is otherwise idle).
  useEffect(() => {
    requestNext();
  }, [active, requestNext]);

  // Drop any pending throttle timer on unmount.
  useEffect(
    () => () => {
      if (nextTimer.current != null) window.clearTimeout(nextTimer.current);
    },
    [],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;

    const el = sizeRef?.current;
    const w = Math.max(el ? el.clientWidth : window.innerWidth, 1);
    const h = Math.max(el ? el.clientHeight : window.innerHeight, 1);
    m.uniforms.u_res.value.set(w, h); // only the ratio is used by the shader
    m.uniforms.u_cool.value = variant === "ember" ? 1 : 0;
    m.uniforms.u_white.value = white ? 1 : 0;

    const target = active ? maxFade : 0;

    if (reducedMotion) {
      // Single static frame: snap fade, hold time, never re-invalidate.
      m.uniforms.u_fade.value = target;
      return;
    }

    const d = Math.min(1, delta * fadeSpeed);
    m.uniforms.u_fade.value += (target - m.uniforms.u_fade.value) * d;
    if (active) m.uniforms.u_time.value += delta * timeScale;

    // Keep the loop alive while open or while the fade-out completes.
    if (active || m.uniforms.u_fade.value > 0.003) {
      requestNext();
    }
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <auraMaterial
        ref={matRef}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
