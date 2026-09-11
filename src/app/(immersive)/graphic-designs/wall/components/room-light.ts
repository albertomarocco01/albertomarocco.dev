import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { ROOM, WALL } from "../wall.config";

/**
 * The wall, as a light.
 *
 * A 6 × 3 m emissive plane in a black room does not only glow — it lights the
 * room, and the falloff of that light across the floor is most of what makes
 * the scale believable. A `RectAreaLight` of exactly the panel's dimensions is
 * the honest way to do it: no point light standing in for an area source, no
 * environment map, no HDRI.
 *
 * Three's linearly-transformed-cosine tables have to be uploaded once before
 * any rect-area light renders, or every surface it touches comes out black. The
 * call is idempotent and the tables are shared, so it is done here, once, and
 * this module is the only place that reaches into three's addons.
 */
let initialised = false;

export function initRoomLight(): THREE.RectAreaLight {
  if (!initialised) {
    RectAreaLightUniformsLib.init();
    initialised = true;
  }
  // colour is set every frame from the loop's current accent (see WallScene)
  return new THREE.RectAreaLight(0xffffff, ROOM.wallLight.intensity, WALL.width, WALL.height);
}
