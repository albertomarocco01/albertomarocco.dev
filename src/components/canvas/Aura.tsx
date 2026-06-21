"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { AuraMaterial, BLOB_COUNT, type AuraMaterialImpl } from "./aura-material";

// AuraMaterial must be extended once; importing for its side effect.
void AuraMaterial;

// White-field cursor parallax tuning (the lean's *strength* is DISP_STRENGTH in
// the shader). Both are deliberately gentle: heavy smoothing, slow return.
const DISP_SMOOTH = 2.2; // pointer-follow lerp rate — low = heavily smoothed/laggy
const DISP_DECAY = 0.7; // engagement decay per second — low = slower return to rest

// ---- white-field orb physics (drives u_blobs; runs only when `white`) ----
// All the motion lives here in JS — the shader just renders the centres it is
// handed. Distances are in the shader's aspect-corrected normalized-height space
// (`p`): y spans ~[-0.5, 0.5] on screen, x is scaled by the aspect ratio.
const TAU = Math.PI * 2;
const CORE_RADIUS = 0.145; // base collision-core radius; the visual glow is this × BLOB_SIZE (shader). Small enough that BLOB_COUNT orbs roam and bounce without jamming.
const RADIUS_VARY = 0.6; // per-orb size spread: r = CORE_RADIUS × (0.75 + RADIUS_VARY × hash) — mirrors the old radius variation
const WALL_BOUNDS = 0.58; // half-extent of the orb-centre play area (height units); the x bound is WALL_BOUNDS × aspect each frame. Centres reach the edge; soft glows spill beyond so the field fills the view.
const BASE_SPEED = 0.24; // entrance speed boost (units/sec) at energy = 1
const IDLE_DRIFT = 0.035; // calm floor speed (units/sec) once settled — orbs keep gently floating instead of freezing
const START_ENERGY = 1; // energy on the field's FIRST activation (load); only decays afterwards, never resets, so returning to the tab/hero stays calm
const ENERGY_DECAY = 0.7; // energy decay per second toward 0 (time-constant ~1.4s → settles in a few seconds)
const SPEED_TRACK = 1.4; // per-second rate each orb's |velocity| eases toward the envelope (BASE_SPEED×energy + IDLE_DRIFT) — lets the envelope govern liveliness without erasing collision redirects
const JITTER = 0.6; // tiny brownian heading wobble (rad/sec) so settled orbs wander gently instead of gliding dead straight
const RESTITUTION = 0.9; // bounciness for collisions and walls: 1 = perfectly elastic, <1 sheds a little speed on contact

type Orb = { x: number; y: number; vx: number; vy: number; r: number };

// Port of the shader's hash(vec2): seeds the initial orb spread + radii from the
// same anchors the old in-shader drift used, so the layout feels familiar.
// Seeding only — the GPU's 32-bit result differs slightly, which is irrelevant.
const fract = (v: number) => v - Math.floor(v);
function hash2(x: number, y: number): number {
  let px = fract(x * 123.34);
  let py = fract(y * 456.21);
  const dotp = px * (px + 45.32) + py * (py + 45.32);
  px += dotp;
  py += dotp;
  return fract(px * py);
}

// Seed orbs into a pleasing spread (run once, when the aspect is known). Doubles
// as the fixed arrangement painted for the static (software-renderer) frame.
function seedOrbs(orbs: Orb[], aspect: number) {
  const launch = BASE_SPEED * START_ENERGY + IDLE_DRIFT; // hot entrance speed
  for (let i = 0; i < orbs.length; i++) {
    const a = hash2(i, 1.7);
    const b = hash2(i, 9.1);
    const c = hash2(i, 4.3);
    const o = orbs[i];
    o.x = (a * 2 - 1) * WALL_BOUNDS * aspect * 0.9; // spread just inside the walls
    o.y = (b * 2 - 1) * WALL_BOUNDS * 0.9;
    o.r = CORE_RADIUS * (0.75 + RADIUS_VARY * a);
    const ang = c * TAU;
    o.vx = Math.cos(ang) * launch;
    o.vy = Math.sin(ang) * launch;
  }
}

