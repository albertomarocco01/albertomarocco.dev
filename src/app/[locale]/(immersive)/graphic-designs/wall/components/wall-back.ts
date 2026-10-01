import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BACK, LED_CABINETS, WALL } from "../wall.config";

/**
 * The back of the wall — what a client walks round to see: 72 cabinet backs
 * with their lips, connectors and handle recesses; the power and data leads
 * daisy-chained cabinet to cabinet along each row; one loom per row dropping
 * to the riser and running along it to the processor; and the ground support
 * that holds the whole thing up.
 *
 * Everything repeated is instanced and everything else is merged, so the
 * whole back is six draw calls:
 *   cabinets (72 instances of one merged geometry, coloured per part by
 *   vertex colour), the row links (66 instances of one power+data pair), the
 *   looms (6 tubes merged), the support (22 instances of a unit box), the
 *   processor, its pilot light.
 *
 * All of it is laid out from `LED_CABINETS` and `WALL`, so the back can never
 * disagree with the front. One `dispose()` frees every geometry and material.
 */

const [COLS, ROWS] = LED_CABINETS;
const PITCH = WALL.width / COLS; // 0.5 m, cabinet + gap
const CAB = PITCH - BACK.gap; // the cabinet itself
const DEPTH = WALL.bodyDepth;
const BACK_Z = -DEPTH; // the cabinet backs
const RISER_TOP = WALL.riserHeight;
/** the riser is centred on the cabinet body (see WallScene), so its back face is here */
const RISER_BACK = -WALL.riserDepth / 2 - DEPTH / 2;

const cabinetX = (i: number) => -WALL.width / 2 + (i + 0.5) * PITCH;
const cabinetY = (j: number) => WALL.riserHeight + (j + 0.5) * PITCH;

/** Where a cabinet's connector block sits (its centre), and where its leads leave it. */
const connectorAt = (i: number, j: number) =>
  new THREE.Vector3(
    cabinetX(i) + BACK.connector.offset[0],
    cabinetY(j) + BACK.connector.offset[1],
    BACK_Z - BACK.connector.size[2] / 2,
  );
const leadZ = BACK_Z - BACK.connector.size[2] - 0.006;

