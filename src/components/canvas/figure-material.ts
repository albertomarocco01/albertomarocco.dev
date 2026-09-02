import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";
import { BLOB_COUNT, FIELD_GLSL } from "./field-glsl";

/**
 * The /about cut-out figure, painted by the shared canvas inside a <View> that
 * tracks the figure's DOM box (FigureView.tsx), with the ambient field's *near*
 * orbs drawn over it.
 *
 * Why the canvas paints the photo at all: the field is one fixed layer under
 * the page, so as a DOM <img> the figure could only ever sit in front of every
 * orb. Drawn here — after the field, in the same frame — the silhouette covers
 * the far orbs and the near ones are re-drawn on top, so the same bubbles pass
 * behind *and* in front of the person: depth, from one physics sim.
 *
 * The near/far split is the per-orb parallax depth the field already has
 * (DEPTH_BASE + DEPTH_VARY·hash — the orbs that lean most with the cursor are
 * the nearest): everything above FRONT_DEPTH is "in front". Outside the
 * silhouette this view writes alpha 0, so the field's own rendering of those
 * orbs stands and the two layers meet seamlessly at the edge: the gaussian,
 * gain, vignette and fade are the field's own values, handed over each frame
 * via field-state.ts, and the position maths is repeated in screen space
 * (u_rect maps this view's UV back into the viewport the field uses).
 *
 * The photo is toned into the palette (a touch desaturated and darkened, so
 * the cold-white orbs read as the light source) and dissolved into the void
 * over its bottom `u_bottom` — the CSS on the fallback <img> mirrors both, so
 * the DOM → GPU handover never pops. No colour management, deliberately: the
 * texture is sampled raw and written raw, exactly like the field shader.
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
  uniform sampler2D u_tex;
  uniform vec4  u_rect;     // this view's box in screen UV, y up: xy = left/bottom, zw = width/height
  uniform vec4  u_clip;     // the panel's box, same form — the DOM clips the <img> to it; the canvas has to be told
  uniform float u_aspect;   // viewport aspect (the field's u_res.x / u_res.y)
  uniform float u_fade;     // the field's master fade — the near orbs follow it
  uniform vec2  u_disp;     // the field's cursor parallax offset (rest = 0)
  uniform float u_gain;     // field tunables, live from bubble-params (see Aura.tsx)
  uniform float u_opacity;
  uniform float u_blobSize;
  uniform float u_soft;
  uniform vec3  u_blobs[${BLOB_COUNT}]; // the field's orbs this frame: xy centre, z core radius
  uniform float u_reveal;   // 0..1 — the figure's own fade-in (× the page's dim on phones)
  uniform float u_bottom;   // dissolve the bottom this fraction of the box into the void

  // The field's own hash + look constants — the very text the field shader
  // compiles (FIELD_GLSL, field-glsl.ts), so the near orbs repainted here can
  // never drift from the ones underneath at the silhouette edge.
  ${FIELD_GLSL}
  #define BLOB_COUNT ${BLOB_COUNT}
  // ---- this material's own ----
  #define FRONT_DEPTH 1.0                 // orbs whose parallax depth exceeds this pass in front of the figure (≈ half of them)
  #define TONE_SAT 0.78                   // photo saturation kept (matches the <img>'s saturate(.78))
  #define TONE_MUL vec3(0.88, 0.895, 0.92) // photo brightness, a hair cool (matches brightness(.9))

  void main(){
    vec4 tex = texture2D(u_tex, vUv);
    // Uploaded premultiplied (FigureView.tsx) so the mip/bilinear taps along
    // the silhouette stay clean; back to straight colour for the toning.
    vec3 rgb = clamp(tex.rgb / max(tex.a, 1e-4), 0.0, 1.0);
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    vec3 fig = mix(vec3(luma), rgb, TONE_SAT) * TONE_MUL;
    float a = tex.a * u_reveal * smoothstep(0.0, max(u_bottom, 1e-3), vUv.y);

    // Where this fragment sits on screen, in the field's own space.
    vec2 s = u_rect.xy + vUv * u_rect.zw;
    // Outside the panel that owns the figure, nothing: during a panel move the
    // figure lags its track (a parallax the DOM clips at the panel's edge).
    vec2 c = step(u_clip.xy, s) * step(s, u_clip.xy + u_clip.zw);
    a *= c.x * c.y;
    vec2 p = (s - 0.5) * vec2(u_aspect, 1.0);
    vec2 disp = u_disp * DISP_STRENGTH;

    float field = 0.0;
    for (int i = 0; i < BLOB_COUNT; i++) {
      float depth = DEPTH_BASE + DEPTH_VARY * hash(vec2(float(i), 4.3));
      if (depth < FRONT_DEPTH) continue;  // a far orb: the figure hides it
      vec3 blob = u_blobs[i];
      vec2 center = blob.xy + disp * depth;
      vec2 d = p - center;
      float radius = blob.z * u_blobSize;
      float sigma = radius * u_soft;
      float denom = max(2.0 * sigma * sigma, BLOB_DENOM_EPS);
      field += exp(-dot(d, d) / denom);
    }
    float pres = 1.0 - exp(-field * u_gain);
    vec3 orb = mix(DIM_COLOR, ORB_COLOR, pres);
    float vig = smoothstep(VIG_OUT, VIG_IN, length(vec2(p.x * VIG_XSQUASH, p.y)));
    float orbA = u_fade * pres * vig * u_opacity;

    // The near orbs over the figure; alpha is the figure's, so outside the
    // silhouette nothing is written and the field's own orbs show through.
    gl_FragColor = vec4(mix(fig, orb, orbA), a);
  }
`;

export const FigureMaterial = shaderMaterial(
  {
    u_tex: null,
    u_rect: new THREE.Vector4(0, 0, 1, 1),
    u_clip: new THREE.Vector4(-1, -1, 3, 3),
    u_aspect: 1,
    u_fade: 0,
    u_disp: new THREE.Vector2(0, 0),
    u_gain: 1.55,
    u_opacity: 0.76,
    u_blobSize: 1.3,
    u_soft: 0.85,
    u_blobs: Array.from({ length: BLOB_COUNT }, () => new THREE.Vector3()),
    u_reveal: 0,
    u_bottom: 0.08,
  },
  vertexShader,
  fragmentShader,
);

extend({ FigureMaterial });

export type FigureMaterialImpl = THREE.ShaderMaterial & {
  uniforms: {
    u_tex: { value: THREE.Texture | null };
    u_rect: { value: THREE.Vector4 };
    u_clip: { value: THREE.Vector4 };
    u_aspect: { value: number };
    u_fade: { value: number };
    u_disp: { value: THREE.Vector2 };
    u_gain: { value: number };
    u_opacity: { value: number };
    u_blobSize: { value: number };
    u_soft: { value: number };
    u_blobs: { value: THREE.Vector3[] };
    u_reveal: { value: number };
    u_bottom: { value: number };
  };
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    figureMaterial: ThreeElement<typeof FigureMaterial>;
  }
}
