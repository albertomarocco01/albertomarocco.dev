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
 *   • u_white 1 — the ambient WHITE field on the gate/home: a soft field of a
 *     few slowly-drifting luminous blobs (out-of-focus orbs) on near-black.
 * Branching on u_white means the white refinements never touch the work aura.
 *
 * u_disp (view-local UV offset, rest = 0) is the cursor's gentle parallax: the
 * white field leans softly toward the pointer by a few percent, heavily smoothed
 * and decaying back to rest (computed in Aura.tsx). The work reveals never set
 * it, so they are unaffected. Tunables for the blob look live as #defines below.
 */
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

  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=.5; } return v; }

  // ---- white ambient field tunables (soft drifting blobs) ----
  #define BLOB_COUNT 7         // number of soft orbs
  #define BLOB_SIZE 0.34       // base orb radius (normalized-height units)
  #define BLOB_SOFT 1.20       // falloff softness — higher = blurrier / more out-of-focus
  #define DRIFT_SPEED 0.05     // how fast the orbs wander on their paths
  #define DRIFT_AMP 0.22       // how far the orbs wander
  #define DISP_STRENGTH 0.11   // cursor parallax max (fraction of normalized space)
  #define FIELD_GAIN 0.85      // brightness/presence gain on the summed field
  #define FIELD_OPACITY 0.72   // overall opacity multiplier for the blob field
  #define TAU 6.2831853

  void main(){
    vec2 uv = vUv;
    float aspect = u_res.x/u_res.y;

    if (u_white > 0.5) {
      // Aspect-correct normalized space, centred at 0. The cursor gently
      // offsets the whole field (parallax), each orb leaning a touch differently
      // for a hint of depth — no rotation, no velocity stirring.
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
      vec2 disp = u_disp * DISP_STRENGTH;
      float bt = u_time * DRIFT_SPEED;

      float field = 0.0;
      for (int i = 0; i < BLOB_COUNT; i++) {
        float fi = float(i);
        float a = hash(vec2(fi, 1.7));
        float b = hash(vec2(fi, 9.1));
        float c = hash(vec2(fi, 4.3));
        // anchor spread across (and a little beyond) the view
        vec2 anchor = (vec2(a, b) * 2.0 - 1.0) * vec2(aspect * 0.55, 0.55);
        // slow, low-frequency drift — per-orb phase + speed
        float sp = 0.7 + 0.7 * c;
        vec2 drift = vec2(sin(bt * sp + a * TAU), cos(bt * sp * 0.85 + b * TAU)) * DRIFT_AMP;
        float depth = 0.55 + 0.9 * c;             // per-orb parallax depth
        vec2 center = anchor + drift + disp * depth;
        vec2 d = p - center;
        float radius = BLOB_SIZE * (0.75 + 0.6 * a);
        field += exp(-dot(d, d) / (radius * radius * BLOB_SOFT)); // soft gaussian
      }

      // Soft saturate so dense overlaps glow gently without hard edges; alpha
      // follows presence so the gaps stay true near-black (orbs, not a wash).
      float pres = 1.0 - exp(-field * FIELD_GAIN);
      vec3 dim = vec3(0.30, 0.32, 0.38);
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
  };
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    auraMaterial: ThreeElement<typeof AuraMaterial>;
  }
}