/** Tint a geometry with one vertex colour, so parts can merge into one material. */
function paint(geometry: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geometry.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    colors[k * 3] = c.r;
    colors[k * 3 + 1] = c.g;
    colors[k * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** A box, painted, moved into place, and un-indexed so it merges with the extruded lip. */
function box(size: readonly [number, number, number], hex: string, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
  g.translate(x, y, z);
  return paint(g, hex);
}

/**
 * One cabinet, in its own frame: body, rear lip, connector block, handle recess.
 * The bodies are a full pitch wide so they touch — a real wall is light-tight,
 * and a 4 mm slit between the bodies would show the lit floor in front through
 * the wall from behind. The gap lives in the lips, where it is seen.
 */
function cabinetGeometry(): THREE.BufferGeometry {
  const body = box([PITCH, PITCH, DEPTH], BACK.colors.cabinet, 0, 0, -DEPTH / 2);

  // the lip: a square frame standing proud of the back face
  const outer = new THREE.Shape();
  const h = CAB / 2;
  outer.moveTo(-h, -h);
  outer.lineTo(h, -h);
  outer.lineTo(h, h);
  outer.lineTo(-h, h);
  outer.closePath();
  const hole = new THREE.Path();
  const hi = h - BACK.lipWidth;
  hole.moveTo(-hi, -hi);
  hole.lineTo(-hi, hi);
  hole.lineTo(hi, hi);
  hole.lineTo(hi, -hi);
  hole.closePath();
  outer.holes.push(hole);
  const lip = new THREE.ExtrudeGeometry(outer, { depth: BACK.lipDepth, bevelEnabled: false });
  lip.translate(0, 0, BACK_Z - BACK.lipDepth);
  paint(lip, BACK.colors.lip);

  const connector = box(
    BACK.connector.size,
    BACK.colors.connector,
    BACK.connector.offset[0],
    BACK.connector.offset[1],
    BACK_Z - BACK.connector.size[2] / 2,
  );
  // ponytail: the recess is a dark plate a hair proud of the back, not a cut — reads the same past arm's length
  const handle = box(
    BACK.handle.size,
    BACK.colors.handle,
    BACK.handle.offset[0],
    BACK.handle.offset[1],
    BACK_Z - BACK.handle.size[2] / 2 + 0.0005,
  );

  const merged = mergeGeometries([body, lip, connector, handle]);
  for (const g of [body, lip, connector, handle]) g.dispose();
  return merged;
}

/** A lead drooping between two connectors 500 mm apart: a quadratic bezier sags by `sag` at its middle. */
function linkGeometry(radius: number, lift: number): THREE.BufferGeometry {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, lift, 0),
    new THREE.Vector3(PITCH / 2, lift - 2 * BACK.cable.sag, 0),
    new THREE.Vector3(PITCH, lift, 0),
  );
  return new THREE.TubeGeometry(curve, 10, radius, 5, false);
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class WallBack {
  readonly group = new THREE.Group();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor() {
    const alu = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: BACK.roughness,
      metalness: BACK.metalness,
    });
    this.materials.push(alu);

    // ── cabinets ──
    const cabinet = this.keep(cabinetGeometry());
    const cabinets = new THREE.InstancedMesh(cabinet, alu, COLS * ROWS);
    let k = 0;
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        matrix.makeTranslation(cabinetX(i), cabinetY(j), 0);
        cabinets.setMatrixAt(k++, matrix);
      }
    }
    this.group.add(cabinets);

    // ── row links: one power + one data lead per neighbouring pair ──
    const cable = new THREE.MeshStandardMaterial({ color: BACK.colors.cable, roughness: 0.6, metalness: 0 });
    this.materials.push(cable);
    const power = linkGeometry(BACK.cable.powerRadius, 0);
    const data = linkGeometry(BACK.cable.dataRadius, BACK.cable.dataLift);
    const pair = this.keep(mergeGeometries([power, data]));
    power.dispose();
    data.dispose();
    const links = new THREE.InstancedMesh(pair, cable, (COLS - 1) * ROWS);
    k = 0;
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS - 1; i++) {
        const from = connectorAt(i, j);
        matrix.makeTranslation(from.x, from.y - BACK.connector.size[1] / 2, leadZ);
        links.setMatrixAt(k++, matrix);
      }
    }
    this.group.add(links);

    // ── looms: each row's chain leaves its left-hand cabinet, drops to the riser,
    //    runs along it and steps down to the processor on the floor at the right ──
    const loomTubes: THREE.BufferGeometry[] = [];
    const P = BACK.processor;
    const px = P.x;
    const pz = P.z;
    for (let j = 0; j < ROWS; j++) {
      const start = connectorAt(0, j);
      start.y -= BACK.connector.size[1] / 2;
      start.z = leadZ;
      const dropX = start.x - 0.06 - j * BACK.cable.loomSpacing;
      const dropZ = leadZ - 0.01 - j * BACK.cable.loomSpacing;
      const runY = RISER_TOP + BACK.cable.loomRadius + 0.002;
      const curve = new THREE.CatmullRomCurve3(
        [
          start,
          new THREE.Vector3(dropX, start.y - 0.12, dropZ),
          new THREE.Vector3(dropX, runY + 0.08, dropZ),
          new THREE.Vector3(dropX + 0.08, runY, dropZ),
          new THREE.Vector3(px - 0.5, runY, dropZ),
          new THREE.Vector3(px - 0.34, RISER_TOP - 0.03, RISER_BACK - 0.03),
          new THREE.Vector3(px - P.size[0] / 2 - 0.02, P.size[1] * 0.6, pz),
        ],
        false,
        "centripetal",
      );
      loomTubes.push(new THREE.TubeGeometry(curve, 72, BACK.cable.loomRadius, 6, false));
    }
    const looms = this.keep(mergeGeometries(loomTubes));
    for (const g of loomTubes) g.dispose();
    this.group.add(new THREE.Mesh(looms, cable));

    // ── ground support: a unit box, instanced ──
    const S = BACK.support;
    const steel = new THREE.MeshStandardMaterial({
      color: BACK.colors.support,
      roughness: BACK.roughness,
      metalness: BACK.metalness,
    });
    this.materials.push(steel);
    const unit = this.keep(new THREE.BoxGeometry(1, 1, 1));
    const parts: THREE.Matrix4[] = [];
    const place = (sx: number, sy: number, sz: number, x: number, y: number, z: number, q?: THREE.Quaternion) => {
      position.set(x, y, z);
      scale.set(sx, sy, sz);
      parts.push(new THREE.Matrix4().compose(position, q ?? quaternion.identity(), scale));
    };
    const uprightZ = -S.standoff;
    const span = WALL.width - PITCH; // uprights inset half a cabinet from each end
    for (let n = 0; n < S.count; n++) {
      const x = -span / 2 + (n * span) / (S.count - 1);
      place(S.section, S.height, S.section, x, S.height / 2, uprightZ);
      place(S.foot[0], S.foot[1], S.foot[2], x, S.foot[1] / 2, uprightZ);
      // outrigger: from the upright, down and back to the floor
      const top = new THREE.Vector3(x, S.outriggerFrom, uprightZ);
      const foot = new THREE.Vector3(x, 0, uprightZ - S.outriggerReach);
      const dir = foot.clone().sub(top);
      const len = dir.length();
      const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
      const mid = top.clone().add(foot).multiplyScalar(0.5);
      place(S.outriggerSection, len, S.outriggerSection, mid.x, mid.y, mid.z, q);
      place(S.foot[0], S.foot[1], S.foot[2], foot.x, S.foot[1] / 2, foot.z);
      // bracket, bolting the upright to the riser's back
      const bz = (RISER_BACK + (uprightZ + S.section / 2)) / 2;
      place(S.bracket[0], S.bracket[1], RISER_BACK - (uprightZ + S.section / 2), x, RISER_TOP / 2, bz);
    }
    for (const y of S.railY) {
      place(WALL.width - 0.1, S.railSection, S.railSection, 0, y, uprightZ + S.section / 2 + S.railSection / 2);
    }
    const support = new THREE.InstancedMesh(unit, steel, parts.length);
    parts.forEach((m, i) => support.setMatrixAt(i, m));
    this.group.add(support);

    // ── the processor, and its pilot light ──
    const boxMat = new THREE.MeshStandardMaterial({ color: BACK.colors.processor, roughness: 0.85, metalness: 0.3 });
    this.materials.push(boxMat);
    const processor = new THREE.Mesh(this.keep(new THREE.BoxGeometry(P.size[0], P.size[1], P.size[2])), boxMat);
    processor.position.set(P.x, P.size[1] / 2, P.z);
    this.group.add(processor);

    const pilotMat = new THREE.MeshBasicMaterial({ toneMapped: false, fog: false });
    pilotMat.color.setRGB(BACK.colors.pilot[0], BACK.colors.pilot[1], BACK.colors.pilot[2]);
    this.materials.push(pilotMat);
    const pilot = new THREE.Mesh(this.keep(new THREE.BoxGeometry(P.pilot[0], P.pilot[1], P.pilot[2])), pilotMat);
    pilot.position.set(P.x - P.size[0] / 2 + 0.04, P.size[1] * 0.7, P.z - P.size[2] / 2 - P.pilot[2] / 2);
    this.group.add(pilot);

  }

  private keep<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const child of this.group.children) {
      if (child instanceof THREE.InstancedMesh) child.dispose();
    }
  }
}
