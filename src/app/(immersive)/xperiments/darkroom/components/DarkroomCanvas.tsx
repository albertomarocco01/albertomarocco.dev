import { useCallback } from "react";
import { Canvas, type Frameloop, type RootState } from "@react-three/fiber";
import { isSoftwareRenderer } from "@/lib/webgl-caps";
import { halfFloatRenderable, type DarkroomCapabilities } from "./darkroom-engine";
import { DarkroomScene } from "./DarkroomScene";
import type { DarkroomMode, TrayBus } from "./tray-bus";

/**
 * The tray's own <Canvas> — not the site's shared one. DPR capped at 1.5, no
 * antialias (every pass is a fullscreen triangle), no alpha, no depth. The
 * frameloop is owned by App: `never` while the tab is hidden or the mode is
 * still unknown, `demand` in brush mode, `always` for the fluid.
 */
export function DarkroomCanvas({
  bus,
  mode,
  frameloop,
  onCapabilities,
  onContextLost,
}: {
  bus: TrayBus;
  mode: DarkroomMode | null;
  frameloop: Frameloop;
  onCapabilities: (caps: DarkroomCapabilities) => void;
  onContextLost: (lost: boolean) => void;
}) {
  const onCreated = useCallback(
    ({ gl }: RootState) => {
      const canvas = gl.domElement;
      // Without preventDefault the browser drops the context for good; with it
      // the GPU may restore. Meanwhile the chrome shows a message and the exit.
      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        onContextLost(true);
      });
      canvas.addEventListener("webglcontextrestored", () => onContextLost(false));
      onCapabilities({ halfFloat: halfFloatRenderable(gl), software: isSoftwareRenderer(gl.getContext()) });
    },
    [onCapabilities, onContextLost],
  );

  return (
    <Canvas
      className="darkroom-canvas"
      style={{ position: "absolute", inset: 0 }}
      // a window drag fires resizes every frame; each one rebuilds the fluid
      // targets and remaps the exposure, so settle first
      resize={{ debounce: { resize: 100, scroll: 50 } }}
      dpr={[1, 1.5]}
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
      {mode && <DarkroomScene bus={bus} mode={mode} />}
    </Canvas>
  );
}
