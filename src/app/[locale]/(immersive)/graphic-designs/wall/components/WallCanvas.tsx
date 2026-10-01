import { memo, useCallback, useEffect, useState } from "react";
import { Canvas, type Frameloop, type RootState } from "@react-three/fiber";
import type { WebGLRenderer } from "three";
import { Bloom, EffectComposer, SMAA } from "@react-three/postprocessing";
import { BLOOM, CAMERA, PRESETS, SOFTWARE, type Tier } from "../wall.config";
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
 * DPR capped per tier (1.5 desktop, 1.25 mobile) and `antialias: false`: the
 * composer runs on a HalfFloat buffer, so the driver's MSAA would be thrown
 * away anyway. SMAA in the chain costs one pass and cleans up the riser and
 * cabinet edges, which are the only hard geometry in the room — on the desktop
 * tier; on a phone at DPR 1.25 the edges are fine without it. `multisampling={0}`
 * is deliberate — the default is 8, and a multisampled HalfFloat buffer at DPR
 * 1.5 is hundreds of megabytes on a large monitor for edges SMAA already
 * handles.
 *
 * The frameloop is owned by App (visibility + reduced motion + the software
 * path): R3F re-applies the prop on every Canvas render, so it cannot be set
 * from inside the scene.
 *
 * Memoised, and the room's state — the view, the tour station, the palette —
 * comes through the bus rather than as props: App re-renders on every tour
 * step, card fade and first touch, and none of that should reach <Canvas>.
 * What is left as props changes the tree or the renderer itself.
 */
export const WallCanvas = memo(function WallCanvas({
  reduced,
  software,
  tier,
  frameloop,
  bus,
  onSoftware,
  onContextLost,
}: {
  reduced: boolean;
  software: boolean;
  /** picked once at mount (App): DPR, mirror size, bloom depth, SMAA, the service light */
  tier: Tier;
  frameloop: Frameloop;
  bus: WallBus;
  onSoftware: (software: boolean) => void;
  onContextLost: (lost: boolean) => void;
}) {
  const [renderer, setRenderer] = useState<WebGLRenderer | null>(null);
  const onCreated = useCallback(
    ({ gl }: RootState) => {
      onSoftware(isSoftwareRenderer(gl.getContext()));
      setRenderer(gl);
    },
    [onSoftware],
  );

  // Without preventDefault the browser drops the context for good; with it the
  // GPU may restore it. Meanwhile the chrome shows a message and the exit. An
  // effect keyed on the renderer, so the pair of listeners leaves with the
  // canvas instead of outliving it.
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
      className="wall-canvas"
      style={{ position: "absolute", inset: 0 }}
      dpr={software ? SOFTWARE.dpr : [1, tier.dpr]}
      frameloop={frameloop}
      camera={CAMERA_PROPS}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      onCreated={onCreated}
    >
      <WallScene reduced={reduced} software={software} tier={tier} bus={bus} />
      {/* disabled, not unmounted: with `enabled` false the composer drops to
          render priority 0 and R3F's own render takes over, which is the whole
          saving on a CPU rasteriser */}
      <EffectComposer enabled={!software} multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={BLOOM.intensity}
          luminanceThreshold={BLOOM.luminanceThreshold}
          luminanceSmoothing={BLOOM.luminanceSmoothing}
          mipmapBlur={BLOOM.mipmapBlur}
          levels={tier.bloomLevels}
        />
        {tier.smaa ? <SMAA /> : null}
      </EffectComposer>
    </Canvas>
  );
});
