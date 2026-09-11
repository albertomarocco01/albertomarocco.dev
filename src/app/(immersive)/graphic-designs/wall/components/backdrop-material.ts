import * as THREE from "three";
import { ROOM } from "../wall.config";

/**
 * The room's walls, implied and nothing more: a dark cylinder around the scene
 * with a vertical gradient, unlit, no environment map, no HDRI. It exists so
 * that orbiting reads as a room rather than as a plane floating in a void, and
 * so the floor has something other than pure black to reflect at the horizon.
 *
 * The two colours are display-referred (they are read off the site's palette),
 * so they are decoded to linear here and the shader ends on
 * `<colorspace_fragment>` — the same light space as the wall and the reflector.
 */

const vertexShader = /* glsl */ `
  varying float vHeight;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vHeight = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uTop;
  uniform vec3  uBottom;
  uniform float uFloorY;
  uniform float uTopY;
  uniform float uCurve;
  varying float vHeight;

  void main() {
    float t = clamp((vHeight - uFloorY) / (uTopY - uFloorY), 0.0, 1.0);
    gl_FragColor = vec4(mix(uBottom, uTop, pow(t, uCurve)), 1.0);
    #include <colorspace_fragment>
  }
`;

const linear = (rgb: readonly [number, number, number]) =>
  new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);

export class BackdropMaterial extends THREE.ShaderMaterial {
  constructor(floorY: number, topY: number) {
    super({
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uTop: { value: linear(ROOM.backdropTop) },
        uBottom: { value: linear(ROOM.backdropBottom) },
        uFloorY: { value: floorY },
        uTopY: { value: topY },
        uCurve: { value: ROOM.backdropCurve },
      },
    });
  }
}
