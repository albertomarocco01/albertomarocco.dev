import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";

/**
 * The name-melt material (NameMeltView.tsx). A rasterized copy of the hero h1
 * (drawn to a 2D canvas after fonts load, DPR-aware) is displayed 1:1 over the
 * DOM glyphs and displaced in the fragment shader: a cursor-centred gaussian
 * falloff drives a drifting-noise "liquid" swirl plus a gentle push away from
 * the pointer. The cursor is the only input — scroll intent belongs to the
 * sequence machine (HomeSequence) and never reaches the name.
 *
 * Under all of it, always on, is u_idle: a slow wide noise drift of about a
 * pixel — the name's share of the "reflection on still water" tremble the rest
 * of the home does in CSS. It is what keeps this material live from the moment
 * the raster exists, so the DOM h1 hands its pixels over once and never takes
 * them back. The cursor melt is a branch on top, skipped once u_engage has
 * decayed away (a uniform branch, coherent across the draw).
 *
 * Coordinates: vUv spans the padded tracker (.melt-wrap = h1 box + bleed), the
 * texture covers exactly the same rect, so sampling is 1:1. Displacement is
 * computed in CSS px (u_res is the tracker's CSS-px size) so radius/strength
 * tune in screen units regardless of aspect.
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
  uniform vec2  u_res;      // tracker size in CSS px (aspect + px<->UV conversion)
  uniform vec2  u_mouse;    // smoothed pointer in tracker-local UV (y up)
  uniform float u_radius;   // cursor falloff radius, CSS px
  uniform float u_strength; // max displacement, CSS px
  uniform float u_engage;   // 0..1 cursor envelope (rises on movement, decays idle)
  uniform float u_idle;     // constant tremble amplitude, CSS px (peak ±half this)
  uniform float u_time;

  // Same value-noise family as aura-material — one visual language.
  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }

  #define NOISE_SCALE 2.6   // swirl feature size = u_radius / this
  #define PUSH_SOFT   40.0  // softens the away-from-cursor push near its centre
  #define IDLE_SCALE  2.5   // idle feature size = box height / this — wide and slow

  void main(){
    vec2 px = vUv * u_res;

    // The tremble. Its own scale and drift rate, not the swirl below slowed
    // down: features as wide as a third of the name and a drift measured in
    // tenths, so the glyphs breathe rather than ripple.
    vec2 ip = px * (IDLE_SCALE / u_res.y);
    vec2 idle = vec2(
      noise(ip + vec2( u_time * 0.11, u_time * 0.07)),
      noise(ip + vec2(-u_time * 0.09, u_time * 0.13) + 17.3)
    ) - 0.5;
    vec2 dispPx = idle * u_idle;

    // The cursor melt, on top, only while the envelope is alive.
    if (u_engage > 0.004) {
      vec2 d = px - u_mouse * u_res;
      float r2 = dot(d, d);
      float fall = exp(-r2 / (2.0 * u_radius * u_radius));

      // Two drifting noise fields make the swirl vector — the "liquid".
      vec2 np = px * (NOISE_SCALE / u_radius);
      float n1 = noise(np + vec2(u_time * 1.15, -u_time * 0.85));
      float n2 = noise(np + vec2(-u_time * 0.95, u_time * 1.05) + 31.7);
      vec2 swirl = vec2(n1, n2) - 0.5;

      float local = fall * u_engage;
      dispPx += swirl * u_strength * 2.2 * local
              + d * inversesqrt(r2 + PUSH_SOFT) * u_strength * 0.55 * local;
    }

    gl_FragColor = texture2D(u_tex, vUv - dispPx / u_res);
  }
`;

export const MeltMaterial = shaderMaterial(
  {
    u_tex: null,
    u_res: new THREE.Vector2(1, 1),
    u_mouse: new THREE.Vector2(0.5, 0.5),
    u_radius: 90,
    u_strength: 22,
    u_engage: 0,
    u_idle: 0,
    u_time: 0,
  },
  vertexShader,
  fragmentShader,
);

extend({ MeltMaterial });

export type MeltMaterialImpl = THREE.ShaderMaterial & {
  uniforms: {
    u_tex: { value: THREE.Texture | null };
    u_res: { value: THREE.Vector2 };
    u_mouse: { value: THREE.Vector2 };
    u_radius: { value: number };
    u_strength: { value: number };
    u_engage: { value: number };
    u_idle: { value: number };
    u_time: { value: number };
  };
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    meltMaterial: ThreeElement<typeof MeltMaterial>;
  }
}
