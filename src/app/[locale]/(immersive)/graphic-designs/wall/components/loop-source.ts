import * as THREE from "three";
import { AuraMaterial, VARIANT_PALETTE, type AuraMaterialImpl } from "@/components/canvas/aura-material";
import { LOOP, type LoopVariant } from "../wall.config";

/** smoothstep on 0 … 1 — no bounce, no linear ramp */
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * The wall's content: the site's own aura shader, rendered into a texture.
 *
 * `AuraMaterial` is a FULLSCREEN-TRIANGLE material — its vertex shader writes
 * `position.xy` straight to clip space and ignores the camera — so it cannot be
 * hung on a wall in a 3D scene. It is instead rendered, untouched, into a
 * render target by a three-vertex triangle in a scene of its own; the wall then
 * samples that target. Nothing here edits the shared shader: the module is
 * imported read-only, exactly as the home page uses it.
 *
 * A palette switch is something the wall does, not a fade. The loop draws into
 * one of two same-sized targets, and at a switch the two trade places: the
 * frame that was on the wall stays behind as a snapshot, the loop repaints the
 * other target in the new colours, and the wall's shader uncovers live over
 * snapshot along a front that crosses the cabinets. Nothing is copied.
 *
 * Everything mutable lives on the instance and is only ever touched through
 * these methods — the React compiler rules do not allow property assignment on
 * anything that crosses a hook or a prop, and this object does both.
 */
