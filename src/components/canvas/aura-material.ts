import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";

/**
 * Domain-warped value-noise fbm → warm amber aura with vignette.
 * GLSL math ported verbatim from alberto-marocco-prototype-v2.html.
 *
 * One principled change vs the prototype: UV comes from a fullscreen-triangle
 * varying (0..1 within each <View>), not gl_FragCoord/u_res. Under drei's
 * per-view scissor the raw frag-coord is offset by the view's screen position,
 * which would skew the vignette; the varying keeps it view-local and centred.
 * u_res is kept solely for the aspect ratio. u_fade drives opacity in/out.
 *
 * The shader branches on u_white:
 *   • u_white 0 — the amber/ember WORK reveals: domain-warped value-noise fbm
 *     "smoke", ported verbatim from the prototype. UNCHANGED.
 *   • u_white 1 — the ambient WHITE field on the gate/home: a small set of soft
 *     luminous blobs (out-of-focus orbs) on near-black. Their centres + radii are
 *     no longer drifted on sin/cos paths in the shader — they are driven by a tiny
 *     JS physics sim (Aura.tsx, elastic collisions + soft walls + an energetic→
 *     calm energy envelope) and handed in via the u_blobs[] uniform. The shader
 *     only sums the soft gaussians at those centres, so the metaball merge reads
 *     exactly as before while all the motion lives in JS.
 * Branching on u_white means the white refinements never touch the work aura.
 *
 * u_disp (view-local UV offset, rest = 0) is the cursor's gentle parallax: the
 * white field leans softly toward the pointer by a few percent, heavily smoothed
 * and decaying back to rest (computed in Aura.tsx). The work reveals never set
 * it, so they are unaffected. Tunables for the blob look live as #defines below.
 *
 * BLOB_COUNT is the single compile-time orb count: exported from here (Aura.tsx
 * imports it to size the physics array) and interpolated into the GLSL #define
 * and u_blobs[] length below — one source of truth, mirrored in both places.
 */

