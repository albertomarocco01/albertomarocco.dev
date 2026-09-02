"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { FigureMaterial, type FigureMaterialImpl } from "./figure-material";
import { BLOB_COUNT } from "./field-glsl";
import { fieldState } from "./field-state";
import { getBubbleParams } from "./bubble-params";
import { isTrackingHeld, onTrackingHold } from "@/lib/track-motion";

// FigureMaterial must be extended once; importing for its side effect.
void FigureMaterial;

/**
 * The /about cut-out, painted by the shared canvas with the field's near orbs
 * over it (see figure-material.ts for the why). Same shape as NameMeltView: a
 * drei <View> tracker fills the DOM <figure>, the scene inside loads the same
 * WebP the fallback <img> shows, and once the texture is up the GPU copy fades
 * in as CSS fades the <img> out (`.about-figure.is-live`). Under reduced
 * motion, or before the field is ready, this never mounts and the <img> is the
 * figure — the panel loses the orbs-in-front depth, nothing else.
 *
 * Frames: the figure adds none of its own at rest — it rides the ~30fps the
 * ambient field already renders. It asks for every frame only while its own
 * fade-in runs, and while a DOM driver holds tracking (track-motion.ts: the
 * panel slide), so the GPU copy keeps step with the DOM text beside it.
 */

const REVEAL_RATE = 3.2; // fade-in lerp rate once the texture is up (~1s)
const DT_MAX = 0.05; // a hidden tab's giant delta must not teleport the fade
const ANISOTROPY = 4; // the figure is mostly minified; keeps the suit's weave crisp

type FigureIO = {
  /** the View's own div — the scissor tracker, whose box is the figure's */
  track: HTMLElement | null;
  /** the <figure> around it — gets `is-live` once the GPU copy owns the pixels */
  host: HTMLElement | null;
  /** the nearest clipping ancestor (the panel): the canvas is not clipped by
   *  the DOM, so its box is handed to the shader as u_clip */
  clip: HTMLElement | null;
  /** `--fig-dim` from CSS: phones dim the figure behind the copy */
  dim: number;
  /** bottom dissolve, as a fraction of the box (mirrors the <img>'s mask) */
  bottom: number;
};

