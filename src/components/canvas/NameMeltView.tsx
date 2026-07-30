"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { MeltMaterial, type MeltMaterialImpl } from "./melt-material";

// MeltMaterial must be extended once; importing for its side effect.
void MeltMaterial;

/**
 * The "Alberto Marocco" liquid melt. The real h1 stays in the DOM untouched
 * (SSR, SEO, LCP, screen readers); this mounts a drei <View> tracker inside it
 * (.melt-wrap — the h1 box plus bleed, kept aligned by CSS alone), rasterizes
 * the glyphs to a texture once fonts are ready and the entrance animations have
 * settled, and displaces that texture under the cursor (melt-material.ts).
 *
 * Rest costs nothing: the mesh is only visible — and the DOM h1 only hidden —
 * while the engage/turbulence envelopes are alive. At rest the visitor is
 * looking at the genuine DOM text (crispest possible at any DPR) and the view
 * draws nothing; the swap happens at <1px of displacement, so it never pops.
 *
 * Hot paths are allocation- and setState-free: pointer/wheel handlers write
 * refs, the envelopes decay in useFrame, uniforms are mutated in place — the
 * same discipline as Aura/Cursor/HomeSequence.
 */

// ---- envelopes ----
const ENGAGE_UP = 7; // ramp-in lerp rate — the melt answers the hand quickly
const ENGAGE_DECAY_HOVER = 0.9; // idle decay while the pointer rests on the name
const ENGAGE_DECAY_AWAY = 3.2; // faster decay once the pointer leaves
const FRESH_MS = 90; // "still moving" window after the last pointermove
const TURB_DECAY = 2.4; // scroll turbulence half-lifes away in ~0.3s
const TURB_GAIN = 1 / 900; // wheel px -> turbulence
const TURB_MAX = 0.8;
const MOUSE_SMOOTH = 9; // pointer-follow lerp rate (light lag = liquid trail)
const ALIVE_EPS = 0.012; // below this the effect parks and the DOM h1 returns

// ---- look ----
const RADIUS_EM = 0.8; // cursor falloff radius, in h1 font-size units
const STRENGTH_EM = 0.24; // max displacement, in h1 font-size units

// ---- raster ----
const DPR_CAP = 2;
const RASTER_DEBOUNCE_MS = 150;

type MeltIO = {
  h1: HTMLElement | null;
  /** live tracker rect (viewport coords; the home never scrolls) */
  rect: { left: number; top: number; width: number; height: number };
  em: number; // h1 font-size px — radius/strength scale with it
  tex: THREE.CanvasTexture | null;
  targetX: number; // pointer in tracker UV, y up
  targetY: number;
  smoothX: number;
  smoothY: number;
  moveAt: number; // performance.now() of the last pointermove inside
  inside: boolean;
  engage: number;
  turb: number;
};

/** One text run: set the exact computed font, anchor to the DOM baseline via
 * half-leading math, and scale x so the drawn width matches the DOM width
 * exactly (absorbs letter-spacing support differences and kerning drift). */