export class LoopSource {
  private readonly targets: readonly [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  /** which target the loop draws into; the other one holds the snapshot */
  private live = 0;
  private readonly scene = new THREE.Scene();
  /** the aura's vertex shader ignores it, but three still wants a camera */
  private readonly camera = new THREE.Camera();
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: AuraMaterialImpl;
  private readonly mesh: THREE.Mesh;

  private variant: LoopVariant;
  /** palette tween: from → to over LOOP.paletteSeconds */
  private readonly hotFrom = new THREE.Vector3();
  private readonly hotTo = new THREE.Vector3();
  private readonly midFrom = new THREE.Vector3();
  private readonly midTo = new THREE.Vector3();
  private mix = 1;
  /** the switch front, linear in time: 0 … 1 across the wall, 1 when none is in flight */
  private crossing = 1;
  /** +1 sweeps left → right, −1 right → left */
  private direction = 1;
  /** the accent the snapshot was painted in — the room's light blends out of it */
  private readonly hotSnapshot = new THREE.Vector3();
  private readonly hotLight = new THREE.Vector3();
  private readonly hotColor = new THREE.Color();

  private time = 0;
  /** seconds since the target was last redrawn */
  private since = 0;
  /** an explicit "repaint once" request: the first frame, a palette change, a
   *  restored context. Named rather than encoded as a magic value of `since`,
   *  which is a clock and has to stay one. */
  private dirty = true;

  constructor(
    targets: readonly [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget],
    variant: LoopVariant,
  ) {
    this.targets = targets;

    // one triangle, big enough to cover clip space (the material's own idiom)
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    this.geometry = geometry;

    // drei's shaderMaterial() returns a constructible class; AuraMaterialImpl is
    // the same object seen through its typed uniforms.
    const material = new AuraMaterial() as unknown as AuraMaterialImpl;
    material.uniforms.u_white.value = 0; // the amber/ember WORK branch, not the white field
    material.uniforms.u_fade.value = 1; // no in/out envelope here: the wall is always on
    material.uniforms.u_res.value.set(2, 1); // the wall's aspect, 6 × 3 m
    this.material = material;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    this.mesh = mesh;
    this.scene.add(mesh);

    this.variant = variant;
    this.setVariant(variant, true, 1);
  }

  /** The target the loop is drawing into — the wall's map. */
  get texture(): THREE.Texture {
    return this.targets[this.live].texture;
  }

  /** The frame that was on the wall when the current switch began. */
  get snapshot(): THREE.Texture {
    return this.targets[1 - this.live].texture;
  }

  /** How far the front has crossed the wall, eased: 0 … 1, and 1 at rest. */
  get wipe(): number {
    return ease(this.crossing);
  }

  get wipeDirection(): number {
    return this.direction;
  }

  /**
   * Switch palette. On the running path this is a wipe: the targets trade
   * places, the new one is painted before the wall next samples it, and the
   * front starts across. A switch during a switch does not restart the front —
   * there is one snapshot, and restarting would pop whatever the front has not
   * reached yet — it only retargets the colour the front uncovers, from
   * wherever that colour currently is. `instant` (reduced motion, a CPU
   * rasteriser, the first paint) cuts.
   */
  setVariant(variant: LoopVariant, instant: boolean, direction: number): void {
    if (variant === this.variant && !instant) return;
    this.variant = variant;
    const [hx, hy, hz] = VARIANT_PALETTE[variant].hot;
    const [mx, my, mz] = VARIANT_PALETTE[variant].mid;
    const { u_hot, u_mid } = this.material.uniforms;
    if (instant) {
      this.hotFrom.set(hx, hy, hz);
      this.midFrom.set(mx, my, mz);
      this.mix = 1;
      this.crossing = 1;
    } else {
      if (this.crossing >= 1) {
        this.live = 1 - this.live;
        this.crossing = 0;
        this.direction = direction < 0 ? -1 : 1;
        this.hotSnapshot.copy(u_hot.value);
      }
      this.hotFrom.copy(u_hot.value);
      this.midFrom.copy(u_mid.value);
      this.mix = 0;
    }
    this.hotTo.set(hx, hy, hz);
    this.midTo.set(mx, my, mz);
    this.applyPalette();
    this.dirty = true; // the colour, or a fresh target, must reach the wall even while paused
  }

  private applyPalette(): void {
    const k = ease(this.mix);
    this.material.uniforms.u_hot.value.lerpVectors(this.hotFrom, this.hotTo, k);
    this.material.uniforms.u_mid.value.lerpVectors(this.midFrom, this.midTo, k);
  }

  /**
   * The colour of the light the wall throws: the live accent where the front
   * has passed, the snapshot's where it has not — so the pool on the floor
   * changes with the wall instead of ahead of it. The palette is
   * display-referred (the bytes the home page paints), so it is decoded on the
   * way into a light colour, exactly as the wall shader decodes it.
   */
  get hot(): THREE.Color {
    const h = this.hotLight.lerpVectors(this.hotSnapshot, this.material.uniforms.u_hot.value, this.wipe);
    return this.hotColor.setRGB(h.x, h.y, h.z, THREE.SRGBColorSpace);
  }

  /**
   * Advance the loop and redraw the target if it is due. The clock always runs
   * at real time — only the redraw is throttled, so 30 Hz into the texture
   * costs half as much as 60 without changing the loop's pace. The front is
   * not throttled: it lives in the wall's shader and moves every frame.
   * `frozen` holds the clock still (reduced motion) but still allows the one
   * paint a palette change asks for.
   */
  update(gl: THREE.WebGLRenderer, delta: number, frozen: boolean): void {
    if (!frozen) {
      this.time += delta * LOOP.timeScale;
      if (this.mix < 1) {
        this.mix = Math.min(1, this.mix + delta / LOOP.paletteSeconds);
        this.applyPalette();
      }
      if (this.crossing < 1) this.crossing = Math.min(1, this.crossing + delta / LOOP.switchSeconds);
    } else if (this.mix < 1 || this.crossing < 1) {
      this.mix = 1;
      this.crossing = 1;
      this.applyPalette();
    }

    this.since += delta;
    if (!this.dirty) {
      if (this.since * 1000 < LOOP.throttleMs) return;
      if (frozen) return; // frozen: paint only when asked
    }

    this.dirty = false;
    this.since = 0;
    this.material.uniforms.u_time.value = this.time;

    const previous = gl.getRenderTarget();
    gl.setRenderTarget(this.targets[this.live]);
    gl.render(this.scene, this.camera);
    gl.setRenderTarget(previous);
  }

  /** A restored context: repaint on the next frame. The snapshot came back
   *  empty too, so a switch caught mid-flight lands at once. */
  markDirty(): void {
    this.dirty = true;
    this.crossing = 1;
  }

  dispose(): void {
    // The triangle is NOT removed from the scene: the scene is private to this
    // instance and goes with it, while a StrictMode remount reuses the instance
    // — pulling the mesh out there would leave the target black for good.
    // The two targets are drei's `useFBO`s and are disposed by it.
    this.geometry.dispose();
    this.material.dispose();
  }
}
