/**
 * GLSL for the darkroom — GLSL ES 3.00 (three `glslVersion: GLSL3`), every pass
 * drawn with one fullscreen triangle. three prepends the precision qualifiers
 * and declares `position`; the shaders declare their own `in`/`out`.
 *
 * Grids: the velocity grid is aspect-corrected so its texels are square on
 * screen — velocities are in velocity-grid texels per second, which keeps the
 * physics isotropic. Every other buffer (dye, exposure, screen) samples it by
 * UV. Lengths handed in as `u_aspectN = (W/S, H/S)` turn a UV difference into
 * short-side units, so a radius reads the same on any viewport.
 */

export const FULLSCREEN_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const HEAD = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
`;

/** Semi-Lagrangian advection. VELOCITY adds no-slip walls; DYE lays down the
 *  "developer that moved" and clamps to 1. */
export const ADVECT_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_velTexel;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_dissipation;
#ifdef VELOCITY
uniform float u_viscosity;
#endif
#ifdef DYE
uniform float u_motionRate;
uniform float u_motionLow;
uniform float u_motionHigh;
uniform float u_accept;
#endif
void main() {
  vec2 vel = texture(u_velocity, vUv).xy;
  vec2 coord = vUv - u_dt * vel * u_velTexel;
  vec4 s = texture(u_source, coord) * u_dissipation;
#ifdef VELOCITY
  // viscosity: developer is thick — blend toward the four neighbours, which
  // damps texel-scale energy (and keeps vorticity confinement stable in a
  // fluid too slow for advection to diffuse it) while the wide swirls persist
  vec2 nb = texture(u_source, coord + vec2(u_texel.x, 0.0)).xy
          + texture(u_source, coord - vec2(u_texel.x, 0.0)).xy
          + texture(u_source, coord + vec2(0.0, u_texel.y)).xy
          + texture(u_source, coord - vec2(0.0, u_texel.y)).xy;
  s.xy = mix(s.xy, nb * 0.25 * u_dissipation, u_viscosity);
  // no-slip: the developer sticks to the tray walls
  vec2 edge = step(u_texel, vUv) * step(u_texel, 1.0 - vUv);
  s.xy *= edge.x * edge.y;
#endif
#ifdef DYE
  float speed = length(vel);
  s.x = min(1.0, s.x + u_accept * u_motionRate * u_dt * smoothstep(u_motionLow, u_motionHigh, speed));
#endif
  fragColor = s;
}
`;

