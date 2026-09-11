import * as THREE from "three";
import {
  LED,
  LED_CABINETS,
  LED_DOT_GAIN,
  LED_OFF_FLOOR,
  LED_PIXELS,
} from "../wall.config";

/**
 * The LED surface.
 *
 * The loop arrives as a texture (see loop-source.ts); everything that makes it
 * read as a physical wall rather than a video is added here, in the wall's own
 * fragment shader: the lamp grid at true pitch, the cabinet seams, a per-lamp
 * brightness spread, and the off-axis falloff of a real panel.
 *
 * The one rule the surface has to obey is Nyquist. At 2.6 mm pitch the wall is
 * 2307 × 1153 lamps; from 7 m that is far finer than a screen pixel, and drawing
 * it there would be pure moiré. `fwidth` gives the screen-space size of a cell
 * every frame, and the grid — sampling, dots, jitter alike — dissolves into a
 * flat surface across `resolveLo … resolveHi`, well before the 0.5 cells/pixel
 * limit. The mask is normalised so its cell average is exactly 1, so the wall
 * does not change brightness as the structure fades in or out.
 *
 * Colour: the loop texture holds the site's own display-referred output (the
 * bytes the home page paints), so it is decoded to linear light here and the
 * shader ends on `<colorspace_fragment>` — which is a no-op into a render
 * target and the sRGB encode on the way to the screen. That is what keeps the
 * wall, its reflection in the floor and the bloom all in one light space.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = cameraPosition - world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uLoop;
  uniform vec2  uPixels;     // lamps across the wall (x, y)
  uniform vec2  uCabinets;   // cabinet grid
  uniform float uFill;       // lit dot diameter / cell
  uniform float uDotGain;    // lit level  ┐ solved together so the cell
  uniform float uOffFloor;   // dark level ┘ average is 1 (see wall.config.ts)
  uniform float uJitter;     // per-lamp brightness spread, ±
  uniform float uSeamLeds;   // cabinet seam width, in pitches
  uniform float uSeamDarken;
  uniform float uIntensity;
  uniform float uAngle;      // off-axis falloff, 0 … 1
  uniform vec2  uResolve;    // (lo, hi) cells-per-device-pixel fade band

  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
  }

  void main() {
    vec2 uv = vUv;
    vec2 duv = fwidth(uv);

    // how much of a lamp cell falls inside one device pixel, on the worse axis:
    // this is the whole moiré guard, and it costs one fwidth
    float cells = max(duv.x * uPixels.x, duv.y * uPixels.y);
    float resolve = 1.0 - smoothstep(uResolve.x, uResolve.y, cells);

    // while the grid resolves, each lamp shows ONE colour, sampled at its
    // centre; once it does not, the quantisation would alias at exactly the
    // frequency we are hiding, so the sample slides back to continuous
    vec2 cell = floor(uv * uPixels) + 0.5;
    vec2 sampleUv = mix(uv, cell / uPixels, resolve);
    vec3 content = texture2D(uLoop, sampleUv).rgb;

    // the lamp itself: a round dot inside its cell, analytically anti-aliased
    vec2 g = fract(uv * uPixels) - 0.5;
    float r = length(g) * 2.0;                       // 0 at the centre, 1 at the cell edge
    float w = max(cells * 2.0, 1e-3);
    float shape = 1.0 - smoothstep(uFill - w, uFill + w, r);
    float jitter = 1.0 + (hash21(cell) - 0.5) * 2.0 * uJitter;
    float mask = mix(1.0, mix(uOffFloor, uDotGain, shape) * jitter, resolve);

    // cabinet seams — one pitch wide. Left analytic on purpose: once the line
    // is thinner than a pixel the smoothstep returns partial coverage, so a
    // distant seam reads as a faint dimming instead of a crawling hairline.
    vec2 seam = fract(uv * uCabinets);
    vec2 dSeam = (0.5 - abs(seam - 0.5)) / uCabinets;   // uv distance to the nearest seam
    vec2 halfW = 0.5 * uSeamLeds / uPixels;
    vec2 aa = max(duv, vec2(1e-6));
    vec2 s = smoothstep(halfW - aa, halfW + aa, dSeam);
    mask *= 1.0 - uSeamDarken * (1.0 - min(s.x, s.y));

    // a panel loses output off-normal; this is also what gives the wall an edge
    // when you orbit past it, and it carries into the floor reflection for free
    float ndv = clamp(abs(dot(normalize(vNormalW), normalize(vViewW))), 0.0, 1.0);
    float angle = mix(1.0, ndv, uAngle);

    gl_FragColor = vec4(srgbToLinear(content) * uIntensity * mask * angle, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The wall's material. Emissive only — there is nothing in the room to light
 * it, and `toneMapped` is meaningless for a shader that writes its own colour,
 * so the intensity is what sets how hard the bloom bites.
 */
export class LedWallMaterial extends THREE.ShaderMaterial {
  constructor(loop: THREE.Texture) {
    super({
      vertexShader,
      fragmentShader,
      toneMapped: false,
      uniforms: {
        uLoop: { value: loop },
        uPixels: { value: new THREE.Vector2(LED_PIXELS[0], LED_PIXELS[1]) },
        uCabinets: { value: new THREE.Vector2(LED_CABINETS[0], LED_CABINETS[1]) },
        uFill: { value: LED.fill },
        uDotGain: { value: LED_DOT_GAIN },
        uOffFloor: { value: LED_OFF_FLOOR },
        uJitter: { value: LED.jitter },
        uSeamLeds: { value: LED.seamLeds },
        uSeamDarken: { value: LED.seamDarken },
        uIntensity: { value: LED.intensity },
        uAngle: { value: LED.angleFalloff },
        uResolve: { value: new THREE.Vector2(LED.resolveLo, LED.resolveHi) },
      },
    });
  }
}
