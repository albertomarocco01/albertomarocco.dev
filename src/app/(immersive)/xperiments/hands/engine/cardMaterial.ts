import * as THREE from "three";
import {
  CARD_EDGE_PX,
  CARD_TINT,
  TEAR_NOISE_AMP,
  TEAR_NOISE_FREQ,
  TEAR_STRIP_PX,
} from "../hands.config";

/**
 * The card material. A print is two half-meshes sharing one geometry and one
 * texture, with complementary alpha masks: `side` 0 keeps the part of the
 * card on the negative side of a 1D-noise tear line, `side` 1 the rest. Intact,
 * the two are cut by a hard `step` on the same curve, so they tile exactly and
 * show no seam. Torn, the cut edge gets a lighter, fibrous strip and a 1 px
 * soft alpha.
 *
 * Coordinates in the shader are the geometry's own (unit-area, origin at the
 * centre); the scene scales the parent group, and hands `u_px` — one screen
 * pixel in those units — so the edge and strip widths stay in pixels.
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vLocal;
  void main() {
    vUv = uv;
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D u_map;
  uniform float u_side;
  uniform float u_torn;
  uniform float u_opacity;
  uniform vec2 u_lineO;
  uniform vec2 u_lineN;
  uniform float u_amp;
  uniform float u_freq;
  uniform float u_seed;
  uniform vec2 u_half;
  uniform float u_px;
  uniform float u_edgePx;
  uniform float u_stripPx;
  uniform vec3 u_tint;
  varying vec2 vUv;
  varying vec2 vLocal;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }
  // Signed distance-ish to the tear curve: a straight line through u_lineO
  // with normal u_lineN, displaced along the normal by 1D noise of the
  // coordinate along the line.
  float tear(vec2 p) {
    vec2 t = vec2(-u_lineN.y, u_lineN.x);
    float along = dot(p - u_lineO, t);
    float n = noise1(along * u_freq + u_seed) * 2.0 - 1.0;
    n += 0.45 * (noise1(along * u_freq * 2.9 + u_seed * 7.3) * 2.0 - 1.0);
    return dot(p - u_lineO, u_lineN) - n * u_amp;
  }

  void main() {
    float d = tear(vLocal);
    float side = u_side < 0.5 ? -d : d; // keep where side ≥ 0
    float cut = mix(step(0.0, side), smoothstep(-0.5 * u_px, 0.5 * u_px, side), u_torn);
    if (cut <= 0.0) discard;

    vec4 c = texture2D(u_map, vUv);
    vec3 col = c.rgb * u_tint;

    // 1 px darker edge: the paper's thickness.
    vec2 e = u_half - abs(vLocal);
    float edge = min(e.x, e.y);
    col *= mix(0.42, 1.0, smoothstep(0.0, u_px * (u_edgePx + 0.5), edge));

    // The torn edge: a lighter, fibrous strip on both halves.
    float strip = u_torn * (1.0 - smoothstep(0.0, u_px * u_stripPx, side));
    float fibre = 0.55 + 0.45 * noise1((vLocal.x * 3.1 + vLocal.y * 5.7) * u_freq * 7.0 + u_seed);
    fibre *= 0.7 + 0.3 * noise1(dot(vLocal, vec2(-u_lineN.y, u_lineN.x)) * u_freq * 23.0 + u_seed * 1.7);
    col = mix(col, vec3(0.90, 0.87, 0.80) * fibre, strip * 0.9);

    gl_FragColor = vec4(col, u_opacity * cut);
    #include <colorspace_fragment>
  }
`;

export interface CardUniforms {
  u_map: { value: THREE.Texture };
  u_side: { value: number };
  u_torn: { value: number };
  u_opacity: { value: number };
  u_lineO: { value: THREE.Vector2 };
  u_lineN: { value: THREE.Vector2 };
  u_amp: { value: number };
  u_freq: { value: number };
  u_seed: { value: number };
  u_half: { value: THREE.Vector2 };
  u_px: { value: number };
  u_edgePx: { value: number };
  u_stripPx: { value: number };
  u_tint: { value: THREE.Vector3 };
}

export type CardMaterial = THREE.ShaderMaterial & { uniforms: CardUniforms };

export function createCardMaterial(
  texture: THREE.Texture,
  side: 0 | 1,
  seed: number,
  halfW: number,
  halfH: number,
): CardMaterial {
  const uniforms: CardUniforms = {
    u_map: { value: texture },
    u_side: { value: side },
    u_torn: { value: 0 },
    u_opacity: { value: 0 },
    u_lineO: { value: new THREE.Vector2(0, 0) },
    u_lineN: { value: new THREE.Vector2(1, 0) },
    u_amp: { value: TEAR_NOISE_AMP * Math.min(halfW, halfH) * 2 },
    u_freq: { value: TEAR_NOISE_FREQ },
    u_seed: { value: seed },
    u_half: { value: new THREE.Vector2(halfW, halfH) },
    u_px: { value: 0.01 },
    u_edgePx: { value: CARD_EDGE_PX },
    u_stripPx: { value: TEAR_STRIP_PX },
    u_tint: { value: new THREE.Vector3(...CARD_TINT) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  return material as CardMaterial;
}