// One physics tick: decay the energy envelope, then integrate, bounce off the
// soft walls, and resolve pairwise elastic collisions. O(n²) but n = BLOB_COUNT.
function stepPhysics(
  orbs: Orb[],
  energy: { current: number },
  delta: number,
  aspect: number,
) {
  // Energy eases toward 0 (the speed floor is IDLE_DRIFT, applied below). The dt
  // is clamped so a long stall (tab refocus) lands already-calm rather than
  // exploding the integration.
  const eDt = Math.min(delta, 0.1);
  energy.current *= Math.exp(-ENERGY_DECAY * eDt);

  const dt = Math.min(delta, 0.05);
  const boundX = WALL_BOUNDS * aspect;
  const boundY = WALL_BOUNDS;
  const targetSpeed = BASE_SPEED * energy.current + IDLE_DRIFT; // base × energy + floor

  // integrate: heading wobble → ease speed toward the envelope → advance
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    const ang = (Math.random() * 2 - 1) * JITTER * dt;
    const cs = Math.cos(ang);
    const sn = Math.sin(ang);
    const vx = o.vx * cs - o.vy * sn;
    const vy = o.vx * sn + o.vy * cs;
    const sp = Math.hypot(vx, vy);
    if (sp > 1e-5) {
      const f = (sp + (targetSpeed - sp) * (1 - Math.exp(-SPEED_TRACK * dt))) / sp;
      o.vx = vx * f;
      o.vy = vy * f;
    } else {
      const a2 = Math.random() * TAU;
      o.vx = Math.cos(a2) * targetSpeed;
      o.vy = Math.sin(a2) * targetSpeed;
    }
    o.x += o.vx * dt;
    o.y += o.vy * dt;
  }

  // soft walls: reflect the centre back inside, shedding a little speed
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    if (o.x > boundX) {
      o.x = boundX;
      o.vx = -Math.abs(o.vx) * RESTITUTION;
    } else if (o.x < -boundX) {
      o.x = -boundX;
      o.vx = Math.abs(o.vx) * RESTITUTION;
    }
    if (o.y > boundY) {
      o.y = boundY;
      o.vy = -Math.abs(o.vy) * RESTITUTION;
    } else if (o.y < -boundY) {
      o.y = -boundY;
      o.vy = Math.abs(o.vy) * RESTITUTION;
    }
  }

  // pairwise elastic collisions. Mass ∝ r²; push apart by inverse-mass share,
  // then exchange momentum along the contact normal (only while approaching).
  for (let i = 0; i < orbs.length; i++) {
    for (let j = i + 1; j < orbs.length; j++) {
      const a = orbs[i];
      const b = orbs[j];
      let nx = b.x - a.x;
      let ny = b.y - a.y;
      const dist = Math.hypot(nx, ny);
      const minDist = a.r + b.r;
      if (dist >= minDist || dist < 1e-6) continue;
      nx /= dist;
      ny /= dist;
      const invA = 1 / (a.r * a.r); // 1 / mass, mass ∝ r²
      const invB = 1 / (b.r * b.r);
      const invSum = invA + invB;
      const overlap = minDist - dist;
      a.x -= nx * overlap * (invA / invSum);
      a.y -= ny * overlap * (invA / invSum);
      b.x += nx * overlap * (invB / invSum);
      b.y += ny * overlap * (invB / invSum);
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        const imp = (-(1 + RESTITUTION) * vn) / invSum;
        a.vx -= imp * invA * nx;
        a.vy -= imp * invA * ny;
        b.vx += imp * invB * nx;
        b.vy += imp * invB * ny;
      }
    }
  }
}

// Publish the live orb centres + radii to the uniform vec3 array (mutate in place).
function writeBlobs(out: THREE.Vector3[], orbs: Orb[]) {
  for (let i = 0; i < orbs.length; i++) {
    out[i].set(orbs[i].x, orbs[i].y, orbs[i].r);
  }
}

interface AuraProps {
  variant?: "amber" | "ember";
  /** the owning row (or the wash) is open — drive the loop */
  active: boolean;
  reducedMotion: boolean;
  /** fade lerp rate; lower = slower, dreamier (used by the entrance wash) */
  fadeSpeed?: number;
  /**
   * Element whose live box gives the aspect ratio. drei's per-view size is
   * captured at mount (when the reveal is collapsed), so we read the DOM
   * directly each frame instead. Falls back to the viewport (entrance wash).
   */
  sizeRef?: RefObject<HTMLElement | null>;
  /** desaturate toward the ambient cool-white tint (gate/home field) */
  white?: boolean;
  /** opacity ceiling the fade settles to when active (white field stays faint) */
  maxFade?: number;
  /**
   * Cap the render cadence (ms between frames). 0 = run at the demand loop's
   * natural rate (per-row reveals, brief). The persistent ambient field passes
   * ~30ms so it never drives a continuous 60fps loop on the main thread.
   */
  throttleMs?: number;
  /** multiply the drift rate; >1 makes the noise visibly move while staying slow */
  timeScale?: number;
}

/**
 * The aura, rendered as a fullscreen triangle inside whichever <View> hosts it.
 * Render-on-demand: u_time + u_fade advance only while active (or while the
 * fade is still settling), each frame requesting the next via invalidate()
 * (optionally throttled). Under reduced motion it paints a single static frame
 * and never loops.
 */
