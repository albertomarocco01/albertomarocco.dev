import * as THREE from "three";
import { AuraMaterial, VARIANT_PALETTE, type AuraMaterialImpl } from "@/components/canvas/aura-material";
import { LOOP, type LoopVariant } from "../wall.config";

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
 * Everything mutable lives on the instance and is only ever touched through
 * these methods — the React compiler rules do not allow property assignment on
 * anything that crosses a hook or a prop, and this object does both.
 */
export class LoopSource {
  private readonly target: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  /** the aura's vertex shader ignores it, but three still wants a camera */
  private readonly camera = new THREE.Camera();
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: AuraMaterialImpl;
  private readonly mesh: THREE.Mesh;

  /** palette crossfade: from → to over LOOP.switchSeconds */
  private readonly hotFrom = new THREE.Vector3();
  private readonly hotTo = new THREE.Vector3();
  private readonly midFrom = new THREE.Vector3();
  private readonly midTo = new THREE.Vector3();
  private mix = 1;
  /** the live accent, kept in step with the fade — the room's light is this colour */
  private readonly hotColor = new THREE.Color();

  private time = 0;
  /** seconds since the target was last redrawn */
  private since = 0;
  /** an explicit "repaint once" request: the first frame, a palette change, a
   *  restored context. Named rather than encoded as a magic value of `since`,
   *  which is a clock and has to stay one. */
  private dirty = true;

  constructor(target: THREE.WebGLRenderTarget, variant: LoopVariant) {
    this.target = target;

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

    this.setVariant(variant, true);
  }

  /** The render target's texture — the wall's map. */
  get texture(): THREE.Texture {
    return this.target.texture;
  }

  /**
   * Crossfade to another palette. `VARIANT_PALETTE` entries interpolate
   * cleanly, so one material and one target are enough — no second loop.
   */
  setVariant(variant: LoopVariant, instant: boolean): void {
    const next = VARIANT_PALETTE[variant];
    const [hx, hy, hz] = next.hot;
    const [mx, my, mz] = next.mid;
    if (instant) {
      this.hotFrom.set(hx, hy, hz);
      this.midFrom.set(mx, my, mz);
      this.hotTo.copy(this.hotFrom);
      this.midTo.copy(this.midFrom);
      this.mix = 1;
    } else {
      // start from wherever the fade currently is, so a fast double-press blends
      this.hotFrom.copy(this.material.uniforms.u_hot.value);
      this.midFrom.copy(this.material.uniforms.u_mid.value);
      this.hotTo.set(hx, hy, hz);
      this.midTo.set(mx, my, mz);
      this.mix = 0;
    }
    this.applyPalette();
    this.dirty = true; // a colour change must reach the target even while paused
  }

  private applyPalette(): void {
    const k = this.mix * this.mix * (3 - 2 * this.mix); // smoothstep — no bounce, no linear ramp
    const hot = this.material.uniforms.u_hot.value.lerpVectors(this.hotFrom, this.hotTo, k);
    this.material.uniforms.u_mid.value.lerpVectors(this.midFrom, this.midTo, k);
    // the palette is display-referred (the bytes the home page paints), so it is
    // decoded on the way into a light colour, exactly as the wall shader decodes it
    this.hotColor.setRGB(hot.x, hot.y, hot.z, THREE.SRGBColorSpace);
  }

  /** The loop's current accent — the colour of the light the wall throws. */
  get hot(): THREE.Color {
    return this.hotColor;
  }

  /**
   * Advance the loop and redraw the target if it is due. The clock always runs
   * at real time — only the redraw is throttled, so 30 Hz into the texture
   * costs half as much as 60 without changing the loop's pace.
   * `frozen` holds the clock still (reduced motion) but still allows the one
   * paint a palette change asks for.
   */
  update(gl: THREE.WebGLRenderer, delta: number, frozen: boolean): void {
    if (!frozen) {
      this.time += delta * LOOP.timeScale;
      if (this.mix < 1) {
        this.mix = Math.min(1, this.mix + delta / LOOP.switchSeconds);
        this.applyPalette();
      }
    } else if (this.mix < 1) {
      this.mix = 1;
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
    gl.setRenderTarget(this.target);
    gl.render(this.scene, this.camera);
    gl.setRenderTarget(previous);
  }

  /** Ask for one repaint of the target on the next frame that runs. */
  markDirty(): void {
    this.dirty = true;
  }

  dispose(): void {
    // The triangle is NOT removed from the scene: the scene is private to this
    // instance and goes with it, while a StrictMode remount reuses the instance
    // — pulling the mesh out there would leave the target black for good.
    this.geometry.dispose();
    this.material.dispose();
  }
}
