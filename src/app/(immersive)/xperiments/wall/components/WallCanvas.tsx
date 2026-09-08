import { useCallback } from "react";
import { Canvas, type Frameloop, type RootState } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA } from "@react-three/postprocessing";
import { BLOOM, CAMERA, PRESETS, SOFTWARE, type LoopVariant } from "../wall.config";
import { isSoftwareRenderer } from "@/lib/webgl-caps";
import { WallScene } from "./WallScene";
import type { WallBus } from "./wall-bus";

// Module scope, so the object identity never changes and R3F never re-applies
// it. The camera starts already framed on the front preset — CameraRig then
// syncs the controls to it without a transition, so the first painted frame is
// the composition, not a fly-in from three's default position.
const CAMERA_PROPS = {
  fov: CAMERA.fov,
  near: CAMERA.near,
  far: CAMERA.far,
  position: [PRESETS[0].position[0], PRESETS[0].position[1], PRESETS[0].position[2]] as [
    number,
    number,
    number,
  ],
};

/**
 * The demo's own <Canvas> — not the site's shared one.
 *
 * DPR capped at 1.5 and `antialias: false`: the composer runs on a HalfFloat
 * buffer, so the driver's MSAA would be thrown away anyway. SMAA in the chain
 * costs one pass and cleans up the riser and cabinet edges, which are the only
 * hard geometry in the room. `multisampling={0}` is deliberate — the default is
 * 8, and a multisampled HalfFloat buffer at DPR 1.5 is hundreds of megabytes on
 * a large monitor for edges SMAA already handles.
 *
 * The frameloop is owned by App (visibility + reduced motion + the software
 * path): R3F re-applies the prop on every Canvas render, so it cannot be set
 * from inside the scene.
 */
export function WallCanvas({
  variant,
  preset,
  presetNonce,
  reduced,
  software,
  frameloop,
  bus,
  onSoftware,
  onContextLost,
}: {
  variant: LoopVariant;
  preset: number;
  presetNonce: number;
  reduced: boolean;
  software: boolean;
  frameloop: Frameloop;
  bus: WallBus;
  onSoftware: (software: boolean) => void;
  onContextLost: (lost: boolean) => void;
}) {
  const onCreated = useCallback(
    ({ gl }: RootState) => {
      const canvas = gl.domElement;
      onSoftware(isSoftwareRenderer(gl.getContext()));
      // Without preventDefault the browser drops the context for good; with it
      // the GPU may restore it. Meanwhile the chrome shows a message and the exit.
      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        onContextLost(true);
      });
      canvas.addEventListener("webglcontextrestored", () => onContextLost(false));
    },
    [onContextLost, onSoftware],
  );

  return (
    <Canvas
      className="wall-canvas"
      style={{ position: "absolute", inset: 0 }}
      dpr={software ? SOFTWARE.dpr : [1, 1.5]}
      frameloop={frameloop}
      camera={CAMERA_PROPS}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      onCreated={onCreated}
    >
      <WallScene
        variant={variant}
        preset={preset}
        presetNonce={presetNonce}
        reduced={reduced}
        software={software}
        bus={bus}
      />
      {/* disabled, not unmounted: with `enabled` false the composer drops to
          render priority 0 and R3F's own render takes over, which is the whole
          saving on a CPU rasteriser */}
      <EffectComposer enabled={!software} multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={BLOOM.intensity}
          luminanceThreshold={BLOOM.luminanceThreshold}
          luminanceSmoothing={BLOOM.luminanceSmoothing}
          mipmapBlur={BLOOM.mipmapBlur}
        />
        {BLOOM.smaa ? <SMAA /> : null}
      </EffectComposer>
    </Canvas>
  );
}