export function Aura({
  variant = "amber",
  active,
  reducedMotion,
  fadeSpeed = 6,
  sizeRef,
  white = false,
  maxFade = 1,
  throttleMs = 0,
  timeScale = 1,
}: AuraProps) {
  const matRef = useRef<AuraMaterialImpl>(null);
  const invalidate = useThree((s) => s.invalidate);
  const nextTimer = useRef<number | null>(null);

  // Pointer state for the white field's gentle cursor parallax. Kept in refs so
  // pointermove never re-renders. UV space (y up). `target` is the latest
  // pointer; `smooth` lags it heavily; `engage` rises on movement and decays
  // slowly so the lean eases back to rest when the cursor stops.
  const mTarget = useRef(new THREE.Vector2(0.5, 0.5));
  const mSmooth = useRef(new THREE.Vector2(0.5, 0.5));
  const mEngage = useRef(0);

  // White-field orb physics state. Kept in refs so the sim never triggers a
  // re-render. `energy` starts hot and only decays — Aura stays mounted across
  // active toggles (see Field.tsx), so the entrance runs lively once on load and
  // every later return to the tab/hero is already calm.
  const orbs = useRef<Orb[]>(
    Array.from({ length: BLOB_COUNT }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 0,
    })),
  );
  const energy = useRef(START_ENERGY);
  const orbsReady = useRef(false);
  // The vec3 array handed to the shader (u_blobs). Owned here so it is never
  // aliased with another material instance; mutated in place each frame.
  const blobVecs = useMemo(
    () => Array.from({ length: BLOB_COUNT }, () => new THREE.Vector3()),
    [],
  );

  // Fullscreen triangle in clip space (one tiny geometry per Aura instance).
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

  // Request the next frame, capping cadence to throttleMs when set. A single
  // pending timer at a time keeps the chain from compounding.
  const requestNext = useCallback(() => {
    if (throttleMs <= 0) {
      invalidate();
      return;
    }
    if (nextTimer.current != null) return;
    nextTimer.current = window.setTimeout(() => {
      nextTimer.current = null;
      invalidate();
    }, throttleMs);
  }, [invalidate, throttleMs]);

  // Kick a frame whenever active flips (the demand loop is otherwise idle).
  useEffect(() => {
    requestNext();
  }, [active, requestNext]);

  // Drop any pending throttle timer on unmount.
  useEffect(
    () => () => {
      if (nextTimer.current != null) window.clearTimeout(nextTimer.current);
    },
    [],
  );

  // Cursor parallax — white ambient field only. Just record the pointer position
  // (UV) and (re)engage; the demand loop (already alive while the field is
  // visible) does the smoothing + decay each frame. No velocity, no stirring.
  // Skipped under the static guard (software WebGL / reduced motion).
  useEffect(() => {
    if (!white || reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      mTarget.current.set(
        e.clientX / Math.max(window.innerWidth, 1),
        1 - e.clientY / Math.max(window.innerHeight, 1), // flip to UV (y up)
      );
      mEngage.current = 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [white, reducedMotion]);

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;

    const el = sizeRef?.current;
    const w = Math.max(el ? el.clientWidth : window.innerWidth, 1);
    const h = Math.max(el ? el.clientHeight : window.innerHeight, 1);
    m.uniforms.u_res.value.set(w, h); // only the ratio is used by the shader
    m.uniforms.u_cool.value = variant === "ember" ? 1 : 0;
    m.uniforms.u_white.value = white ? 1 : 0;
    const aspect = w / h;

    // White field: own the u_blobs array, and seed the orbs once now that the
    // aspect is known (also the fixed arrangement for the static frame).
    if (white) {
      m.uniforms.u_blobs.value = blobVecs;
      if (!orbsReady.current) {
        seedOrbs(orbs.current, aspect);
        orbsReady.current = true;
      }
    }

    const target = active ? maxFade : 0;

    if (reducedMotion) {
      // Single static frame: snap fade, hold time, never re-invalidate. The orbs
      // sit at their seeded arrangement — no physics, no per-frame work.
      m.uniforms.u_fade.value = target;
      if (white) writeBlobs(blobVecs, orbs.current);
      return;
    }

    const d = Math.min(1, delta * fadeSpeed);
    m.uniforms.u_fade.value += (target - m.uniforms.u_fade.value) * d;
    if (active) m.uniforms.u_time.value += delta * timeScale;

    if (white) {
      // Advance the orb sim only while the field is open (mirrors u_time), then
      // publish the live centres/radii to the shader.
      if (active) stepPhysics(orbs.current, energy, delta, aspect);
      writeBlobs(blobVecs, orbs.current);

      // Cursor parallax: heavily smooth the pointer toward its target and decay
      // the engagement, then feed the small offset (centred = rest) to the
      // shader. The work reveals leave u_disp at its default (0), a no-op there.
      mSmooth.current.lerp(mTarget.current, Math.min(1, delta * DISP_SMOOTH));
      mEngage.current *= Math.max(0, 1 - delta * DISP_DECAY);
      m.uniforms.u_disp.value.set(
        (mSmooth.current.x - 0.5) * mEngage.current,
        (mSmooth.current.y - 0.5) * mEngage.current,
      );
    }

    // Keep the loop alive while open or while the fade-out completes.
    if (active || m.uniforms.u_fade.value > 0.003) {
      requestNext();
    }
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <auraMaterial
        ref={matRef}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
