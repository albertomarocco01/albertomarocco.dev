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
import { BackdropMaterial } from "./backdrop-material";
import { CameraRig } from "./CameraRig";
import { LoopSource } from "./loop-source";
import { LedWallMaterial } from "./wall-material";
import { initRoomLight } from "./room-light";
import type { WallBus } from "./wall-bus";

/**
 * The room: a floor, a riser, the wall, and a figure for scale. One unit is one
 * metre, so every number here is the number a client would be quoted.
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
  // the shell is dropped 2 m below the floor so its bottom rim is never in
  // frame; the gradient is told the same range, or the lift lands nowhere near it
  const [backdrop] = useState(() => new BackdropMaterial(-2, ROOM.backdropHeight - 2));
  const [light] = useState(() => initRoomLight());

  useEffect(
    () => () => {
      loop.dispose();
      material.dispose();
      backdrop.dispose();
    },
    [loop, material, backdrop],
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
  }, -1);

  const figure = ROOM.figure;

  return (
    <>
      <color attach="background" args={["#000000"]} />

      {/* a flat bounce, so the floor has something for the reflection to sit in */}
      <ambientLight intensity={ROOM.ambient} />

      {/*
        The wall as what it physically is: a 6 × 3 m area light. It is the only
        source in the room, it carries the loop's colour, and it is what puts a
        pool of light on the floor and an edge on the figure. Rotated a half
        turn because a RectAreaLight shines along its local −Z.
      */}
      {ROOM.wallLight.enabled && (
        <primitive
          object={light}
          position={[0, WALL_CENTRE_Y, ROOM.wallLight.offset]}
          rotation={[0, Math.PI, 0]}
        />
      )}

      {/* the walls of the room, implied by a gradient and nothing else */}
      <mesh position={[0, ROOM.backdropHeight / 2 - 2, 0]} renderOrder={-1}>
        <cylinderGeometry
          args={[ROOM.backdropRadius, ROOM.backdropRadius, ROOM.backdropHeight, 40, 1, true]}
        />
        <primitive object={backdrop} attach="material" />
      </mesh>

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

      {/* the cabinets behind the face: the wall has a back, and it shows obliquely */}
      <mesh position={[0, WALL_CENTRE_Y, -WALL.bodyDepth / 2]}>
        <boxGeometry args={[WALL.width + 0.04, WALL.height + 0.04, WALL.bodyDepth]} />
        <meshStandardMaterial color={ROOM.bodyColor} roughness={0.88} metalness={0.15} />
      </mesh>

      {/* the LED surface */}
      <mesh position={[0, WALL_CENTRE_Y, WALL.faceOffset]}>
        <planeGeometry args={[WALL.width, WALL.height]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* 1.8 m of someone, for scale — a capsule and a sphere, nothing more */}
      <group position={[figure.position[0], figure.position[1], figure.position[2]]}>
        <mesh position={[0, figure.centreY, 0]}>
          <capsuleGeometry args={[figure.radius, figure.length, 6, 20]} />
          <meshStandardMaterial color={figure.color} roughness={figure.roughness} metalness={0} />
        </mesh>
        <mesh position={[0, figure.headY, 0]}>
          <sphereGeometry args={[figure.headRadius, 24, 16]} />
          <meshStandardMaterial color={figure.color} roughness={figure.roughness} metalness={0} />
        </mesh>
      </group>

      <CameraRig preset={preset} presetNonce={presetNonce} reduced={still} bus={bus} />
    </>
  );
}