// Number of soft orbs. Single source of truth: exported for the JS physics sim
// (Aura.tsx) and interpolated into the fragment shader so the u_blobs[] length
// and the loop bound always match. Keep small — the loop runs per pixel.
// 7 (was 9): fewer orbs open real dark gaps between them, while staying dense
// enough — with the bigger collision core + lively idle floor — for regular,
// visible collisions. The distinct-orbs-vs-collision-frequency balance.
export const BLOB_COUNT = 7;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float u_time;
  uniform vec2  u_res;
  uniform float u_cool;  // variant 0..1: clean amber -> dusty ember
  uniform float u_white; // 0 = warm work smoke, 1 = ambient white blob field
  uniform float u_fade;  // master opacity (in/out envelope)
  uniform vec2  u_disp;  // cursor parallax offset in view-local UV (rest = 0)
  uniform vec3  u_blobs[${BLOB_COUNT}]; // white field only: xy = orb centre (aspect-corrected, centred at 0), z = collision-core radius

  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=.5; } return v; }

  // ---- white ambient field tunables (soft luminous orbs; motion lives in JS) ----
  #define BLOB_COUNT ${BLOB_COUNT} // orb count — mirrors the exported TS const above (single source of truth)
  #define BLOB_SIZE 1.35       // visual gaussian radius = core radius (u_blobs.z) × this; >1 so the glow exceeds the collision core and orbs merge softly before they bounce. SMALL is the main contrast lever: at 1.35 the orbs cover ~half the view (was 2.34 → ~180%, total overlap → grey wash), leaving real dark gaps between them
  #define BLOB_SOFT 0.9        // falloff softness — higher = blurrier; lower = sharper edges + darker gaps (0.9, was 1.20, so the void shows between orbs instead of fat overlapping tails)
  #define DISP_STRENGTH 0.11   // cursor parallax max (fraction of normalized space)
  #define FIELD_GAIN 0.85      // brightness/presence gain on the summed field
  #define FIELD_OPACITY 0.72   // overall opacity multiplier for the blob field

  void main(){
    vec2 uv = vUv;
    float aspect = u_res.x/u_res.y;

    if (u_white > 0.5) {
      // Aspect-correct normalized space, centred at 0. The cursor gently offsets
      // the whole field (parallax), each orb leaning a touch differently for a
      // hint of depth — no rotation, no velocity stirring. Orb centres + radii
      // come from the JS physics sim via u_blobs; here we only sum the gaussians.
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
      vec2 disp = u_disp * DISP_STRENGTH;

      float field = 0.0;
      for (int i = 0; i < BLOB_COUNT; i++) {
        vec3 blob = u_blobs[i];
        float depth = 0.55 + 0.9 * hash(vec2(float(i), 4.3)); // per-orb parallax depth (matches the old per-orb lean)
        vec2 center = blob.xy + disp * depth;
        vec2 d = p - center;
        float radius = blob.z * BLOB_SIZE;             // visual glow radius (see BLOB_SIZE)
        field += exp(-dot(d, d) / (radius * radius * BLOB_SOFT)); // soft gaussian
      }

      // Soft saturate so dense overlaps glow gently without hard edges; alpha
      // follows presence so the gaps stay true near-black (orbs, not a wash).
      float pres = 1.0 - exp(-field * FIELD_GAIN);
      // Gap/halo colour sits just above the void (#0a0a0c ≈ 0.04) so low-presence
      // regions read as true dark, not the old grey wash (was 0.30,0.32,0.38).
      // Alpha follows presence too, so gaps are near-transparent regardless; this
      // keeps the partial-presence halos around each orb from milking to grey.
      vec3 dim = vec3(0.10, 0.11, 0.14);
      vec3 orb = vec3(0.85, 0.87, 0.93);
      vec3 col = mix(dim, orb, pres);
      float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
      gl_FragColor = vec4(col, u_fade * pres * mix(0.45, 1.0, vig) * FIELD_OPACITY);
      return;
    }

    // ---- amber/ember work reveals (u_white = 0): original smoke, unchanged ----
    vec2 p = (uv-0.5)*vec2(aspect, 1.0)*2.4;
    float t = u_time*0.035;
    vec2 q = vec2(fbm(p+t), fbm(p+vec2(5.2,1.3)-t));
    vec2 r = vec2(fbm(p+3.6*q+vec2(1.7,9.2)+t*0.6), fbm(p+3.6*q+vec2(8.3,2.8)-t*0.5));
    float f = fbm(p+3.6*r);
    vec3 base = vec3(0.033,0.029,0.030), mid = vec3(0.105,0.092,0.082);
    vec3 amber = vec3(0.64,0.43,0.22), ember = vec3(0.50,0.27,0.16);
    vec3 hot = mix(amber, ember, u_cool);
    vec3 col = mix(base, mid, clamp(f*1.5,0.,1.));
    col = mix(col, hot, pow(clamp(r.x*r.y*1.7,0.,1.),2.0)*0.55);
    float vig = smoothstep(1.25,0.25,length(uv-0.5));
    col *= mix(0.55,1.0,vig);
    gl_FragColor = vec4(col, u_fade);
  }
`;

export const AuraMaterial = shaderMaterial(
  {
    u_time: 0,
    u_res: new THREE.Vector2(1, 1),
    u_cool: 0,
    u_white: 0,
    u_fade: 0,
    u_disp: new THREE.Vector2(0, 0),
    // One vec3 per orb (xy = centre, z = core radius); Aura.tsx mutates these
    // each frame from the physics sim. Default-zeroed; sized by BLOB_COUNT.
    u_blobs: Array.from({ length: BLOB_COUNT }, () => new THREE.Vector3()),
  },
  vertexShader,
  fragmentShader,
);

extend({ AuraMaterial });

export type AuraMaterialImpl = THREE.ShaderMaterial & {
  uniforms: {
    u_time: { value: number };
    u_res: { value: THREE.Vector2 };
    u_cool: { value: number };
    u_white: { value: number };
    u_fade: { value: number };
    u_disp: { value: THREE.Vector2 };
    u_blobs: { value: THREE.Vector3[] };
  };
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    auraMaterial: ThreeElement<typeof AuraMaterial>;
  }
}
