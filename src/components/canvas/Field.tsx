"use client";

import { useEffect, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import { View, Preload } from "@react-three/drei";
import { useApp } from "@/components/providers/AppProvider";
import { AmbientField } from "./AmbientField";

/**
 * True when WebGL is software-rendered (no GPU): SwiftShader (headless Chrome /
 * Lighthouse), llvmpipe, Microsoft Basic Render, etc. Software-rasterizing a
 * fullscreen fbm every frame is a long main-thread task, so we render the
 * ambient field as a single static frame there instead of a continuous loop —
 * the GPU does the work for everyone else. Mirrors the repo's existing
 * "WebGL unavailable → static plate" stance.
 */
function isSoftwareRenderer(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): boolean {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : "";
    return /swiftshader|llvmpipe|software|microsoft basic|softpipe|warp/i.test(
      renderer,
    );
  } catch {
    return false; // assume hardware if the query is blocked
  }
}

/**
 * The single persistent WebGL canvas for the whole app. Fixed, transparent, and
 * pointer-inert; it only paints where a <View> scissors it (the ambient white
 * field, or an open gen row). frameloop="demand" — nothing renders at rest.
 * Mounted once, after first paint + idle (see FieldMount), never on first paint.
 */
export function Field() {
  const { reducedMotion } = useApp();

  // The ambient field is now a full-site background: it runs the whole time the
  // tab is visible, behind every section, so the bubbles stay present while you
  // scroll (not just behind the hero). The only gate left is tab-visibility —
  // backgrounded → it fades out and the demand loop goes idle (no GPU, no
  // main-thread work); it resumes on return. (The `.field-canvas`/`.ambient-track`
  // are fixed full-viewport, so "active" is all that governs whether it paints.)
  const [active, setActive] = useState(true);
  // Set once the renderer is known; until then assume hardware (animate).
  const [staticOnly, setStaticOnly] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const update = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, [reducedMotion]);

  // Mark the document so gen-row fallback plates crossfade to the live canvas.
  useEffect(() => {
    return () => document.documentElement.classList.remove("canvas-live");
  }, []);

  return (
    <>
      {!reducedMotion && <AmbientField active={active} staticOnly={staticOnly} />}
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
        // Cap DPR at 1.5: the ambient field paints fullscreen continuously, and
        // the soft noise reads identically at 1.5 as at 2 — cheaper everywhere.
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: false,
          premultipliedAlpha: false,
          powerPreference: "low-power",
        }}
        onCreated={(state: RootState) => {
          document.documentElement.classList.add("canvas-live");
          if (isSoftwareRenderer(state.gl.getContext())) setStaticOnly(true);
        }}
      >
        <View.Port />
        <Preload all />
      </Canvas>
    </>
  );
}
