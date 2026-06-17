"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { View, Preload } from "@react-three/drei";
import { useApp } from "@/components/providers/AppProvider";
import { WashView } from "./WashView";

/**
 * The single persistent WebGL canvas for the whole app. Fixed, transparent, and
 * pointer-inert; it only paints where a <View> scissors it (the open gen row,
 * or the full-viewport entrance wash). frameloop="demand" — nothing renders at
 * rest. Mounted once, after entry + idle (see FieldMount), never on first paint.
 */
export function Field() {
  const { reducedMotion } = useApp();
  // Field only mounts after entry, so reducedMotion is settled here: start the
  // wash on (unless reduced) and let the effect schedule its fade-out.
  const [washing, setWashing] = useState(() => !reducedMotion);

  useEffect(() => {
    if (!washing) return;
    const t = window.setTimeout(() => setWashing(false), 1100);
    return () => window.clearTimeout(t);
  }, [washing]);

  // Mark the document so gen-row fallback plates crossfade to the live canvas.
  useEffect(() => {
    return () => document.documentElement.classList.remove("canvas-live");
  }, []);

  return (
    <>
      {!reducedMotion && <WashView active={washing} />}
      <Canvas
        className="field-canvas"
        // R3F sets inline position:relative on its container; override here so
        // the canvas is fixed and full-viewport (inline beats the CSS class).
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
        frameloop="demand"
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: false,
          premultipliedAlpha: false,
          powerPreference: "low-power",
        }}
        onCreated={() =>
          document.documentElement.classList.add("canvas-live")
        }
      >
        <View.Port />
        <Preload all />
      </Canvas>
    </>
  );
}
