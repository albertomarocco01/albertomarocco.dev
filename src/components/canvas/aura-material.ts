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
export const BLOB_COUNT = 14;

/**
 * Work-reveal colour families. Each `gen` row picks one by name (see
 * src/lib/work.ts `WorkVariant`, which mirrors these keys). `hot` is the bright
 * accent the smoke flares to; `mid` is the dark body fog. `base` (near-black) is
 * shared and hardcoded in the shader. amber/ember keep the prototype's exact
 * values — the verbatim work aura, identical to the old u_cool 0/1 endpoints —
 * so only teal/violet are new. mid is tinted toward each hue so the cooler
 * fields read teal/violet rather than muddy-warm.
 */
export const VARIANT_PALETTE = {
  amber: { hot: [0.64, 0.43, 0.22], mid: [0.105, 0.092, 0.082] },
  ember: { hot: [0.5, 0.27, 0.16], mid: [0.105, 0.092, 0.082] },
  teal: { hot: [0.18, 0.55, 0.48], mid: [0.055, 0.095, 0.088] },
  violet: { hot: [0.43, 0.31, 0.63], mid: [0.085, 0.072, 0.105] },
} as const;

export type AuraVariant = keyof typeof VARIANT_PALETTE;

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
  uniform vec3  u_hot;   // variant accent the smoke flares to (see VARIANT_PALETTE)
  uniform vec3  u_mid;   // variant dark body fog (the smoke bulk, tinted per hue)
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
  #define BLOB_SIZE 1.30       // visual glow radius = core radius (u_blobs.z) * this
  #define BLOB_SOFT 0.85       // softness
  #define DISP_STRENGTH 0.11   // cursor parallax max (fraction of normalized space)
  #define FIELD_GAIN 1.10      // brightness/presence gain on the summed field
  #define FIELD_OPACITY 0.76   // overall opacity multiplier for the blob field
  #define BLOB_DENOM_EPS 1e-4  // floor on the gaussian denominator so a degenerate (zero/NaN) orb radius can't divide-by-zero -> NaN field -> nothing paints. Far below any valid denom (min ~0.021), so it never affects real orbs.
  #define DEPTH_BASE 0.55      // per-orb parallax depth floor (each orb leans a touch differently for a hint of depth)
  #define DEPTH_VARY 0.9       // per-orb parallax depth spread added on top of DEPTH_BASE via the per-orb hash
  #define DIM_COLOR vec3(0.10, 0.11, 0.14) // gap/halo colour — just above the void (#0a0a0c ~ 0.04) so low-presence regions read true-dark, not a milky grey wash
  #define ORB_COLOR vec3(0.85, 0.87, 0.93) // orb core colour — cold white

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
        float depth = DEPTH_BASE + DEPTH_VARY * hash(vec2(float(i), 4.3)); // per-orb parallax depth (matches the old per-orb lean)
        vec2 center = blob.xy + disp * depth;
        vec2 d = p - center;
        float radius = blob.z * BLOB_SIZE;             // visual glow radius (see BLOB_SIZE)
        float sigma = radius * BLOB_SOFT;
        float denom = max(2.0 * sigma * sigma, BLOB_DENOM_EPS); // soft gaussian denominator matching reference
        field += exp(-dot(d, d) / denom);              // soft gaussian
      }

      // Soft saturate so dense overlaps glow gently without hard edges; alpha
      // follows presence so the gaps stay true near-black (orbs, not a wash).
      float pres = 1.0 - exp(-field * FIELD_GAIN);
      // DIM_COLOR (gap/halo) sits just above the void so low-presence regions read
      // true-dark, not the old grey wash; ORB_COLOR is the cold-white core. Alpha
      // follows presence too, so the partial-presence halos never milk to grey.
      vec3 col = mix(DIM_COLOR, ORB_COLOR, pres);
      float dist_centro = length(p * vec2(0.8, 1.0)); // schiaccia asse X per widescreen
      float vig = smoothstep(0.55, 0.35, dist_centro); // vignette matching reference
      gl_FragColor = vec4(col, u_fade * pres * vig * FIELD_OPACITY);
      return;
    }

    // ---- amber/ember work reveals (u_white = 0): original smoke, unchanged ----
    vec2 p = (uv-0.5)*vec2(aspect, 1.0)*2.4;
    float t = u_time*0.035;
    vec2 q = vec2(fbm(p+t), fbm(p+vec2(5.2,1.3)-t));
    vec2 r = vec2(fbm(p+3.6*q+vec2(1.7,9.2)+t*0.6), fbm(p+3.6*q+vec2(8.3,2.8)-t*0.5));
    float f = fbm(p+3.6*r);
    vec3 base = vec3(0.033,0.029,0.030);
    vec3 col = mix(base, u_mid, clamp(f*1.5,0.,1.));
    col = mix(col, u_hot, pow(clamp(r.x*r.y*1.7,0.,1.),2.0)*0.55);
    float vig = smoothstep(1.25,0.25,length(uv-0.5));
    col *= mix(0.55,1.0,vig);
    gl_FragColor = vec4(col, u_fade);
  }
`;

export const AuraMaterial = shaderMaterial(
  {
    u_time: 0,
    u_res: new THREE.Vector2(1, 1),
    u_hot: new THREE.Vector3(...VARIANT_PALETTE.amber.hot),
    u_mid: new THREE.Vector3(...VARIANT_PALETTE.amber.mid),
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
    u_hot: { value: THREE.Vector3 };
    u_mid: { value: THREE.Vector3 };
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
