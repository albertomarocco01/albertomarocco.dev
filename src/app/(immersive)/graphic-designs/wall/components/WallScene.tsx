import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, useFBO } from "@react-three/drei";
import {
  LOOP,
  REFLECTOR,
  ROOM,
  SOFTWARE,
  WALL,
  WALL_CENTRE_Y,
  type LoopVariant,
} from "../wall.config";
import { CameraRig } from "./CameraRig";
import { LoopSource } from "./loop-source";
import { LedWallMaterial } from "./wall-material";
import { initRoomLight } from "./room-light";
import { WallBack } from "./wall-back";
import type { WallBus } from "./wall-bus";

/**
 * The room: an endless ground, a riser, the wall — and its back. One unit is
 * one metre, so every number here is the number a client would be quoted.
 *
 * Order of work in a frame:
 *   −1  the loop is advanced and drawn into its render target (throttled to 30 Hz)
 *    0  drei's reflector re-renders the room from under the floor
 *    1  the composer renders the room and adds the bloom
 */
export function WallScene({
  variant,
  preset,
  presetNonce,
  reduced,
  software,
  bus,
}: {
  variant: LoopVariant;
  preset: number;
  presetNonce: number;
  reduced: boolean;
  software: boolean;
  bus: WallBus;
}) {
  // both paths mean the same thing to the scene: no clock, no crossfade, and a
  // room that repaints only when the visitor moves it
  const still = reduced || software;
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  // 2:1, matching the wall. No depth: the source is one triangle.
  const fbo = useFBO(LOOP.fboWidth, LOOP.fboHeight, { depthBuffer: false, stencilBuffer: false });
  const [loop] = useState(() => new LoopSource(fbo, variant));
  const [material] = useState(() => new LedWallMaterial(loop.texture));
  const [light] = useState(() => initRoomLight());
  const [backLight] = useState(() => initRoomLight(ROOM.wallLight.intensity * ROOM.backLight.ratio));
  const [back] = useState(() => new WallBack());

  useEffect(
    () => () => {
      loop.dispose();
      material.dispose();
      back.dispose();
    },
    [loop, material, back],
  );

  // One wake channel. Any input stamps the bus; on the still paths (reduced
  // motion, a CPU rasteriser) the frameloop is `demand`, so the stamp also has
  // to buy the frame in which the camera actually moves — otherwise a preset
  // change flips the HUD while the canvas keeps showing the old view.
  useEffect(() => {
    bus.registerWake(invalidate);
    return () => bus.registerWake(null);
  }, [bus, invalidate]);

  // A restored context comes back with an empty render target: three re-creates
  // the GPU objects but not their contents, and on a throttled or frozen loop
  // nothing would ever repaint the wall. Ask for one paint, and a frame to do
  // it in.
  useEffect(() => {
    const canvas = gl.domElement;
    const onRestore = () => {
      loop.markDirty();
      invalidate();
    };
    canvas.addEventListener("webglcontextrestored", onRestore);
    return () => canvas.removeEventListener("webglcontextrestored", onRestore);
  }, [gl, loop, invalidate]);

  useEffect(() => {
    loop.setVariant(variant, still);
    invalidate(); // when nothing is running, the change needs a frame of its own
  }, [loop, variant, still, invalidate]);

  useFrame((state, delta) => {
    loop.update(state.gl, Math.min(delta, 0.1), still);
    light.color.copy(loop.hot);
    backLight.color.copy(loop.hot);
  }, -1);

  return (
    <>
      <color attach="background" args={["#000000"]} />
      {/* the world ends in black, not at an edge: linear fog on every standard
          material. The wall's own shaders are not opted in, so the face stays
          bright at any distance while the ground under it fades away. */}
      <fog attach="fog" args={["#000000", ROOM.fog.near, ROOM.fog.far]} />

      {/* a flat bounce, so the floor has something for the reflection to sit in */}
      <ambientLight intensity={ROOM.ambient} />

      {/*
        The wall as what it physically is: a 6 × 3 m area light. It is the main
        source in the room, it carries the loop's colour, and it is what puts a
        pool of light on the floor. Rotated a half turn because a RectAreaLight
        shines along its local −Z.
      */}
      {ROOM.wallLight.enabled && (
        <primitive
          object={light}
          position={[0, WALL_CENTRE_Y, ROOM.wallLight.offset]}
          rotation={[0, Math.PI, 0]}
        />
      )}
      {/* the service light: the same size, behind the wall, shining at its back */}
      {ROOM.wallLight.enabled && (
        <primitive
          object={backLight}
          position={[0, WALL_CENTRE_Y, -WALL.bodyDepth - ROOM.backLight.distance]}
          rotation={[0, Math.PI, 0]}
        />
      )}

      {/* the floor — the glow it carries is the whole point of the room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.floorSize, ROOM.floorSize]} />
        <MeshReflectorMaterial
          resolution={software ? SOFTWARE.reflectorResolution : REFLECTOR.resolution}
          blur={software ? SOFTWARE.reflectorBlur : REFLECTOR.blur}
          mixBlur={REFLECTOR.mixBlur}
          mixStrength={REFLECTOR.mixStrength}
          mirror={REFLECTOR.mirror}
          mixContrast={REFLECTOR.mixContrast}
          color={ROOM.floorColor}
          roughness={REFLECTOR.roughness}
          metalness={REFLECTOR.metalness}
        />
      </mesh>

      {/* the riser the wall stands on */}
      <mesh position={[0, WALL.riserHeight / 2, -WALL.bodyDepth / 2]}>
        <boxGeometry
          args={[WALL.width + 2 * WALL.riserOverhang, WALL.riserHeight, WALL.riserDepth]}
        />
        <meshStandardMaterial color={ROOM.riserColor} roughness={0.95} metalness={0} />
      </mesh>

      {/* the 72 cabinets behind the face, their cabling, the support, the processor */}
      <primitive object={back.group} />

      {/* the LED surface */}
      <mesh position={[0, WALL_CENTRE_Y, WALL.faceOffset]}>
        <planeGeometry args={[WALL.width, WALL.height]} />
        <primitive object={material} attach="material" />
      </mesh>

      <CameraRig preset={preset} presetNonce={presetNonce} reduced={still} bus={bus} />
    </>
  );
}
