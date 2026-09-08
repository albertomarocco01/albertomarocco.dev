import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DarkroomEngine } from "./darkroom-engine";
import type { DarkroomMode, TrayBus } from "./tray-bus";

/**
 * Lives inside the <Canvas>. Owns one engine for the life of the mount, flips
 * its mode in place when reduced motion toggles (the print survives), keeps it
 * sized to the drawing buffer, and drives it from `useFrame` at priority 1 — a
 * positive priority hands the rendering to us, so R3F never draws its own
 * (empty) scene. Renders nothing itself.
 */
export function DarkroomScene({ bus, mode }: { bus: TrayBus; mode: DarkroomMode }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const invalidate = useThree((s) => s.invalidate);
  const engineRef = useRef<DarkroomEngine | null>(null);

  useEffect(() => {
    const engine = new DarkroomEngine(gl, bus);
    engineRef.current = engine;
    const canvas = gl.domElement;
    const onRestore = () => engine.recover();
    canvas.addEventListener("webglcontextrestored", onRestore);
    return () => {
      canvas.removeEventListener("webglcontextrestored", onRestore);
      engineRef.current = null;
      engine.dispose();
    };
  }, [gl, bus]);

  // in brush mode the loop runs on demand: the engine registers `invalidate`
  // on the bus so any input wakes exactly one frame
  useEffect(() => {
    engineRef.current?.setMode(mode, mode === "brush" ? invalidate : null);
    invalidate();
  }, [mode, invalidate]);

  useEffect(() => {
    engineRef.current?.resize(size.width, size.height, dpr);
  }, [size, dpr]);

  useFrame((_, delta) => {
    engineRef.current?.step(delta);
  }, 1);

  return null;
}
