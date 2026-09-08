import * as THREE from "three";
import {
  AGITATE,
  AUTO,
  BRUSH,
  DEVELOP,
  LOOK,
  MOTION_DYE,
  PRINTS,
  SIM,
  STIR,
  UI,
} from "../darkroom.config";
import type { DarkroomMode, Phase, TrayBus } from "./tray-bus";
import {
  ADVECT_FRAG,
  AGITATE_FRAG,
  COMPOSITE_FRAG,
  COVERAGE_FRAG,
  CURL_FRAG,
  DIVERGENCE_FRAG,
  EXPOSURE_FRAG,
  FULLSCREEN_VERT,
  GRADIENT_FRAG,
  PRESSURE_FRAG,
  REMAP_FRAG,
  SCALE_FRAG,
  SPLAT_FRAG,
  VORTICITY_FRAG,
} from "./shaders";

/**
 * The developing tray, as one plain class the React scene drives:
 *
 *   fluid mode — stable fluids on ping-pong half-float targets (velocity RG16F,
 *   dye R16F, pressure / divergence / curl), an exposure buffer that integrates
 *   the dye, a composite pass that develops the print through a tone curve;
 *
 *   brush mode — reduced motion, no renderable half-float, or a software
 *   rasteriser: no fluid, no timers; the pointer paints exposure directly and
 *   prints advance on request. The mode can flip on the live engine (a
 *   prefers-reduced-motion toggle) without losing the print.
 *
 * Every GPU resource is created here and released in `dispose()`. Targets are
 * owned by the class rather than drei's `useFBO` so ping-pong swaps and the
 * resize remap (the developed image follows the re-fitted print) live in one
 * place.
 */

type RT = THREE.WebGLRenderTarget;
type Uniforms = Record<string, THREE.IUniform>;

