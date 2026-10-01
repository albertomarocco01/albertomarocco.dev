import { useCallback, useEffect, useState } from "react";
import { Canvas, type Frameloop, type RootState } from "@react-three/fiber";
import type { WebGLRenderer } from "three";
import { isSoftwareRenderer } from "@/lib/webgl-caps";
import type { Tier } from "../darkroom.config";
import { halfFloatRenderable, type DarkroomCapabilities } from "./darkroom-engine";
import { DarkroomScene } from "./DarkroomScene";
import type { DarkroomMode, TrayBus } from "./tray-bus";

/**
 * The tray's own <Canvas> — not the site's shared one. DPR capped by the tier
 * (1.5 desktop, 1.25 mobile), no antialias (every pass is a fullscreen
 * triangle), no alpha, no depth. The frameloop is owned by App: `never` while
 * the tab is hidden or the mode is still unknown, `demand` in brush mode,
 * `always` for the fluid.
 */
export function DarkroomCanvas({
  bus,
  mode,
  tier,
  frameloop,
  onCapabilities,
  onContextLost,
}: {
  bus: TrayBus;
  mode: DarkroomMode | null;
  tier: Tier;
  frameloop: Frameloop;
  onCapabilities: (caps: DarkroomCapabilities) => void;
  onContextLost: (lost: boolean) => void;
}) {
  const [renderer, setRenderer] = useState<WebGLRenderer | null>(null);
  const onCreated = useCallback(
    ({ gl }: RootState) => {
      setRenderer(gl);
      onCapabilities({ halfFloat: halfFloatRenderable(gl), software: isSoftwareRenderer(gl.getContext()) });
    },
    [onCapabilities],
  );

  // Context loss: without preventDefault the browser drops the context for
  // good; with it the GPU may restore. Meanwhile the chrome shows a message
  // and the exit. An effect, so the listeners leave with the component.
  useEffect(() => {
    if (!renderer) return;
    const canvas = renderer.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      onContextLost(true);
    };
    const onRestored = () => onContextLost(false);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [renderer, onContextLost]);

  return (
    <Canvas
      className="darkroom-canvas"
      style={{ position: "absolute", inset: 0 }}
      // a window drag fires resizes every frame; each one rebuilds the fluid
      // targets and remaps the exposure, so settle first
      resize={{ debounce: { resize: 100, scroll: 50 } }}
      dpr={[1, tier.dpr]}
      frameloop={frameloop}
      flat
      gl={{
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      onCreated={onCreated}
    >
      {mode && <DarkroomScene bus={bus} mode={mode} tier={tier} />}
    </Canvas>
  );
}