export const CURL_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_velocity;
uniform vec2 u_texel;
void main() {
  float L = texture(u_velocity, vUv - vec2(u_texel.x, 0.0)).y;
  float R = texture(u_velocity, vUv + vec2(u_texel.x, 0.0)).y;
  float B = texture(u_velocity, vUv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_velocity, vUv + vec2(0.0, u_texel.y)).x;
  fragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`;

export const VORTICITY_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_velocity;
uniform sampler2D u_curl;
uniform vec2 u_texel;
uniform float u_strength;
uniform float u_dt;
void main() {
  float L = texture(u_curl, vUv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_curl, vUv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_curl, vUv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_curl, vUv + vec2(0.0, u_texel.y)).x;
  float C = texture(u_curl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 1e-4;
  force *= u_strength * C;
  force.y *= -1.0;
  vec2 vel = texture(u_velocity, vUv).xy + force * u_dt;
  fragColor = vec4(vel, 0.0, 1.0);
}
`;

/** Gaussian splat: adds `u_add`, then relaxes toward `u_set` by `u_blend`
 *  (both scaled by the gaussian). `u_clamp` caps .x at 1 (dye, exposure). */
export const SPLAT_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_target;
uniform vec2 u_point;
uniform vec3 u_add;
uniform vec3 u_set;
uniform float u_blend;
uniform float u_radius;
uniform vec2 u_aspectN;
uniform float u_clamp;
void main() {
  vec2 d = (vUv - u_point) * u_aspectN;
  float g = exp(-dot(d, d) / (u_radius * u_radius));
  vec3 v = texture(u_target, vUv).xyz;
  v += u_add * g;
  v = mix(v, u_set, u_blend * g);
  if (u_clamp > 0.5) v.x = min(v.x, 1.0);
  fragColor = vec4(v, 1.0);
}
`;

/** Agitation — rocking the tray: a radial push, a swirl and a slowly turning
 *  shear, all strongest at the centre and gone at the rim. */
export const AGITATE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_velocity;
uniform vec2 u_aspectN;
uniform float u_radial;
uniform float u_swirl;
uniform float u_shear;
uniform float u_phase;
uniform float u_dt;
void main() {
  vec2 d = (vUv - 0.5) * u_aspectN;
  float r = length(d) + 1e-4;
  vec2 dir = d / r;
  vec2 tang = vec2(-dir.y, dir.x);
  float env = smoothstep(0.9, 0.05, r);
  float ring = smoothstep(0.0, 0.3, r);
  vec2 f = dir * (u_radial * env)
         + tang * (u_swirl * env * ring)
         + vec2(sin(u_phase) * d.y, cos(u_phase) * d.x) * (u_shear * env);
  vec2 vel = texture(u_velocity, vUv).xy + f * u_dt;
  fragColor = vec4(vel, 0.0, 1.0);
}
`;

export const DIVERGENCE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_velocity;
uniform vec2 u_texel;
void main() {
  float L = texture(u_velocity, vUv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_velocity, vUv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_velocity, vUv - vec2(0.0, u_texel.y)).y;
  float T = texture(u_velocity, vUv + vec2(0.0, u_texel.y)).y;
  vec2 C = texture(u_velocity, vUv).xy;
  if (vUv.x < u_texel.x) L = -C.x;
  if (vUv.x > 1.0 - u_texel.x) R = -C.x;
  if (vUv.y < u_texel.y) B = -C.y;
  if (vUv.y > 1.0 - u_texel.y) T = -C.y;
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`;

export const PRESSURE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texel;
void main() {
  float L = texture(u_pressure, vUv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_pressure, vUv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_pressure, vUv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_pressure, vUv + vec2(0.0, u_texel.y)).x;
  float div = texture(u_divergence, vUv).x;
  fragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`;

export const GRADIENT_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
void main() {
  float L = texture(u_pressure, vUv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_pressure, vUv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_pressure, vUv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_pressure, vUv + vec2(0.0, u_texel.y)).x;
  vec2 vel = texture(u_velocity, vUv).xy - 0.5 * vec2(R - L, T - B);
  vec2 edge = step(u_texel, vUv) * step(u_texel, 1.0 - vUv);
  fragColor = vec4(vel * edge.x * edge.y, 0.0, 1.0);
}
`;

/** `source × scale + add` — pressure warm start, uniform dye, buffer copies. */
export const SCALE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_source;
uniform float u_scale;
uniform float u_add;
uniform float u_clamp;
void main() {
  vec4 v = texture(u_source, vUv) * u_scale + u_add;
  if (u_clamp > 0.5) v.x = min(v.x, 1.0);
  fragColor = v;
}
`;

/** Resample `u_source` so that the print rect `u_from` lands on `u_to` — the
 *  developed image follows the re-fitted print across a viewport change. */
export const REMAP_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_source;
uniform vec4 u_from;
uniform vec4 u_to;
void main() {
  vec2 p = (vUv - u_to.xy) / u_to.zw;
  vec2 src = u_from.xy + p * u_from.zw;
  fragColor = texture(u_source, clamp(src, 0.0, 1.0));
}
`;

/** exposure' = min(1, exposure + dye·rate·dt), then the fixing ease toward 1. */
export const EXPOSURE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_exposure;
uniform sampler2D u_dye;
uniform float u_rate;
uniform float u_dt;
uniform float u_accept;
uniform float u_fix;
void main() {
  float e = texture(u_exposure, vUv).x;
  float d = texture(u_dye, vUv).x;
  e = min(1.0, e + u_accept * u_rate * u_dt * d);
  e += (1.0 - e) * u_fix;
  fragColor = vec4(e, 0.0, 0.0, 1.0);
}
`;

/** Coverage: each texel of a small RGBA8 target averages 16 taps of exposure
 *  over its cell of the print, weighted by the paper's alpha (cut-out scans).
 *  R = weighted mean, G = weight. */
export const COVERAGE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_exposure;
uniform sampler2D u_print;
uniform vec4 u_rect;
uniform float u_size;
void main() {
  vec2 cell = vec2(1.0 / u_size);
  float sum = 0.0;
  float w = 0.0;
  for (int j = 0; j < 4; j++) {
    for (int i = 0; i < 4; i++) {
      vec2 p = vUv + cell * ((vec2(float(i), float(j)) + 0.5) / 4.0 - 0.5);
      float a = texture(u_print, p).a;
      sum += texture(u_exposure, u_rect.xy + p * u_rect.zw).x * a;
      w += a;
    }
  }
  fragColor = vec4(sum / max(w, 1e-3), w / 16.0, 0.0, 1.0);
}
`;

/** The composite: print under the liquid → development curve → paper → room. */
export const COMPOSITE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D u_print;
uniform sampler2D u_exposure;
uniform sampler2D u_velocity;
uniform sampler2D u_dye;
uniform vec2 u_res;
uniform vec2 u_aspectN;
uniform vec4 u_rect;
uniform vec2 u_velTexel;
uniform float u_drain;
uniform float u_seed;
uniform float u_fluid;
uniform vec2 u_slosh;
uniform float u_refraction;
uniform float u_specular;
uniform float u_specularSpeed;
uniform float u_grain;
uniform float u_paperTex;
uniform float u_paperWhite;
uniform float u_safeAlpha;
uniform float u_safeRadius;
uniform float u_vignette;
uniform float u_dyeShade;
uniform vec4 u_curve;
uniform vec3 u_amber;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec3 toSRGB(vec3 c) {
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 uv = vUv;

  // ── the liquid: seen only through what it does ──
  vec2 vel = texture(u_velocity, uv).xy * u_fluid;
  float speed = length(vel);
  vec2 uvR = uv + (vel * u_velTexel * u_refraction + u_slosh) * u_fluid;

  // ── the print, refracted together with its development ──
  float e = texture(u_exposure, uvR).x;
  vec2 puv = (uvR - u_rect.xy) / u_rect.zw;
  vec2 edgeD = min(puv, 1.0 - puv) * (u_rect.zw * u_res);
  float inPaper = clamp(min(edgeD.x, edgeD.y) + 0.5, 0.0, 1.0);
  vec4 print = texture(u_print, clamp(puv, 0.0, 1.0));
  float paper = inPaper * print.a;
  float L = dot(print.rgb, vec3(0.2126, 0.7152, 0.0722));

  // ── development: the paper comes up, midtones first, shadows last ──
  float lift = 1.0 - pow(1.0 - e, u_curve.x);
  float knee = mix(u_curve.y, u_curve.z, e * e);
  float d = 1.0 - L;
  float soft = d * (1.0 + knee) / (d + knee);
  float dmax = 1.0 - pow(1.0 - e, u_curve.w);
  float tone = u_paperWhite * lift * (1.0 - dmax * soft);

  // paper texture in the highlights, silver grain where it developed —
  // both in the paper's own space so they refract with it
  vec2 gp = uvR * u_res;
  float ptex = vnoise(gp / 5.0) * 0.6 + vnoise(gp / 13.0) * 0.4;
  tone *= 1.0 + (ptex - 0.5) * 2.0 * u_paperTex * L;
  float grain = hash21(floor(gp) + u_seed) - 0.5;
  tone *= 1.0 + grain * 2.0 * u_grain * lift;

  // ── the safelight: one amber radial, top-left, static ──
  vec2 sl = (uv - vec2(0.0, 1.0)) * u_aspectN - vec2(0.1, -0.08);
  float safelight = pow(smoothstep(u_safeRadius, 0.0, length(sl)), 1.4);

  // fibre paper: the highlights warm toward the lamp, the shadows stay neutral
  vec3 paperTint = mix(vec3(1.0), vec3(1.0, 0.94, 0.86), 0.35 + 0.65 * safelight);
  vec3 col = paperTint * tone * paper;

  // the developer itself: an almost invisible darker cloud over the print
  float dye = texture(u_dye, uv).x * u_fluid;
  col *= 1.0 - dye * u_dyeShade;

  // the drain: black rising over the print, the room light untouched
  float lvl = u_drain * 1.5 - 0.2;
  float black = 1.0 - smoothstep(lvl - 0.3, lvl + 0.1, uv.y);
  col *= (1.0 - black) * (1.0 - smoothstep(0.55, 1.0, u_drain));

  vec3 outc = toSRGB(clamp(col, 0.0, 1.0));

  // specular whisper where the surface moves fast (display space, ≤ u_specular)
  float sR = length(texture(u_velocity, uv + vec2(u_velTexel.x, 0.0)).xy);
  float sL = length(texture(u_velocity, uv - vec2(u_velTexel.x, 0.0)).xy);
  float sT = length(texture(u_velocity, uv + vec2(0.0, u_velTexel.y)).xy);
  float sB = length(texture(u_velocity, uv - vec2(0.0, u_velTexel.y)).xy);
  vec2 g = vec2(sR - sL, sT - sB);
  float gm = length(g);
  float sheen = clamp(dot(g / (gm + 1e-4), vec2(-0.6, 0.8)), 0.0, 1.0) * smoothstep(0.0, 60.0, gm);
  float sn = speed / u_specularSpeed;
  float spec = u_specular * u_fluid * (0.4 * smoothstep(0.2, 1.0, sn) + 0.6 * sheen * smoothstep(0.05, 0.6, sn));
  outc += vec3(1.0, 0.97, 0.92) * spec;

  outc += u_amber * (u_safeAlpha * safelight);

  // a barely-there vignette suggests the rim
  float vig = 1.0 - u_vignette * smoothstep(0.35, 1.1, length((uv - 0.5) * u_aspectN));
  outc *= vig;

  fragColor = vec4(outc, 1.0);
}
`;