class PingPong {
  constructor(
    public read: RT,
    public write: RT,
  ) {}
  swap() {
    const t = this.read;
    this.read = this.write;
    this.write = t;
  }
  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

interface FluidGrids {
  velocity: PingPong;
  dye: PingPong;
  pressure: PingPong;
  divergence: RT;
  curl: RT;
  vw: number;
  vh: number;
  dw: number;
  dh: number;
}

const TWO_PI = Math.PI * 2;
const N_PRINTS = PRINTS.length;
const wrap = (i: number) => ((i % N_PRINTS) + N_PRINTS) % N_PRINTS;
const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** `--accent` rgba(176,120,70) as sRGB 0..1 — composited in display space like CSS would. */
const AMBER = new THREE.Vector3(176 / 255, 120 / 255, 70 / 255);

function makeTarget(w: number, h: number, format: THREE.PixelFormat, type: THREE.TextureDataType): RT {
  return new THREE.WebGLRenderTarget(w, h, {
    format,
    type,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

function makePing(w: number, h: number, format: THREE.PixelFormat, type: THREE.TextureDataType) {
  return new PingPong(makeTarget(w, h, format, type), makeTarget(w, h, format, type));
}

function makeMaterial(fragment: string, uniforms: Uniforms, defines?: Record<string, string>) {
  return new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: fragment,
    uniforms,
    // three warns on an explicit `defines: undefined`
    ...(defines ? { defines } : {}),
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  });
}

/** Renderable half-float targets: WebGL2 + EXT_color_buffer_(half_)float. */
export function halfFloatRenderable(gl: THREE.WebGLRenderer): boolean {
  if (!gl.capabilities.isWebGL2) return false;
  return gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float");
}

export interface DarkroomCapabilities {
  halfFloat: boolean;
  software: boolean;
}

export class DarkroomEngine {
  private readonly gl: THREE.WebGLRenderer;
  private readonly bus: TrayBus;
  private readonly floatOk: boolean;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly geometry: THREE.BufferGeometry;
  private readonly mesh: THREE.Mesh;
  private readonly prevAutoClear: boolean;
  private disposed = false;
  private _mode: DarkroomMode = "brush";
  private wakeFn: (() => void) | null = null;

  // ── sizes ──
  private width = 1;
  private height = 1;
  private dpr = 1;
  private readonly aspectN = new THREE.Vector2(1, 1);
  private readonly res = new THREE.Vector2(1, 1);
  private readonly velTexel = new THREE.Vector2(1 / 256, 1 / 256);
  private readonly dyeTexel = new THREE.Vector2(1 / 512, 1 / 512);
  private readonly rect = new THREE.Vector4(0.25, 0.25, 0.5, 0.5);

  // ── targets ──
  private fluid: FluidGrids | null = null;
  private exposure!: PingPong;
  private readonly coverageRT: RT;
  private readonly coverageBuf: Uint8Array;

  // ── materials ──
  private readonly advectVel: THREE.ShaderMaterial;
  private readonly advectDye: THREE.ShaderMaterial;
  private readonly curlMat: THREE.ShaderMaterial;
  private readonly vorticityMat: THREE.ShaderMaterial;
  private readonly splatMat: THREE.ShaderMaterial;
  private readonly agitateMat: THREE.ShaderMaterial;
  private readonly divergenceMat: THREE.ShaderMaterial;
  private readonly pressureMat: THREE.ShaderMaterial;
  private readonly gradientMat: THREE.ShaderMaterial;
  private readonly scaleMat: THREE.ShaderMaterial;
  private readonly remapMat: THREE.ShaderMaterial;
  private readonly exposureMat: THREE.ShaderMaterial;
  private readonly coverageMat: THREE.ShaderMaterial;
  private readonly compositeMat: THREE.ShaderMaterial;

  // ── prints ──
  private readonly loader = new THREE.TextureLoader();
  private readonly textures = new Map<number, THREE.Texture>();
  private readonly loading = new Set<number>();
  private readonly failures = new Map<number, number>();
  private readonly broken = new Set<number>();
  private readonly placeholder: THREE.DataTexture;
  private printTex: THREE.Texture | null = null;
  private index = 0;
  /** bumped whenever the exposure buffer's content changes owner (new print,
   *  context restore) — an async readback issued before is stale */
  private generation = 0;

  // ── state ──
  private phase: Phase = "developing";
  private phaseT = 0;
  private drainTarget = 0;
  private drain = 0;
  private fixS = 0;
  private touched = false;
  private started = false;
  private idleT = 0;
  private autoOn = false;
  private autoT = 0;
  private autoPrev: { x: number; y: number } | null = null;
  private time = 0;
  private acc = 0;
  private coverage = 0;
  private coverageT = 0;
  private coverageDirty = false;
  private readPending = false;
  private hudT = 0;
  private burst = 0;
  private burstSign = 1;
  private sloshAmp = 0;
  private sloshPhase = 0;
  private readonly slosh = new THREE.Vector2();

  constructor(gl: THREE.WebGLRenderer, bus: TrayBus) {
    this.gl = gl;
    this.bus = bus;
    this.floatOk = halfFloatRenderable(gl);
    this.prevAutoClear = gl.autoClear;
    // every pass overwrites its whole target — clearing first is wasted bandwidth
    gl.autoClear = false;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    this.mesh = new THREE.Mesh(this.geometry);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    this.placeholder.needsUpdate = true;

    const n = DEVELOP.coverageSize;
    this.coverageRT = makeTarget(n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.coverageBuf = new Uint8Array(n * n * 4);

    const tex = { value: null as THREE.Texture | null };
    this.advectVel = makeMaterial(
      ADVECT_FRAG,
      {
        u_velocity: { ...tex },
        u_source: { ...tex },
        u_velTexel: { value: this.velTexel },
        u_texel: { value: this.velTexel },
        u_dt: { value: SIM.dt },
        u_dissipation: { value: SIM.velocityDissipation },
        u_viscosity: { value: SIM.viscosity },
      },
      { VELOCITY: "" },
    );
    this.advectDye = makeMaterial(
      ADVECT_FRAG,
      {
        u_velocity: { ...tex },
        u_source: { ...tex },
        u_velTexel: { value: this.velTexel },
        u_texel: { value: this.dyeTexel },
        u_dt: { value: SIM.dt },
        u_dissipation: { value: SIM.dyeDissipation },
        u_motionRate: { value: MOTION_DYE.rate },
        u_motionLow: { value: MOTION_DYE.speedLow },
        u_motionHigh: { value: MOTION_DYE.speedHigh },
        u_accept: { value: 1 },
      },
      { DYE: "" },
    );
    this.curlMat = makeMaterial(CURL_FRAG, { u_velocity: { ...tex }, u_texel: { value: this.velTexel } });
    this.vorticityMat = makeMaterial(VORTICITY_FRAG, {
      u_velocity: { ...tex },
      u_curl: { ...tex },
      u_texel: { value: this.velTexel },
      u_strength: { value: SIM.vorticity },
      u_dt: { value: SIM.dt },
    });
    this.splatMat = makeMaterial(SPLAT_FRAG, {
      u_target: { ...tex },
      u_point: { value: new THREE.Vector2() },
      u_add: { value: new THREE.Vector3() },
      u_set: { value: new THREE.Vector3() },
      u_blend: { value: 0 },
      u_radius: { value: STIR.radius },
      u_aspectN: { value: this.aspectN },
      u_clamp: { value: 0 },
    });
    this.agitateMat = makeMaterial(AGITATE_FRAG, {
      u_velocity: { ...tex },
      u_aspectN: { value: this.aspectN },
      u_radial: { value: 0 },
      u_swirl: { value: 0 },
      u_shear: { value: 0 },
      u_phase: { value: 0 },
      u_dt: { value: SIM.dt },
    });
    this.divergenceMat = makeMaterial(DIVERGENCE_FRAG, { u_velocity: { ...tex }, u_texel: { value: this.velTexel } });
    this.pressureMat = makeMaterial(PRESSURE_FRAG, {
      u_pressure: { ...tex },
      u_divergence: { ...tex },
      u_texel: { value: this.velTexel },
    });
    this.gradientMat = makeMaterial(GRADIENT_FRAG, {
      u_pressure: { ...tex },
      u_velocity: { ...tex },
      u_texel: { value: this.velTexel },
    });
    this.scaleMat = makeMaterial(SCALE_FRAG, {
      u_source: { ...tex },
      u_scale: { value: 1 },
      u_add: { value: 0 },
      u_clamp: { value: 0 },
    });
    this.remapMat = makeMaterial(REMAP_FRAG, {
      u_source: { ...tex },
      u_from: { value: new THREE.Vector4(0, 0, 1, 1) },
      u_to: { value: new THREE.Vector4(0, 0, 1, 1) },
    });
    this.exposureMat = makeMaterial(EXPOSURE_FRAG, {
      u_exposure: { ...tex },
      u_dye: { ...tex },
      u_rate: { value: DEVELOP.rate },
      u_dt: { value: SIM.dt },
      u_accept: { value: 1 },
      u_fix: { value: 0 },
    });
    this.coverageMat = makeMaterial(COVERAGE_FRAG, {
      u_exposure: { ...tex },
      u_print: { value: this.placeholder },
      u_rect: { value: this.rect },
      u_size: { value: n },
    });
    const c = LOOK.curve;
    this.compositeMat = makeMaterial(COMPOSITE_FRAG, {
      u_print: { value: this.placeholder },
      u_exposure: { ...tex },
      u_velocity: { ...tex },
      u_dye: { ...tex },
      u_res: { value: this.res },
      u_aspectN: { value: this.aspectN },
      u_rect: { value: this.rect },
      u_velTexel: { value: this.velTexel },
      u_drain: { value: 0 },
      u_seed: { value: 0 },
      u_fluid: { value: 0 },
      u_slosh: { value: this.slosh },
      u_refraction: { value: LOOK.refraction },
      u_specular: { value: LOOK.specular },
      u_specularSpeed: { value: LOOK.specularSpeed },
      u_grain: { value: LOOK.grain },
      u_paperTex: { value: LOOK.paperTexture },
      u_paperWhite: { value: LOOK.paperWhite },
      u_safeAlpha: { value: LOOK.safelightAlpha },
      u_safeRadius: { value: LOOK.safelightRadius },
      u_vignette: { value: LOOK.vignette },
      u_dyeShade: { value: LOOK.dyeShade },
      u_curve: { value: new THREE.Vector4(c.lift, c.kneeMin, c.kneeMax, c.dmax) },
      u_amber: { value: AMBER },
    });

    const size = gl.getSize(new THREE.Vector2());
    this.allocate(size.x, size.y, gl.getPixelRatio());
    this.warmBrush();

    this.bus.publish({ index: 0, count: N_PRINTS, coverage: 0, phase: "developing", touched: false, started: false });
    this.requestPrint(0);
    this.requestPrint(1);
  }

  get mode(): DarkroomMode {
    return this._mode;
  }

  /** Fluid or brush, switchable on the live engine (a reduced-motion toggle).
   *  `wake` is registered on the bus in brush mode so an input renders a frame. */
  setMode(mode: DarkroomMode, wake: (() => void) | null) {
    if (this.disposed) return;
    this.wakeFn = wake;
    this.bus.wake = mode === "brush" ? wake : null;
    if (mode !== this._mode) {
      this._mode = mode;
      this.compositeMat.uniforms.u_fluid.value = mode === "fluid" ? 1 : 0;
      if (mode === "fluid") {
        this.allocateFluid();
        this.warmFluid();
      } else {
        this.disposeFluid();
        this.autoOn = false;
        this.burst = 0;
        this.sloshAmp = 0;
        this.slosh.set(0, 0);
        // brush mode has no timers: settle whatever timed phase was running
        if (this.phase === "fixing") this.fixNow();
        else if (this.phase === "draining") {
          this.phaseT = DEVELOP.drain;
          this.finishDrain();
        }
      }
    }
    this.wakeFn?.();
  }

  // ── sizing ──────────────────────────────────────────────────────────────

  /** Aspect-corrected grid for a given short side, long side capped (an
   *  extreme viewport must not ask for a texture wider than the GPU allows). */
  private fluidGrid(short: number): [number, number] {
    let w: number;
    let h: number;
    if (this.width >= this.height) {
      h = short;
      w = Math.round((short * this.width) / this.height);
    } else {
      w = short;
      h = Math.round((short * this.height) / this.width);
    }
    const cap = Math.min(SIM.gridLongMax, this.gl.capabilities.maxTextureSize);
    const long = Math.max(w, h);
    if (long > cap) {
      const s = cap / long;
      w = Math.max(8, Math.round(w * s));
      h = Math.max(8, Math.round(h * s));
    }
    return [w, h];
  }

  /** Create the fluid grids for the current size; carry the liquid over from
   *  the old grids (a window drag must not still the tray mid-gesture). */
  private allocateFluid() {
    const [vw, vh] = this.fluidGrid(SIM.velocityShort);
    const [dw, dh] = this.fluidGrid(SIM.dyeShort);
    const old = this.fluid;
    if (old && old.vw === vw && old.vh === vh && old.dw === dw && old.dh === dh) return;
    this.velTexel.set(1 / vw, 1 / vh);
    this.dyeTexel.set(1 / dw, 1 / dh);
    const hf = THREE.HalfFloatType;
    const next: FluidGrids = {
      velocity: makePing(vw, vh, THREE.RGFormat, hf),
      dye: makePing(dw, dh, THREE.RedFormat, hf),
      pressure: makePing(vw, vh, THREE.RedFormat, hf),
      divergence: makeTarget(vw, vh, THREE.RedFormat, hf),
      curl: makeTarget(vw, vh, THREE.RedFormat, hf),
      vw,
      vh,
      dw,
      dh,
    };
    if (old) {
      this.blit(old.velocity.read.texture, next.velocity.read, 1, 0, false);
      this.blit(old.dye.read.texture, next.dye.read, 1, 0, true);
      this.blit(old.pressure.read.texture, next.pressure.read, 1, 0, false);
      this.disposeFluidGrids(old);
    } else {
      this.clear(next.velocity.read, next.dye.read, next.pressure.read);
    }
    this.clear(next.velocity.write, next.dye.write, next.pressure.write);
    this.fluid = next;
  }

  private disposeFluidGrids(f: FluidGrids) {
    f.velocity.dispose();
    f.dye.dispose();
    f.pressure.dispose();
    f.divergence.dispose();
    f.curl.dispose();
  }

  private disposeFluid() {
    if (this.fluid) this.disposeFluidGrids(this.fluid);
    this.fluid = null;
  }

  private allocate(width: number, height: number, dpr: number) {
    const oldRect = this.rect.clone();
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = dpr;
    const short = Math.min(this.width, this.height);
    this.aspectN.set(this.width / short, this.height / short);
    this.res.set(Math.round(this.width * dpr), Math.round(this.height * dpr));
    this.updateRect();

    if (this._mode === "fluid") this.allocateFluid();

    // exposure at display resolution, long side capped; brush mode without
    // half-float support falls back to RGBA8 (the brush adds coarse steps, so
    // 8 bits are enough there)
    const long = Math.max(this.width, this.height) * dpr;
    const scale = Math.min(1, Math.min(SIM.exposureLong, this.gl.capabilities.maxTextureSize) / long);
    const ew = Math.max(2, Math.round(this.width * dpr * scale));
    const eh = Math.max(2, Math.round(this.height * dpr * scale));
    const old = this.exposure as PingPong | undefined;
    if (old && old.read.width === ew && old.read.height === eh && oldRect.equals(this.rect)) return;
    const format = this.floatOk ? THREE.RedFormat : THREE.RGBAFormat;
    const type = this.floatOk ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const next = makePing(ew, eh, format, type);
    if (old) {
      // the developed image follows the re-fitted print: remap in print space
      // (old rect → new rect), so a rotation keeps the development on the paper
      const u = this.remapMat.uniforms;
      u.u_source.value = old.read.texture;
      (u.u_from.value as THREE.Vector4).copy(oldRect);
      (u.u_to.value as THREE.Vector4).copy(this.rect);
      this.draw(this.remapMat, next.read);
      old.dispose();
    } else {
      this.clear(next.read);
    }
    this.clear(next.write);
    this.exposure = next;
  }

  /** The print, aspect-fit inside the tray with LOOK.printMargin on each axis. */
  private updateRect() {
    const img = this.printTex?.image as { naturalWidth?: number; width?: number; naturalHeight?: number; height?: number } | undefined;
    const iw = img?.naturalWidth || img?.width || 4;
    const ih = img?.naturalHeight || img?.height || 5;
    const m = LOOK.printMargin;
    const boxW = this.width * (1 - 2 * m);
    const boxH = this.height * (1 - 2 * m);
    const s = Math.min(boxW / iw, boxH / ih);
    const w = (iw * s) / this.width;
    const h = (ih * s) / this.height;
    this.rect.set(0.5 - w / 2, 0.5 - h / 2, w, h);
  }

  resize(width: number, height: number, dpr: number) {
    if (this.disposed) return;
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.allocate(width, height, dpr);
    this.wakeFn?.();
  }

  // ── warm-up: compile every program before the first visible frame ───────

  private warmBrush() {
    this.brush(0.5, 0.5, 0.01, 0);
    this.coverageMat.uniforms.u_exposure.value = this.exposure.read.texture;
    this.draw(this.coverageMat, this.coverageRT);
    this.blit(this.exposure.read.texture, this.exposure.write, 1, 0, false);
    const u = this.remapMat.uniforms;
    u.u_source.value = this.exposure.read.texture;
    (u.u_from.value as THREE.Vector4).copy(this.rect);
    (u.u_to.value as THREE.Vector4).copy(this.rect);
    this.draw(this.remapMat, this.exposure.write);
    this.composite();
  }

  private warmFluid() {
    const f = this.fluid;
    if (!f) return;
    // one silent step (no forces) plus the force pass with zero strength
    this.simStep(SIM.dt);
    const a = this.agitateMat.uniforms;
    a.u_radial.value = 0;
    a.u_swirl.value = 0;
    a.u_shear.value = 0;
    a.u_velocity.value = f.velocity.read.texture;
    this.draw(this.agitateMat, f.velocity.write);
    f.velocity.swap();
    this.composite();
  }

  // ── prints ──────────────────────────────────────────────────────────────

  private requestPrint(i: number) {
    const idx = wrap(i);
    if (this.textures.has(idx) || this.loading.has(idx) || this.broken.has(idx)) return;
    this.loading.add(idx);
    this.loader.load(
      PRINTS[idx],
      (tex) => {
        this.loading.delete(idx);
        if (this.disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        this.textures.set(idx, tex);
        this.onPrintReady(idx);
      },
      undefined,
      () => {
        this.loading.delete(idx);
        if (this.disposed) return;
        const n = (this.failures.get(idx) ?? 0) + 1;
        this.failures.set(idx, n);
        if (n < 2) {
          this.requestPrint(idx); // one retry
        } else {
          this.broken.add(idx);
          this.onPrintBroken(idx);
        }
      },
    );
  }

  /** The first print, or the one a drain is waiting on. */
  private onPrintReady(idx: number) {
    if (this.phase === "draining") {
      if (idx === this.drainTarget && this.drainDone()) this.finishDrain();
    } else if (!this.printTex && idx === this.index) {
      this.loadPrint(idx);
    }
  }

  /** A print that will never load must not leave the tray waiting: skip it. */
  private onPrintBroken(idx: number) {
    if (this.phase === "draining") {
      if (idx !== this.drainTarget) return;
      this.drainTarget = this.nextAvailable(idx + 1, 1);
      this.requestPrint(this.drainTarget);
      if (this.drainDone()) this.finishDrain();
    } else if (!this.printTex && idx === this.index) {
      this.index = this.nextAvailable(idx + 1, 1);
      // the replacement may already be resident (print 1 is prefetched)
      if (this.textures.has(this.index)) this.loadPrint(this.index);
      else {
        this.requestPrint(this.index);
        this.publish(true);
      }
    }
  }

  /** The first print at or after `start` (walking `dir`) that is not broken. */
  private nextAvailable(start: number, dir: 1 | -1): number {
    for (let k = 0; k < N_PRINTS; k++) {
      const idx = wrap(start + k * dir);
      if (!this.broken.has(idx)) return idx;
    }
    return wrap(start);
  }

  private drainDone() {
    return this._mode === "brush" || this.phaseT >= DEVELOP.drain;
  }

  /** Keep only the current print and its neighbours on the GPU. */
  private evict() {
    const keep = new Set([this.index, wrap(this.index + 1), wrap(this.index - 1), this.drainTarget]);
    for (const [i, t] of this.textures) {
      if (!keep.has(i)) {
        t.dispose();
        this.textures.delete(i);
      }
    }
  }

  /** A fresh print in a still tray: every buffer reset, the hint back, the idle clock at zero. */
  private loadPrint(idx: number) {
    this.generation++;
    this.index = idx;
    this.printTex = this.textures.get(idx) ?? null;
    this.compositeMat.uniforms.u_print.value = this.printTex ?? this.placeholder;
    this.coverageMat.uniforms.u_print.value = this.printTex ?? this.placeholder;
    this.compositeMat.uniforms.u_seed.value = idx * 17.13 + 3.7;
    this.updateRect();
    this.clear(this.exposure.read, this.exposure.write);
    const f = this.fluid;
    if (f) this.clear(f.velocity.read, f.velocity.write, f.dye.read, f.dye.write, f.pressure.read, f.pressure.write);
    this.phase = "developing";
    this.phaseT = 0;
    this.drain = 0;
    this.fixS = 0;
    this.coverage = 0;
    this.coverageT = 0;
    this.coverageDirty = false;
    this.touched = false;
    this.idleT = 0;
    this.autoOn = false;
    this.autoT = 0;
    this.burst = 0;
    this.sloshAmp = 0;
    this.compositeMat.uniforms.u_drain.value = 0;
    this.publish(true);
    this.requestPrint(idx + 1);
    this.evict();
    this.wakeFn?.();
  }

  /** ← / → : drain (fluid) or cut (brush) to a neighbouring print. A command
   *  during a drain re-targets it; nothing is ever discarded. */
  private changePrint(dir: 1 | -1) {
    if (this.phase === "draining") {
      this.drainTarget = this.nextAvailable(this.drainTarget + dir, dir);
      this.requestPrint(this.drainTarget);
      if (this.drainDone()) this.finishDrain();
      return;
    }
    const target = this.nextAvailable(this.index + dir, dir);
    this.drainTarget = target;
    this.requestPrint(target);
    this.phase = "draining";
    this.phaseT = this._mode === "fluid" ? 0 : DEVELOP.drain;
    this.autoOn = false;
    this.publish(true);
    if (this._mode === "brush") this.finishDrain();
  }

  private startDrain(target: number) {
    this.drainTarget = this.nextAvailable(target, 1);
    this.requestPrint(this.drainTarget);
    this.phase = "draining";
    this.phaseT = 0;
    this.autoOn = false;
    this.publish(true);
  }

  private finishDrain() {
    if (this.textures.has(this.drainTarget)) this.loadPrint(this.drainTarget);
    // otherwise the loader callback (or onPrintBroken) lands it
  }

  /** Context restored: three rebuilt the GL objects blank — start the print over. */
  recover() {
    if (this.disposed) return;
    this.generation++;
    this.readPending = false;
    this.loadPrint(this.index);
  }

  // ── the frame ───────────────────────────────────────────────────────────

  step(delta: number) {
    if (this.disposed) return;
    const dt = Math.min(Math.max(delta, 0), 0.1);
    this.time += dt;

    const bus = this.bus;
    if (bus.input) {
      bus.input = false;
      this.touched = true;
      this.started = true;
      this.autoOn = false;
      this.idleT = 0;
    }
    while (bus.commands.length) {
      const c = bus.commands.shift();
      this.changePrint(c === "prev" ? -1 : 1);
    }

    if (this._mode === "fluid" && this.fluid) this.stepFluid(dt);
    else this.stepBrush(dt);

    this.composite();
    this.publish(false);
  }

  private stepFluid(dt: number) {
    const bus = this.bus;

    // fixed timestep, sub-stepped on long frames; a backlog is dropped, not
    // caught up, and a slow GPU (a frame over 50 ms) gets one step per frame so
    // the sub-stepping cannot spiral
    this.acc += dt;
    const budget = dt > 0.05 ? 1 : SIM.maxSubsteps;
    let steps = 0;
    while (this.acc >= SIM.dt && steps < budget) {
      this.acc -= SIM.dt;
      steps++;
    }
    if (this.acc > SIM.dt) this.acc = 0;

    for (const p of bus.pointers.values()) p.dtAcc += dt;
    if (steps > 0) {
      this.derivePointerVelocities();
      for (let i = 0; i < steps; i++) this.simStep(SIM.dt);
      if (this.phase === "developing") this.exposePointers();
      for (const [id, p] of bus.pointers) {
        if (p.ended) {
          bus.pointers.delete(id); // its last segment has just been used
          continue;
        }
        p.px = p.x;
        p.py = p.y;
        p.dirty = false;
        p.dtAcc = 0;
      }
    }

    // the development clock — and the stall guard: after AUTO.idleDelay
    // without input the current starts or resumes, touched print or not, and
    // runs until the print is fixed or the next input cancels it
    if (this.phase === "developing") {
      this.idleT += dt;
      if (!this.autoOn && this.idleT >= AUTO.idleDelay) {
        this.autoOn = true;
        this.autoT = 0;
        this.autoPrev = null;
        this.started = true;
      }
      this.coverageT += dt;
      if (this.coverageT >= DEVELOP.coverageInterval) {
        this.coverageT = 0;
        this.measureCoverage();
      }
    } else if (this.phase === "fixing") {
      this.phaseT += dt;
      if (this.phaseT >= DEVELOP.fixEase) {
        this.phase = "fixed";
        this.phaseT = 0;
        this.coverage = 1;
        this.publish(true);
      }
    } else if (this.phase === "fixed") {
      this.phaseT += dt;
      if (this.phaseT >= DEVELOP.fixedHold) this.startDrain(this.index + 1);
    } else if (this.phase === "draining") {
      this.phaseT += dt;
      this.drain = easeOut(this.phaseT / DEVELOP.drain);
      this.compositeMat.uniforms.u_drain.value = this.drain;
      if (this.phaseT >= DEVELOP.drain) this.finishDrain();
    }
  }

  /** A pass over the paper develops it directly, scaled by the travel since
   *  the last frame so speed does not matter; the dye and its wake add the
   *  liquid's character on top. */
  private exposePointers() {
    for (const p of this.bus.pointers.values()) {
      if (!p.dirty) continue;
      const travel = Math.hypot((p.x - p.px) * this.aspectN.x, (p.y - p.py) * this.aspectN.y);
      if (travel <= 0) continue;
      const amount = Math.min(STIR.exposeMax, travel * STIR.exposeGain) * (p.down ? STIR.pressMultiplier : 1);
      this.brush(p.x, p.y, STIR.exposeRadius, amount);
    }
  }

  private derivePointerVelocities() {
    for (const p of this.bus.pointers.values()) {
      if (p.fresh) {
        p.fresh = false;
        p.px = p.x;
        p.py = p.y;
        p.vx = 0;
        p.vy = 0;
        p.dirty = false;
        p.dtAcc = 0;
        continue;
      }
      const t = Math.max(p.dtAcc, 1e-3);
      const vx = (p.x - p.px) / t;
      const vy = (p.y - p.py) / t;
      // smoothed over two frames
      p.vx = (p.vx + vx) * 0.5;
      p.vy = (p.vy + vy) * 0.5;
    }
  }

  private simStep(dt: number) {
    const f = this.fluid!;
    const vel = f.velocity;
    const dye = f.dye;
    const pressure = f.pressure;
    const accept = this.phase === "developing";

    // 1. advect velocity
    this.advectVel.uniforms.u_velocity.value = vel.read.texture;
    this.advectVel.uniforms.u_source.value = vel.read.texture;
    this.draw(this.advectVel, vel.write);
    vel.swap();

    // 2. vorticity confinement (low — developer, not smoke)
    this.curlMat.uniforms.u_velocity.value = vel.read.texture;
    this.draw(this.curlMat, f.curl);
    this.vorticityMat.uniforms.u_velocity.value = vel.read.texture;
    this.vorticityMat.uniforms.u_curl.value = f.curl.texture;
    this.draw(this.vorticityMat, vel.write);
    vel.swap();

    // 3. forces: pointer, agitation, autonomous current
    this.injectPointers(dt, accept);
    this.agitate(dt, accept);
    if (this.autoOn) this.autonomous(dt, accept);

    // 4. projection
    this.divergenceMat.uniforms.u_velocity.value = vel.read.texture;
    this.draw(this.divergenceMat, f.divergence);
    this.blit(pressure.read.texture, pressure.write, SIM.pressureCarry, 0, false);
    pressure.swap();
    for (let i = 0; i < SIM.pressureIterations; i++) {
      this.pressureMat.uniforms.u_pressure.value = pressure.read.texture;
      this.pressureMat.uniforms.u_divergence.value = f.divergence.texture;
      this.draw(this.pressureMat, pressure.write);
      pressure.swap();
    }
    this.gradientMat.uniforms.u_pressure.value = pressure.read.texture;
    this.gradientMat.uniforms.u_velocity.value = vel.read.texture;
    this.draw(this.gradientMat, vel.write);
    vel.swap();

    // 5. the developer: advected, and laid down where the liquid moved
    this.advectDye.uniforms.u_velocity.value = vel.read.texture;
    this.advectDye.uniforms.u_source.value = dye.read.texture;
    this.advectDye.uniforms.u_accept.value = accept ? 1 : 0;
    this.draw(this.advectDye, dye.write);
    dye.swap();

    // 6. exposure integrates the dye; the fixing ease brings the rest to 1
    let fix = 0;
    if (this.phase === "fixing") {
      const s = smoothstep((this.phaseT + dt) / DEVELOP.fixEase);
      fix = this.fixS >= 0.999 ? 1 : Math.min(1, Math.max(0, (s - this.fixS) / (1 - this.fixS)));
      this.fixS = s;
    }
    this.exposureMat.uniforms.u_exposure.value = this.exposure.read.texture;
    this.exposureMat.uniforms.u_dye.value = dye.read.texture;
    this.exposureMat.uniforms.u_accept.value = accept ? 1 : 0;
    this.exposureMat.uniforms.u_fix.value = fix;
    this.draw(this.exposureMat, this.exposure.write);
    this.exposure.swap();

    // the slosh — a purely visual wobble of the refraction after a rock
    this.sloshAmp *= Math.exp(-dt / LOOK.sloshDecay);
    if (this.bus.spaceHeld) this.sloshAmp = Math.max(this.sloshAmp, LOOK.slosh * 0.5);
    this.sloshPhase += dt * TWO_PI * LOOK.sloshFreq;
    this.slosh.set(
      (this.sloshAmp * Math.sin(this.sloshPhase)) / this.aspectN.x,
      (this.sloshAmp * 0.6 * Math.cos(this.sloshPhase * 0.8)) / this.aspectN.y,
    );
  }

  /** Pointer / touch: the liquid is dragged toward the finger's velocity, and developer follows. */
  private injectPointers(dt: number, accept: boolean) {
    const f = this.fluid!;
    const vel = f.velocity;
    const dye = f.dye;
    const simW = 1 / this.velTexel.x;
    const simH = 1 / this.velTexel.y;
    const blend = 1 - Math.exp(-dt * STIR.blendRate);
    const u = this.splatMat.uniforms;
    for (const p of this.bus.pointers.values()) {
      if (!p.dirty) continue;
      const mult = p.down ? STIR.pressMultiplier : 1;
      let tx = p.vx * simW * STIR.velocityGain * mult;
      let ty = p.vy * simH * STIR.velocityGain * mult;
      const speed = Math.hypot(tx, ty);
      if (speed < 1) continue;
      if (speed > STIR.velocityMax) {
        tx *= STIR.velocityMax / speed;
        ty *= STIR.velocityMax / speed;
      }
      (u.u_point.value as THREE.Vector2).set(p.x, p.y);
      u.u_radius.value = STIR.radius;
      // velocity: relax toward the pointer's velocity
      (u.u_add.value as THREE.Vector3).set(0, 0, 0);
      (u.u_set.value as THREE.Vector3).set(tx, ty, 0);
      u.u_blend.value = blend;
      u.u_clamp.value = 0;
      u.u_target.value = vel.read.texture;
      this.draw(this.splatMat, vel.write);
      vel.swap();
      if (!accept) continue;
      // developer at the pointer: the rate follows the speed, so a pass
      // deposits the same amount however fast the hand moves
      const rate = Math.min(STIR.dyeMax, Math.hypot(p.vx * simW, p.vy * simH) * STIR.dyeGain) * mult;
      u.u_radius.value = STIR.dyeRadius;
      (u.u_add.value as THREE.Vector3).set(rate * dt, 0, 0);
      (u.u_set.value as THREE.Vector3).set(0, 0, 0);
      u.u_blend.value = 0;
      u.u_clamp.value = 1;
      u.u_target.value = dye.read.texture;
      this.draw(this.splatMat, dye.write);
      dye.swap();
    }
  }

  /** Space: rock the tray. A press bursts (alternating swirl), held keeps it moving. */
  private agitate(dt: number, accept: boolean) {
    const bus = this.bus;
    if (bus.spacePresses > 0) {
      bus.spacePresses = 0;
      this.burst = AGITATE.burst;
      this.burstSign = -this.burstSign;
      this.sloshAmp = LOOK.slosh;
    }
    this.burst *= Math.exp(-dt / AGITATE.burstDecay);
    const held = bus.spaceHeld;
    if (this.burst < 1 && !held) return;

    const f = this.fluid!;
    const t = this.time;
    const u = this.agitateMat.uniforms;
    u.u_radial.value = this.burst * 0.35;
    u.u_swirl.value =
      this.burstSign * this.burst * 0.65 + (held ? AGITATE.holdSwirl * Math.sin((TWO_PI * t) / AGITATE.rockPeriod) : 0);
    u.u_shear.value = (held ? AGITATE.holdRock : 0) + this.burst * 0.25;
    u.u_phase.value = (TWO_PI * t) / (AGITATE.rockPeriod * 1.7);
    u.u_velocity.value = f.velocity.read.texture;
    this.draw(this.agitateMat, f.velocity.write);
    f.velocity.swap();

    if (!accept) return;
    // a rocked tray develops evenly: a little developer everywhere
    const add = ((held ? AGITATE.holdDye : 0) + (this.burst / AGITATE.burst) * AGITATE.burstDye) * dt;
    if (add > 0) {
      this.blit(f.dye.read.texture, f.dye.write, 1, add, true);
      f.dye.swap();
    }
  }

  /** Idle: a slow current orbits the print and develops it by itself — gently
   *  at first, at full strength after AUTO.rampTime, so any print finishes in
   *  bounded time once the visitor stops. */
  private autonomous(dt: number, accept: boolean) {
    const f = this.fluid!;
    this.autoT += dt;
    const strength = AUTO.strength + (1 - AUTO.strength) * smoothstep(this.autoT / AUTO.rampTime);
    const theta = (TWO_PI * this.autoT) / AUTO.orbitPeriod;
    const breathe = 0.5 + 0.5 * Math.sin((TWO_PI * this.autoT) / AUTO.breathePeriod);
    // an ellipse on the print's own extents, breathing from the inside out, so
    // a tall print's top and bottom get their turn as well as its middle
    const k = AUTO.orbitMin + (AUTO.orbitMax - AUTO.orbitMin) * breathe;
    const hw = (this.rect.z / 2) * this.aspectN.x; // half extents, short-side units
    const hh = (this.rect.w / 2) * this.aspectN.y;
    const px = 0.5 + (hw * k * Math.cos(theta)) / this.aspectN.x;
    const py = 0.5 + (hh * k * Math.sin(theta)) / this.aspectN.y;
    const tx = -hw * Math.sin(theta);
    const ty = hh * Math.cos(theta);
    const tl = Math.hypot(tx, ty) || 1;
    const speed = AUTO.speed * strength;
    const u = this.splatMat.uniforms;
    (u.u_point.value as THREE.Vector2).set(px, py);
    u.u_radius.value = AUTO.radius;
    (u.u_add.value as THREE.Vector3).set(0, 0, 0);
    (u.u_set.value as THREE.Vector3).set((tx / tl) * speed, (ty / tl) * speed, 0);
    u.u_blend.value = 1 - Math.exp(-dt * STIR.blendRate);
    u.u_clamp.value = 0;
    u.u_target.value = f.velocity.read.texture;
    this.draw(this.splatMat, f.velocity.write);
    f.velocity.swap();
    if (!accept) return;
    (u.u_add.value as THREE.Vector3).set(AUTO.dye * strength * dt, 0, 0);
    (u.u_set.value as THREE.Vector3).set(0, 0, 0);
    u.u_blend.value = 0;
    u.u_clamp.value = 1;
    u.u_target.value = f.dye.read.texture;
    this.draw(this.splatMat, f.dye.write);
    f.dye.swap();
    // and the same direct footprint a hand gets, along the current's path
    const travel = this.autoPrev
      ? Math.hypot((px - this.autoPrev.x) * this.aspectN.x, (py - this.autoPrev.y) * this.aspectN.y)
      : 0;
    if (travel > 0) this.brush(px, py, AUTO.exposeRadius, Math.min(STIR.exposeMax, travel * AUTO.exposeGain * strength));
    this.autoPrev = { x: px, y: py };
  }

  // ── brush mode (reduced motion / no half-float / software) ──────────────

  private stepBrush(delta: number) {
    // frames come on demand here, so a long gap must not read as a long hold
    const dt = Math.min(delta, 1 / 30);
    const bus = this.bus;
    const accept = this.phase === "developing";
    if (accept) {
      for (const [id, p] of bus.pointers) {
        if (p.ended) bus.pointers.delete(id); // after this, its last segment
        if (p.fresh) {
          p.fresh = false;
          p.px = p.x;
          p.py = p.y;
          p.dirty = false;
          continue;
        }
        if (!p.dirty) continue;
        const travel = Math.hypot((p.x - p.px) * this.aspectN.x, (p.y - p.py) * this.aspectN.y);
        p.px = p.x;
        p.py = p.y;
        p.dirty = false;
        const amount = Math.min(BRUSH.max, travel * BRUSH.gain) * (p.down ? STIR.pressMultiplier : 1);
        if (amount <= 0) continue;
        this.brush(p.x, p.y, BRUSH.radius, amount);
        this.coverageDirty = true;
      }
      // Space develops the whole print evenly — the keyboard path here too
      let even = bus.spacePresses * BRUSH.spacePress + (bus.spaceHeld ? BRUSH.spaceHold * dt : 0);
      bus.spacePresses = 0;
      if (even > 0) {
        even = Math.min(even, BRUSH.max);
        this.brush(0.5, 0.5, 1.4, even);
        this.coverageDirty = true;
      }
      // every stroke gets measured: now, or as soon as the pending read lands
      if (this.coverageDirty && !this.readPending) this.measureCoverage();
    } else {
      bus.spacePresses = 0;
      for (const [id, p] of bus.pointers) {
        if (p.ended) {
          bus.pointers.delete(id);
          continue;
        }
        p.px = p.x;
        p.py = p.y;
        p.dirty = false;
        p.fresh = false;
      }
    }
  }

  private brush(x: number, y: number, radius: number, amount: number) {
    const u = this.splatMat.uniforms;
    (u.u_point.value as THREE.Vector2).set(x, y);
    u.u_radius.value = radius;
    (u.u_add.value as THREE.Vector3).set(amount, 0, 0);
    (u.u_set.value as THREE.Vector3).set(0, 0, 0);
    u.u_blend.value = 0;
    u.u_clamp.value = 1;
    u.u_target.value = this.exposure.read.texture;
    this.draw(this.splatMat, this.exposure.write);
    this.exposure.swap();
  }

  /** Brush mode fixes without an ease: the print is simply fixed. */
  private fixNow() {
    this.exposureMat.uniforms.u_exposure.value = this.exposure.read.texture;
    this.exposureMat.uniforms.u_dye.value = this.placeholder;
    this.exposureMat.uniforms.u_accept.value = 0;
    this.exposureMat.uniforms.u_fix.value = 1;
    this.draw(this.exposureMat, this.exposure.write);
    this.exposure.swap();
    this.phase = "fixed";
    this.phaseT = 0;
    this.coverage = 1;
    this.publish(true);
    this.wakeFn?.();
  }

  // ── coverage (GPU downsample + one small async readback) ───────────────

  private measureCoverage() {
    if (this.readPending || !this.printTex) return;
    this.coverageDirty = false;
    this.coverageMat.uniforms.u_exposure.value = this.exposure.read.texture;
    this.draw(this.coverageMat, this.coverageRT);
    this.gl.setRenderTarget(null);
    this.readPending = true;
    const gen = this.generation;
    const n = DEVELOP.coverageSize;
    this.gl
      .readRenderTargetPixelsAsync(this.coverageRT, 0, 0, n, n, this.coverageBuf)
      .then(() => {
        this.readPending = false;
        if (this.disposed) return;
        // a read issued for a previous print (or before a context restore) says
        // nothing about this one — but a stroke that landed on the new print
        // while it was in flight still has to be measured
        if (gen === this.generation) {
          let sum = 0;
          let w = 0;
          const b = this.coverageBuf;
          for (let i = 0; i < b.length; i += 4) {
            const weight = b[i + 1] / 255;
            sum += (b[i] / 255) * weight;
            w += weight;
          }
          this.onCoverage(w > 0 ? sum / w : 0);
        }
        if (this.coverageDirty && this.phase === "developing") this.measureCoverage();
      })
      .catch(() => {
        this.readPending = false;
      });
  }

  private onCoverage(value: number) {
    if (this.phase !== "developing") return;
    this.coverage = value;
    // brush mode renders on demand: the HUD would otherwise wait for the next input
    this.publish(true);
    if (value >= DEVELOP.fixThreshold) {
      if (this._mode === "fluid") {
        this.phase = "fixing";
        this.phaseT = 0;
        this.fixS = 0;
        this.autoOn = false;
        this.publish(true);
      } else {
        this.fixNow();
      }
    }
  }

  // ── output ──────────────────────────────────────────────────────────────

  private composite() {
    const u = this.compositeMat.uniforms;
    u.u_exposure.value = this.exposure.read.texture;
    u.u_velocity.value = this.fluid?.velocity.read.texture ?? this.placeholder;
    u.u_dye.value = this.fluid?.dye.read.texture ?? this.placeholder;
    this.draw(this.compositeMat, null);
  }

  private publish(force: boolean) {
    this.hudT += force ? UI.hudInterval : 0;
    if (!force) {
      this.hudT += SIM.dt;
      if (this.hudT < UI.hudInterval) return;
    }
    this.hudT = 0;
    this.bus.publish({
      index: this.index,
      count: N_PRINTS,
      coverage: Math.round(this.coverage * 100) / 100,
      phase: this.phase,
      touched: this.touched,
      started: this.started,
    });
  }

  // ── GPU helpers ─────────────────────────────────────────────────────────

  private draw(material: THREE.ShaderMaterial, target: RT | null) {
    this.mesh.material = material;
    this.gl.setRenderTarget(target);
    this.gl.render(this.scene, this.camera);
  }

  /** target = source × scale + add (clamped to 1 when asked). */
  private blit(source: THREE.Texture, target: RT, scale: number, add: number, clamp: boolean) {
    const u = this.scaleMat.uniforms;
    u.u_source.value = source;
    u.u_scale.value = scale;
    u.u_add.value = add;
    u.u_clamp.value = clamp ? 1 : 0;
    this.draw(this.scaleMat, target);
  }

  private clear(...targets: RT[]) {
    this.gl.setClearColor(0x000000, 0);
    for (const t of targets) {
      this.gl.setRenderTarget(t);
      this.gl.clear(true, false, false);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.bus.clear();
    this.disposeFluid();
    this.exposure.dispose();
    this.coverageRT.dispose();
    for (const m of [
      this.advectVel,
      this.advectDye,
      this.curlMat,
      this.vorticityMat,
      this.splatMat,
      this.agitateMat,
      this.divergenceMat,
      this.pressureMat,
      this.gradientMat,
      this.scaleMat,
      this.remapMat,
      this.exposureMat,
      this.coverageMat,
      this.compositeMat,
    ]) {
      m.dispose();
    }
    this.geometry.dispose();
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
    this.placeholder.dispose();
    this.gl.setRenderTarget(null);
    this.gl.autoClear = this.prevAutoClear;
  }
}