/** The in-canvas half: texture, uniforms, keep-alive. Runs through the View's portal. */
function FigureScene({
  ioRef,
  src,
}: {
  ioRef: React.RefObject<FigureIO>;
  src: string;
}) {
  const matRef = useRef<FigureMaterialImpl>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const texRef = useRef<THREE.Texture | null>(null);
  const live = useRef(false);
  const reveal = useRef(0);

  // The vec3 array handed to u_blobs — owned here, mutated in place each frame
  // from the field's published orbs (never aliased with the field's own).
  const blobVecs = useMemo(
    () => Array.from({ length: BLOB_COUNT }, () => new THREE.Vector3()),
    [],
  );

  // Fullscreen triangle in clip space (same pattern as Aura / the melt).
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

  // The cut-out — the very file the <img> beside it shows, so it comes from
  // cache. Sampled raw (no colour space): this shader does no colour
  // management, exactly like the field's, so the photo lands as authored.
  useEffect(() => {
    let disposed = false;
    new THREE.TextureLoader().load(src, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.NoColorSpace;
      // Premultiplied upload: the cut-out is straight-alpha and the RGB under
      // its transparent texels is whatever the encoder left (black, mostly), so
      // the mip/bilinear taps along the silhouette would otherwise average that
      // black in and draw a dark fringe the browser-composited <img> never had.
      // The shader un-premultiplies before toning (figure-material.ts).
      tex.premultiplyAlpha = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = Math.min(ANISOTROPY, gl.capabilities.getMaxAnisotropy());
      texRef.current = tex;
      invalidate(); // wake the demand loop: the first frame flips the handover
    });
    return () => {
      disposed = true;
      texRef.current?.dispose();
      texRef.current = null;
    };
  }, [src, gl, invalidate]);

  // A panel move (holdTracking, from the DOM driver) has to be able to *start*
  // frames, not only prolong them: with the field static (software WebGL) or
  // idle nothing else would ask for one, and the figure would sit at its old
  // box while the panel slid away from under it.
  useEffect(() => onTrackingHold(invalidate), [invalidate]);

  // If this scene goes while the DOM figure stays (the canvas died after the
  // handover), give the pixels back to the <img>.
  useEffect(() => {
    const io = ioRef.current;
    return () => {
      io.host?.classList.remove("is-live");
    };
  }, [ioRef]);

  useFrame((_, raw) => {
    const m = matRef.current;
    const mesh = meshRef.current;
    const io = ioRef.current;
    if (!m || !mesh || !io || !io.track) return;

    // The texture is the gate: from its first frame the GPU copy owns these
    // pixels and CSS fades the <img> out underneath (`is-live`). Opacity, not
    // visibility, so the <img> keeps its alt text in the a11y tree.
    const tex = texRef.current;
    const alive = tex != null;
    if (alive !== live.current) {
      live.current = alive;
      mesh.visible = alive;
      io.host?.classList.toggle("is-live", alive);
    }
    if (!alive) return;

    const delta = Math.min(raw, DT_MAX);
    reveal.current += (1 - reveal.current) * Math.min(1, delta * REVEAL_RATE);

    // Where the box sits on screen, in the field's UV (y up). Read every frame:
    // the panel track slides it, and the field's orbs are viewport-fixed.
    const r = io.track.getBoundingClientRect();
    const vw = Math.max(window.innerWidth, 1);
    const vh = Math.max(window.innerHeight, 1);
    const held = isTrackingHeld();
    // Off screen — the panel above or below the viewport: drei's View skips the
    // draw, so skip the uniform work too and, above all, don't ask for frames.
    // The fade-in above still advances on whatever the field renders (so the
    // figure is ready when its panel arrives), and a move keeps frames coming
    // until the box is in view. Without this the second panel's figure forced
    // the whole fullscreen field to render at rAF rate for the ~1.5 s of its
    // own fade-in, for pixels nobody could see.
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) {
      if (held) invalidate();
      return;
    }
    if (m.uniforms.u_tex.value !== tex) m.uniforms.u_tex.value = tex;
    m.uniforms.u_rect.value.set(
      r.left / vw,
      1 - r.bottom / vh,
      r.width / vw,
      r.height / vh,
    );
    m.uniforms.u_aspect.value = vw / vh;
    if (io.clip) {
      const k = io.clip.getBoundingClientRect();
      m.uniforms.u_clip.value.set(
        k.left / vw,
        1 - k.bottom / vh,
        k.width / vw,
        k.height / vh,
      );
    }

    // The field's frame: its fade, its parallax, its orbs, its live tunables.
    m.uniforms.u_fade.value = fieldState.fade;
    m.uniforms.u_disp.value.set(fieldState.dispX, fieldState.dispY);
    const bp = getBubbleParams();
    m.uniforms.u_gain.value = bp.brightness;
    m.uniforms.u_opacity.value = bp.glow;
    m.uniforms.u_blobSize.value = bp.size;
    m.uniforms.u_soft.value = bp.softness;
    const b = fieldState.blobs;
    for (let i = 0; i < BLOB_COUNT; i++) {
      blobVecs[i].set(b[i * 3], b[i * 3 + 1], b[i * 3 + 2]);
    }
    m.uniforms.u_blobs.value = blobVecs;

    m.uniforms.u_reveal.value = reveal.current * io.dim;
    m.uniforms.u_bottom.value = io.bottom;

    // Every frame only while fading in or while the page moves the box; at
    // rest the field's own ~30fps carries this view.
    if (reveal.current < 0.995 || held) invalidate();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} visible={false}>
      <figureMaterial
        ref={matRef}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function FigureView({ src, bottom }: { src: string; bottom: number }) {
  // drei forwards the tracker element (or a group, inside a canvas — never our
  // case, this always renders in the DOM); narrowed in the effect.
  const trackRef = useRef<HTMLElement | THREE.Group | null>(null);
  const ioRef = useRef<FigureIO>({
    track: null,
    host: null,
    clip: null,
    dim: 1,
    bottom,
  });

  useEffect(() => {
    const io = ioRef.current;
    const track = trackRef.current;
    if (!(track instanceof HTMLElement)) return;
    io.track = track;
    io.host = track.closest<HTMLElement>(".about-figure");
    io.clip = track.closest<HTMLElement>(".about-panel");
    io.bottom = bottom;

    // Phones dim the figure behind the copy through a CSS custom property on
    // the <figure>; the GPU copy can't read CSS, so mirror it here on resize.
    const readDim = () => {
      const raw = io.host
        ? parseFloat(getComputedStyle(io.host).getPropertyValue("--fig-dim"))
        : NaN;
      io.dim = Number.isFinite(raw) ? raw : 1;
    };
    readDim();
    window.addEventListener("resize", readDim);
    return () => {
      window.removeEventListener("resize", readDim);
      io.host?.classList.remove("is-live"); // hand the pixels back to the <img>
      io.track = null;
      io.clip = null;
    };
  }, [bottom]);

  return (
    <View ref={trackRef} className="figure-view" index={2}>
      <FigureScene ioRef={ioRef} src={src} />
    </View>
  );
}