function drawRun(
  ctx: CanvasRenderingContext2D,
  text: string,
  runRect: DOMRect,
  baseRect: DOMRect,
  style: CSSStyleDeclaration,
) {
  const size = parseFloat(style.fontSize);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing =
      style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
  }
  ctx.fillStyle = style.color;
  const m = ctx.measureText(text);
  const asc = m.fontBoundingBoxAscent ?? size * 0.77;
  const desc = m.fontBoundingBoxDescent ?? size * 0.23;
  const x = runRect.left - baseRect.left;
  const baseline =
    runRect.top - baseRect.top + (runRect.height - (asc + desc)) / 2 + asc;
  const sx = m.width > 0 ? runRect.width / m.width : 1;
  ctx.save();
  ctx.translate(x, baseline);
  ctx.scale(sx, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** The in-canvas half: envelopes, uniforms, demand-loop keep-alive, and the
 * DOM-visibility swap. Runs inside the shared canvas via the <View> portal.
 * Receives the io *ref* (not the object) so every mutation goes through
 * `.current` — the sanctioned escape hatch, same as Aura's orbs/energy. */
function MeltScene({ ioRef }: { ioRef: React.RefObject<MeltIO> }) {
  const matRef = useRef<MeltMaterialImpl>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const melting = useRef(false);

  // Fullscreen triangle in clip space (same pattern as Aura).
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

  useFrame((_, delta) => {
    const m = matRef.current;
    const mesh = meshRef.current;
    const io = ioRef.current;
    if (!m || !mesh || !io) return;

    // Envelopes first — they decide whether anything at all is happening.
    // "Fresh" input pulls engage up; otherwise it decays (slowly while the
    // pointer rests on the name, quickly once it leaves). A long stall (tab
    // hidden) lands with exp(-huge) ~ 0: already settled, no burst.
    const fresh = io.inside && performance.now() - io.moveAt < FRESH_MS;
    if (fresh) io.engage += (1 - io.engage) * Math.min(1, delta * ENGAGE_UP);
    else
      io.engage *= Math.exp(
        -delta * (io.inside ? ENGAGE_DECAY_HOVER : ENGAGE_DECAY_AWAY),
      );
    io.turb *= Math.exp(-delta * TURB_DECAY);

    const alive =
      io.tex != null && (io.engage > ALIVE_EPS || io.turb > ALIVE_EPS);
    if (alive !== melting.current) {
      melting.current = alive;
      mesh.visible = alive;
      // The swap: displacement is <1px at ALIVE_EPS and the raster is
      // pixel-aligned, so toggling is invisible. Opacity (not visibility)
      // keeps the h1 in the a11y tree.
      io.h1?.classList.toggle("is-melting", alive);
    }
    if (!alive) return; // parked — no uniform writes, no invalidate

    io.smoothX += (io.targetX - io.smoothX) * Math.min(1, delta * MOUSE_SMOOTH);
    io.smoothY += (io.targetY - io.smoothY) * Math.min(1, delta * MOUSE_SMOOTH);

    if (m.uniforms.u_tex.value !== io.tex) m.uniforms.u_tex.value = io.tex;
    m.uniforms.u_res.value.set(io.rect.width, io.rect.height);
    m.uniforms.u_mouse.value.set(io.smoothX, io.smoothY);
    m.uniforms.u_radius.value = io.em * RADIUS_EM;
    m.uniforms.u_strength.value = io.em * STRENGTH_EM;
    m.uniforms.u_engage.value = io.engage;
    m.uniforms.u_turb.value = io.turb;
    m.uniforms.u_time.value += delta;
    invalidate(); // unthrottled while alive — the melt wants 60fps
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} visible={false}>
      <meltMaterial ref={matRef} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
}

export function NameMeltView() {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const ioRef = useRef<MeltIO>({
    h1: null,
    rect: { left: 0, top: 0, width: 0, height: 0 },
    em: 100,
    tex: null,
    targetX: 0.5,
    targetY: 0.5,
    smoothX: 0.5,
    smoothY: 0.5,
    moveAt: 0,
    inside: false,
    engage: 0,
    turb: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const io = ioRef.current;
    const h1 = wrap?.closest<HTMLElement>(".name") ?? null;
    io.h1 = h1;
    if (!wrap || !h1) return;

    let disposed = false;
    let debounce: number | null = null;

    // Rasterize the h1 into the texture. Draws every visible run (the two .nw
    // text nodes and the amber italic em) at its live DOM rect, DPR-aware.
    const raster = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }
      canvas.width = Math.round(rect.width * dpr); // also clears
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const range = document.createRange();
      for (const span of h1.querySelectorAll<HTMLElement>(".nw")) {
        const spanStyle = getComputedStyle(span);
        for (const node of span.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            range.selectNodeContents(node);
            drawRun(
              ctx,
              node.textContent,
              range.getBoundingClientRect(),
              rect,
              spanStyle,
            );
          } else if (node instanceof HTMLElement && node.textContent) {
            drawRun(
              ctx,
              node.textContent,
              node.getBoundingClientRect(),
              rect,
              getComputedStyle(node),
            );
          }
        }
      }
      io.rect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      io.em = parseFloat(getComputedStyle(h1).fontSize);
      if (!io.tex) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        io.tex = tex;
      } else {
        io.tex.needsUpdate = true;
      }
    };

    // Raster only once the name is at rest: the entrance (hero-in / the
    // fail-safe) animates transform+blur on the spans, and rects measured
    // mid-flight would bake the offset in. Recurse because finishing one
    // animation can start another (fail-safe cancelled -> hero-in plays).
    const whenStill = () => {
      if (disposed) return;
      const anims = h1
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === "running");
      if (anims.length) {
        Promise.allSettled(anims.map((a) => a.finished)).then(whenStill);
        return;
      }
      raster();
    };
    document.fonts.ready.then(() => {
      if (!disposed) whenStill();
    });

    const requestRaster = () => {
      if (debounce != null) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        debounce = null;
        whenStill();
      }, RASTER_DEBOUNCE_MS);
    };

    // Size changes re-raster; window resizes also refresh the cached rect
    // (the hero re-centres without changing size, which ResizeObserver misses).
    const ro = new ResizeObserver(requestRaster);
    ro.observe(h1);
    window.addEventListener("resize", requestRaster);

    // DPR changes (browser zoom, moving to another monitor): re-watch each time.
    let mq: MediaQueryList | null = null;
    const onDpr = () => {
      requestRaster();
      watchDpr();
    };
    const watchDpr = () => {
      mq?.removeEventListener("change", onDpr);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onDpr);
    };
    watchDpr();

    // Pointer -> refs. Touch is excluded: on the home, touch-drag already
    // belongs to the intro state machine, and overloading it with a second
    // meaning would muddy both. (Touch devices don't mount this at all — the
    // gate is hover-capable pointers — this guards hybrids.)
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = io.rect;
      if (!r.width) return;
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.left + r.width &&
        e.clientY >= r.top &&
        e.clientY <= r.top + r.height;
      io.inside = inside;
      if (!inside) return;
      io.targetX = (e.clientX - r.left) / r.width;
      io.targetY = 1 - (e.clientY - r.top) / r.height; // flip to UV (y up)
      io.moveAt = performance.now();
    };

    // Scroll intent (consumed by HomeSequence, the page never moves) feeds a
    // brief global turbulence. Passive read-only listener, same stance as the
    // sequence's own.
    const onWheel = (e: WheelEvent) => {
      const px =
        e.deltaMode === 1
          ? e.deltaY * 40
          : e.deltaMode === 2
            ? e.deltaY * window.innerHeight
            : e.deltaY;
      io.turb = Math.min(TURB_MAX, io.turb + Math.abs(px) * TURB_GAIN);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      disposed = true;
      ro.disconnect();
      window.removeEventListener("resize", requestRaster);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("wheel", onWheel);
      mq?.removeEventListener("change", onDpr);
      if (debounce != null) window.clearTimeout(debounce);
      h1.classList.remove("is-melting");
      io.tex?.dispose();
      io.tex = null;
    };
  }, []);

  // span, not div — this lives inside the h1 (phrasing content). aria-hidden:
  // the accessible name is the real text beside it.
  return (
    <span ref={wrapRef} className="melt-wrap" aria-hidden="true">
      <View as="span" className="melt-view" index={2}>
        <MeltScene ioRef={ioRef} />
      </View>
    </span>
  );
}
