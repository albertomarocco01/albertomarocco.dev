"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AuraMaterial,
  BLOB_COUNT,
  VARIANT_PALETTE,
  type AuraMaterialImpl,
  type AuraVariant,
} from "./aura-material";
import { useApp } from "@/components/providers/AppProvider";

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
const CORE_RADIUS = 0.055; // base collision-core radius (scaled for aspect-correct coordinates)
const RADIUS_BASE = 0.8; // floor of the per-orb radius fraction
const RADIUS_VARY = 0.4; // size variance multiplier
const WALL_BOUNDS = 0.475; // half-extent of play area (scaled)
const SEED_INSET = 0.9; // initial spread as a fraction of WALL_BOUNDS
const BASE_SPEED = 0.25; // entrance speed boost (scaled)
const IDLE_DRIFT = 0.065; // calm drift floor speed (scaled)
const START_ENERGY = 1;
const ENERGY_DECAY = 0.7;
const SPEED_TRACK = 1.4;
const JITTER = 0.6; // heading wobble (rad/sec)
const RESTITUTION = 1.0; // fully elastic collisions, matching reference
const ENERGY_DT_MAX = 0.1; // clamp on the energy-decay timestep (s) — a long stall (tab refocus) lands already-calm, not mid-burst
const STEP_DT_MAX = 0.05; // clamp on the integration timestep (s) — bounds per-frame motion so a long stall can't explode the sim
const FADE_EPS = 0.003; // demand-loop keep-alive cutoff: stop re-arming once the fade-out has settled below this

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
    o.x = (a * 2 - 1) * WALL_BOUNDS * aspect * SEED_INSET; // spread just inside the walls
    o.y = (b * 2 - 1) * WALL_BOUNDS * SEED_INSET;
    o.r = CORE_RADIUS * (RADIUS_BASE + RADIUS_VARY * a);
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
  const eDt = Math.min(delta, ENERGY_DT_MAX);
  energy.current *= Math.exp(-ENERGY_DECAY * eDt);

  const dt = Math.min(delta, STEP_DT_MAX);
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

  // soft walls: force field for smooth bounce matching reference spring physics
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    
    // X direction spring force and damping
    const dX = Math.abs(o.x) - boundX;
    if (dX > 0) {
      const stiffness = 8.0;
      const direction = Math.sign(o.x);
      o.vx -= direction * dX * stiffness * dt;
      if (o.vx * direction > 0) {
        o.vx *= Math.exp(-3.5 * dt);
      }
    }

    // Y direction spring force and damping
    const dY = Math.abs(o.y) - boundY;
    if (dY > 0) {
      const stiffness = 8.0;
      const direction = Math.sign(o.y);
      o.vy -= direction * dY * stiffness * dt;
      if (o.vy * direction > 0) {
        o.vy *= Math.exp(-3.5 * dt);
      }
    }

    // Safety hard clamp bounds to prevent escaping
    const maxLimitX = aspect * 0.525;
    const maxLimitY = 0.525;
    if (o.x > maxLimitX) { o.x = maxLimitX; o.vx = -Math.abs(o.vx) * 0.5; }
    if (o.x < -maxLimitX) { o.x = -maxLimitX; o.vx = Math.abs(o.vx) * 0.5; }
    if (o.y > maxLimitY) { o.y = maxLimitY; o.vy = -Math.abs(o.vy) * 0.5; }
    if (o.y < -maxLimitY) { o.y = -maxLimitY; o.vy = Math.abs(o.vy) * 0.5; }
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
  variant?: AuraVariant;
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

  const { entered } = useApp();
  const prevEntered = useRef(entered);

  useEffect(() => {
    if (entered && !prevEntered.current && !reducedMotion && white) {
      // Trigger energetic bubble speed explosion upon loading completion
      energy.current = START_ENERGY;
      const speed = BASE_SPEED * START_ENERGY * 2.5 + IDLE_DRIFT;
      for (let i = 0; i < orbs.current.length; i++) {
        const ang = Math.random() * Math.PI * 2;
        orbs.current[i].vx = Math.cos(ang) * speed;
        orbs.current[i].vy = Math.sin(ang) * speed;
      }
      invalidate();
    }
    prevEntered.current = entered;
  }, [entered, reducedMotion, white, invalidate]);

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

  // Drop any pending throttle timer on unmount. Reset the ref to null too: under
  // React StrictMode (dev) effects mount→cleanup→remount, and if the ref kept a
  // stale (already-cleared) timer id, requestNext()'s `nextTimer.current != null`
  // guard would no-op forever on the remount — the kick never fires, invalidate()
  // never runs, and the demand loop never starts (the field paints nothing).
  useEffect(
    () => () => {
      if (nextTimer.current != null) {
        window.clearTimeout(nextTimer.current);
        nextTimer.current = null;
      }
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
    // Colour family for the warm work smoke. Ignored in white mode (the white
    // branch never reads u_hot/u_mid), so the gate/home field leaves it at amber.
    const pal = VARIANT_PALETTE[variant] ?? VARIANT_PALETTE.amber;
    m.uniforms.u_hot.value.set(pal.hot[0], pal.hot[1], pal.hot[2]);
    m.uniforms.u_mid.value.set(pal.mid[0], pal.mid[1], pal.mid[2]);
    m.uniforms.u_white.value = white ? 1 : 0;
    // Clamp the aspect to a finite, positive value for the white-field sim. A
    // transient zero/NaN box (u_res 0 -> aspect 0/NaN) would otherwise seed orbs
    // at NaN centres / zero radii and blow up the gaussian field to NaN, painting
    // nothing. White-field use only (seeding + physics); the shader reads u_res.
    const rawAspect = w / h;
    const aspect = Number.isFinite(rawAspect) && rawAspect > 0 ? rawAspect : 1;
    const resOk = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;

    // White field: own the u_blobs array, and seed the orbs once a finite,
    // non-zero box is known (also the fixed arrangement for the static frame).
    if (white) {
      m.uniforms.u_blobs.value = blobVecs;
      if (!orbsReady.current && resOk) {
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
    if (active || m.uniforms.u_fade.value > FADE_EPS) {
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
