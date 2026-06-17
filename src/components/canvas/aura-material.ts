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
 * u_white (0..1) desaturates the whole palette toward a soft, cool neutral —
 * the same material renders both the amber/ember work reveals (u_white 0) and
 * the ambient white field on the gate/home (u_white 1). One shader, two moods;
 * the noise + vignette math is identical for both.
 *
 * u_mouse (view-local UV) + u_mouseStr (recent pointer speed, decaying) stir the
 * domain-warp coordinates with a pointer-centred swirl/smear — the white field's
 * cursor reactivity. u_mouseStr 0 is an exact identity, so the work reveals
 * (which never set it) are untouched.
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
  uniform float u_white; // tint 0..1: warm work aura -> ambient cool white
  uniform float u_fade;  // master opacity
  uniform vec2  u_mouse; // pointer in view-local UV (0..1), centred at rest
  uniform float u_mouseStr; // recent pointer speed (0..1), decays to 0 at rest

  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=.5; } return v; }

  void main(){
    vec2 uv = vUv;
    vec2 p = (uv-0.5)*vec2(u_res.x/u_res.y, 1.0)*2.4;

    // Pointer-stirred domain warp ("effetto smosso"): a soft swirl + smear
    // around the cursor whose magnitude follows recent pointer speed
    // (u_mouseStr, decaying). u_mouseStr 0 ⇒ identity, so the amber work
    // reveals (which never set it) are untouched — only the white field stirs.
    vec2 mp = (u_mouse-0.5)*vec2(u_res.x/u_res.y, 1.0)*2.4;
    vec2 md = p - mp;
    float infl = exp(-dot(md,md)*1.1);          // soft, wide halo around the cursor
    float ang = infl * u_mouseStr * 2.4;         // swirl angle, scaled by speed
    float s = sin(ang), c = cos(ang);
    p = mp + mat2(c,-s,s,c)*md;                  // stir the field near the cursor
    p -= md * infl * u_mouseStr * 0.8;           // and smear it toward the pointer

    float t = u_time*0.035;
    vec2 q = vec2(fbm(p+t), fbm(p+vec2(5.2,1.3)-t));
    vec2 r = vec2(fbm(p+3.6*q+vec2(1.7,9.2)+t*0.6), fbm(p+3.6*q+vec2(8.3,2.8)-t*0.5));
    float f = fbm(p+3.6*r);
    vec3 base = vec3(0.033,0.029,0.030), mid = vec3(0.105,0.092,0.082);
    vec3 amber = vec3(0.64,0.43,0.22), ember = vec3(0.50,0.27,0.16);
    vec3 hot = mix(amber, ember, u_cool);
    // Ambient white field: a soft, faintly cool neutral that stays distinct
    // from the warm work aura. Same structure, desaturated by u_white.
    base = mix(base, vec3(0.046,0.048,0.055), u_white);
    mid  = mix(mid,  vec3(0.175,0.181,0.196), u_white);
    hot  = mix(hot,  vec3(0.88,0.89,0.92),    u_white);
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
    u_mouse: new THREE.Vector2(0.5, 0.5),
    u_mouseStr: 0,
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
    u_mouse: { value: THREE.Vector2 };
    u_mouseStr: { value: number };
  };
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    auraMaterial: ThreeElement<typeof AuraMaterial>;
  }
}
