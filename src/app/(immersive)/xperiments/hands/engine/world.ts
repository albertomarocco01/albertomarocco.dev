import * as THREE from "three";
import {
  ANGLE_SPRING,
  ANGULAR_DAMPING,
  CARD_MAX_COVERAGE,
  CARD_MAX_ROTATION_DEG,
  CARD_MIN_SCALE,
  CARD_SCALE,
  DRIFT_SPEED,
  DRIFT_WANDER_HZ,
  FADE_MS,
  HELD_Z,
  HOLD_LAG_S,
  HOLD_RADIUS_FACTOR,
  KEYBOARD_SPEED,
  LINEAR_DAMPING,
  MAX_SPEED,
  MAX_SUBSTEPS,
  PHYSICS_STEP_S,
  PRINTS,
  PUSH_COOLDOWN_MS,
  PUSH_IMPULSE,
  PUSH_RADIUS_FRAC,
  PUSH_SPIN,
  PUSH_WAVE_MS,
  REPULSION_RANGE,
  REPULSION_STIFFNESS,
  REUNITE_MS,
  SPAWN_INSET,
  TEAR_LINE_MAX_OFFSET,
  TEAR_PART_SPEED,
  TEAR_SPIN,
  TEAR_STRETCH,
  TEAR_TILT_DEG,
  WALL_INSET,
  WALL_STIFFNESS,
  Z_SPREAD,
} from "../hands.config";
import { createCardMaterial, type CardMaterial } from "./cardMaterial";
import { clipRect, extentAlong, type Vec2 } from "./geometry";
import type { HandState } from "./hand";
import type { KeyboardCommand } from "./input";

/**
 * The scene's state: the prints as paper cards, the bodies they become when
 * torn, the hands that hold them, the physics that moves them. Imperative
 * three.js under an R3F frame loop — nothing here is React.
 *
 * Local coordinates are a card's *unit-area* frame (origin at the centre); the
 * body's group carries the layout scale `S`, so `world = pos + R(angle)·S·local`.
 */

export type WorldEvent =
  | { type: "held"; body: Body }
  | { type: "released"; body: Body }
  | { type: "torn"; body: Body }
  | { type: "pushed" }
  | { type: "focus"; body: Body | null };

interface Card {
  index: number;
  texture: THREE.Texture;
  geometry: THREE.PlaneGeometry;
  materials: [CardMaterial, CardMaterial];
  meshes: [THREE.Mesh, THREE.Mesh];
  hw: number;
  hh: number;
  whole: Body | null;
  halves: [Body, Body] | null;
  tornAt: number;
  fadeStart: number;
  /** stable id so a respawned whole card keeps its keyboard index */
  seed: number;
}

export interface Body {
  id: number;
  card: Card;
  kind: "whole" | "half";
  group: THREE.Group;
  outline: THREE.LineLoop;
  x: number;
  y: number;
  z: number;
  restZ: number;
  angle: number;
  restAngle: number;
  vx: number;
  vy: number;
  vang: number;
  /** centroid of this body's polygon in the card's local frame (0 for whole) */
  cx: number;
  cy: number;
  /** bounding radius in local units */
  r0: number;
  holders: number[];
  /** hold anchors per slot, in this body's local frame (relative to centroid) */
  anchors: Map<number, Vec2>;
  driftAngle: number;
  driftPhase: number;
  opacity: number;
  fading: boolean;
  alive: boolean;
}

interface Wave {
  x: number;
  y: number;
  t0: number;
  radius: number;
  front: number;
}

interface Holder {
  slot: number;
  present: boolean;
  pinchEnter: boolean;
  pinchExit: boolean;
  holdX: number;
  holdY: number;
  velX: number;
  velY: number;
}

const KBD_SLOT = 2;
const OUTLINE_COLOR = 0x85827b;

export class World {
  readonly root = new THREE.Group();
  bodies: Body[] = [];
  private cards: Card[] = [];
  private waves: Wave[] = [];
  private nextId = 1;
  private S = 1;
  private vw = 16;
  private vh = 9;
  private pxWorld = 0.01;
  private accumulator = 0;
  private time = 0;
  private disposed = false;
  private loader = new THREE.TextureLoader();
  private outlineMaterial = new THREE.LineBasicMaterial({
    color: OUTLINE_COLOR,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });
  private focusId: number | null = null;
  private kbd = { x: 0, y: 0, vx: 0, vy: 0, holding: null as Body | null };
  private lastPush = -1e9;
  reducedMotion = false;
  showFocus = false;
  onEvent: (e: WorldEvent) => void = () => {};

  constructor(private readonly anisotropy: number) {}

  /* ---- lifecycle ------------------------------------------------------ */

  load(): void {
    PRINTS.forEach((url, index) => {
      this.loader.load(url, (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = this.anisotropy;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.addCard(index, texture);
      });
    });
  }

  dispose(): void {
    this.disposed = true;
    for (const card of this.cards) {
      card.geometry.dispose();
      card.materials[0].dispose();
      card.materials[1].dispose();
      card.texture.dispose();
    }
    for (const body of this.bodies) body.outline.geometry.dispose();
    this.outlineMaterial.dispose();
    this.root.clear();
    this.bodies = [];
    this.cards = [];
  }

  /** Called whenever the viewport changes: world size at z = 0 and px size. */
  resize(vw: number, vh: number, heightPx: number): void {
    this.vw = vw;
    this.vh = vh;
    this.pxWorld = vh / heightPx;
    // Card scale from the viewport area; on portrait screens a floor keeps the
    // cards fingerable, capped so the prints never cover more than a fraction.
    const base = CARD_SCALE * Math.sqrt(vw * vh);
    const floor = vw < vh ? CARD_MIN_SCALE * Math.min(vw, vh) : 0;
    const cap = Math.sqrt((CARD_MAX_COVERAGE * vw * vh) / PRINTS.length);
    this.S = Math.min(Math.max(base, floor), cap);
    for (const body of this.bodies) body.group.scale.setScalar(this.S);
    for (const card of this.cards) {
      const px = this.pxWorld / this.S;
      card.materials[0].uniforms.u_px.value = px;
      card.materials[1].uniforms.u_px.value = px;
    }
  }

  private addCard(index: number, texture: THREE.Texture): void {
    const img = texture.image as { width: number; height: number };
    const aspect = img.width / img.height;
    const w = Math.sqrt(aspect);
    const h = 1 / Math.sqrt(aspect);
    const geometry = new THREE.PlaneGeometry(w, h);
    const seed = index * 17.31 + 3.7;
    const materials: [CardMaterial, CardMaterial] = [
      createCardMaterial(texture, 0, seed, w / 2, h / 2),
      createCardMaterial(texture, 1, seed, w / 2, h / 2),
    ];
    const px = this.pxWorld / this.S;
    materials[0].uniforms.u_px.value = px;
    materials[1].uniforms.u_px.value = px;
    const meshes: [THREE.Mesh, THREE.Mesh] = [
      new THREE.Mesh(geometry, materials[0]),
      new THREE.Mesh(geometry, materials[1]),
    ];
    meshes[0].frustumCulled = false;
    meshes[1].frustumCulled = false;
    const card: Card = {
      index,
      texture,
      geometry,
      materials,
      meshes,
      hw: w / 2,
      hh: h / 2,
      whole: null,
      halves: null,
      tornAt: 0,
      fadeStart: 0,
      seed,
    };
    this.cards.push(card);
    this.spawnWhole(card);
  }

  private spawnWhole(card: Card): void {
    const spot = this.freeSpot(Math.hypot(card.hw, card.hh) * this.S);
    const group = new THREE.Group();
    group.scale.setScalar(this.S);
    card.meshes[0].position.set(0, 0, 0);
    card.meshes[1].position.set(0, 0, 0);
    group.add(card.meshes[0], card.meshes[1]);
    const outline = this.makeOutline([
      { x: -card.hw, y: -card.hh },
      { x: card.hw, y: -card.hh },
      { x: card.hw, y: card.hh },
      { x: -card.hw, y: card.hh },
    ]);
    group.add(outline);
    const z = (Math.random() * 2 - 1) * Z_SPREAD;
    const maxRot = THREE.MathUtils.degToRad(CARD_MAX_ROTATION_DEG);
    const body: Body = {
      id: this.nextId++,
      card,
      kind: "whole",
      group,
      outline,
      x: spot.x,
      y: spot.y,
      z,
      restZ: z,
      angle: (Math.random() * 2 - 1) * maxRot,
      restAngle: (Math.random() * 2 - 1) * maxRot,
      vx: 0,
      vy: 0,
      vang: 0,
      cx: 0,
      cy: 0,
      r0: Math.hypot(card.hw, card.hh),
      holders: [],
      anchors: new Map(),
      driftAngle: Math.random() * Math.PI * 2,
      driftPhase: Math.random() * Math.PI * 2,
      opacity: 0,
      fading: false,
      alive: true,
    };
    for (const m of card.materials) {
      m.uniforms.u_torn.value = 0;
      m.uniforms.u_opacity.value = 0;
    }
    card.whole = body;
    card.halves = null;
    this.bodies.push(body);
    this.root.add(group);
    this.sync(body);
  }

  private makeOutline(points: Vec2[]): THREE.LineLoop {
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = 0.002;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const loop = new THREE.LineLoop(geometry, this.outlineMaterial);
    loop.visible = false;
    loop.renderOrder = 10;
    return loop;
  }

  /** A spot inside the bounds far from every other body. */
  private freeSpot(radius: number): Vec2 {
    const bx = Math.max(0.5, (this.vw / 2 - radius * WALL_INSET) * SPAWN_INSET);
    const by = Math.max(0.5, (this.vh / 2 - radius * WALL_INSET) * SPAWN_INSET);
    let best: Vec2 = { x: 0, y: 0 };
    let bestScore = -Infinity;
    for (let i = 0; i < 48; i++) {
      const x = (Math.random() * 2 - 1) * bx;
      const y = (Math.random() * 2 - 1) * by;
      let score = Infinity;
      for (const b of this.bodies) {
        if (!b.alive) continue;
        const d = Math.hypot(b.x - x, b.y - y) - b.r0 * this.S - radius;
        score = Math.min(score, d);
      }
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
    return best;
  }

  /* ---- per frame ------------------------------------------------------ */

  update(
    now: number,
    dt: number,
    hands: HandState[],
    pushes: { x: number; y: number }[],
    commands: KeyboardCommand[],
    kbdMove: { x: number; y: number },
  ): void {
    this.time = now;
    const holders: Holder[] = hands.map((h, slot) => ({
      slot,
      present: h.present,
      pinchEnter: h.pinchEnter,
      pinchExit: h.pinchExit,
      holdX: h.holdX,
      holdY: h.holdY,
      velX: h.velX,
      velY: h.velY,
    }));
    holders.push(this.keyboardHolder(commands, kbdMove, dt));

    for (const h of hands) if (h.pushed) this.push(h.pushX, h.pushY, now);
    for (const p of pushes) this.push(p.x, p.y, now);

    this.applyHolds(holders, now);
    this.reunite(now);

    // Fixed-step integration, clamped so a stall can never integrate a jump.
    this.accumulator = Math.min(this.accumulator + dt, PHYSICS_STEP_S * MAX_SUBSTEPS);
    while (this.accumulator >= PHYSICS_STEP_S) {
      this.step(PHYSICS_STEP_S, holders);
      this.accumulator -= PHYSICS_STEP_S;
    }

    for (const body of this.bodies) {
      this.fade(body, dt);
      body.outline.visible = this.showFocus && body.id === this.focusId;
      this.sync(body);
    }
  }

  private sync(body: Body): void {
    body.group.position.set(body.x, body.y, body.z);
    body.group.rotation.z = body.angle;
    // z already orders the cards; a held card also draws last so it reads on top.
    body.group.renderOrder = body.holders.length ? 5 : 0;
  }

  private fade(body: Body, dt: number): void {
    const target = body.fading ? 0 : 1;
    const k = 1 - Math.exp(-(dt * 1000) / (FADE_MS * 0.35));
    body.opacity += (target - body.opacity) * k;
    if (!body.fading && body.opacity > 0.995) body.opacity = 1;
    const m = body.card.materials;
    if (body.kind === "whole") {
      m[0].uniforms.u_opacity.value = body.opacity;
      m[1].uniforms.u_opacity.value = body.opacity;
    } else {
      const side = body.card.halves?.indexOf(body) ?? 0;
      m[side].uniforms.u_opacity.value = body.opacity;
    }
  }

  /* ---- keyboard: a virtual third hand ---------------------------------- */

  private keyboardHolder(
    commands: KeyboardCommand[],
    move: { x: number; y: number },
    dt: number,
  ): Holder {
    const k = this.kbd;
    let pinchEnter = false;
    let pinchExit = false;
    for (const c of commands) {
      switch (c.type) {
        case "focusNext":
          this.moveFocus(1);
          break;
        case "focusPrev":
          this.moveFocus(-1);
          break;
        case "toggleHold": {
          if (k.holding) {
            pinchExit = true;
          } else {
            const body = this.focusedBody();
            if (body) {
              k.x = body.x;
              k.y = body.y;
              k.vx = k.vy = 0;
              pinchEnter = true;
            }
          }
          break;
        }
        case "tear": {
          const body = k.holding ?? this.focusedBody();
          if (body && body.kind === "whole" && !body.fading) {
            const n =
              body.card.hw >= body.card.hh ? { x: 1, y: 0 } : { x: 0, y: 1 };
            this.tear(body, { x: 0, y: 0 }, n, null);
          }
          break;
        }
        case "push":
          this.push(0, 0, this.time);
          break;
      }
    }
    // Arrow keys move the cursor; the held card follows through its spring.
    const speed = KEYBOARD_SPEED * this.vh;
    k.vx = move.x * speed;
    k.vy = -move.y * speed;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    const bx = this.vw / 2;
    const by = this.vh / 2;
    k.x = Math.max(-bx, Math.min(bx, k.x));
    k.y = Math.max(-by, Math.min(by, k.y));
    return {
      slot: KBD_SLOT,
      present: true,
      pinchEnter,
      pinchExit,
      holdX: k.x,
      holdY: k.y,
      velX: k.vx,
      velY: k.vy,
    };
  }

  private focusedBody(): Body | null {
    return this.bodies.find((b) => b.id === this.focusId && b.alive) ?? null;
  }

  private moveFocus(dir: 1 | -1): void {
    const list = this.bodies.filter((b) => b.alive && !b.fading);
    if (!list.length) return;
    const i = list.findIndex((b) => b.id === this.focusId);
    const next = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    this.focusId = list[next].id;
    this.onEvent({ type: "focus", body: list[next] });
  }

  /** Index of the body among the living bodies (1-based) and the count. */
  focusIndex(body: Body): { n: number; total: number } {
    const list = this.bodies.filter((b) => b.alive && !b.fading);
    return { n: list.indexOf(body) + 1, total: list.length };
  }

  /** The keyboard focus: n = 0 when nothing is focused. */
  focusState(): { n: number; total: number } {
    const body = this.focusedBody();
    if (!body) return { n: 0, total: this.bodies.filter((b) => b.alive && !b.fading).length };
    return this.focusIndex(body);
  }

  /** World size at z = 0 (for tests and overlays). */
  viewport(): { vw: number; vh: number; scale: number } {
    return { vw: this.vw, vh: this.vh, scale: this.S };
  }

  /* ---- hold / release / tear ------------------------------------------ */

  private applyHolds(holders: Holder[], now: number): void {
    for (const h of holders) {
      if (h.pinchEnter) this.claim(h);
      if (h.pinchExit || !h.present) this.release(h);
    }
    // Two hands on one card: is it being pulled apart?
    for (const body of this.bodies) {
      if (!body.alive || body.holders.length !== 2) continue;
      const [ha, hb] = body.holders.map((s) => holders[s]);
      if (!ha || !hb) continue;
      const dx = hb.holdX - ha.holdX;
      const dy = hb.holdY - ha.holdY;
      const d = Math.hypot(dx, dy);
      if (d < 1e-4) continue;
      // Pull axis in the card's local frame.
      const c = Math.cos(-body.angle);
      const s = Math.sin(-body.angle);
      const p = { x: (dx * c - dy * s) / d, y: (dx * s + dy * c) / d };
      const extent = extentAlong(body.card.hw * 2, body.card.hh * 2, p) * this.S;
      if (d > TEAR_STRETCH * extent && body.kind === "whole") {
        const aa = body.anchors.get(ha.slot)!;
        const ab = body.anchors.get(hb.slot)!;
        const mid = { x: (aa.x + ab.x) / 2, y: (aa.y + ab.y) / 2 };
        // Keep the line within the card so both halves stay substantial.
        const off = mid.x * p.x + mid.y * p.y;
        const maxOff = (extent / this.S) * TEAR_LINE_MAX_OFFSET;
        const clamped = Math.max(-maxOff, Math.min(maxOff, off));
        const o = { x: mid.x + (clamped - off) * p.x, y: mid.y + (clamped - off) * p.y };
        this.tear(body, o, p, holders, now);
      }
    }
  }

  private claim(h: Holder): void {
    let best: Body | null = null;
    let bestD = Infinity;
    for (const body of this.bodies) {
      if (!body.alive || body.fading) continue;
      if (body.holders.includes(h.slot) || body.holders.length >= 2) continue;
      const d = Math.hypot(body.x - h.holdX, body.y - h.holdY);
      if (d < HOLD_RADIUS_FACTOR * body.r0 * this.S && d < bestD) {
        bestD = d;
        best = body;
      }
    }
    if (!best) return;
    // Release whatever this slot held before (one card per hand).
    this.release(h);
    best.holders.push(h.slot);
    best.anchors.set(h.slot, this.toLocal(best, h.holdX, h.holdY));
    if (h.slot === KBD_SLOT) this.kbd.holding = best;
    if (best.holders.length === 1) {
      this.focusId = best.id;
    }
    this.onEvent({ type: "held", body: best });
  }

  private release(h: Holder): void {
    for (const body of this.bodies) {
      const i = body.holders.indexOf(h.slot);
      if (i < 0) continue;
      body.holders.splice(i, 1);
      body.anchors.delete(h.slot);
      if (h.slot === KBD_SLOT) this.kbd.holding = null;
      if (body.holders.length === 0) {
        // The card leaves with the velocity the hand gave it.
        body.vx = h.velX;
        body.vy = h.velY;
        this.onEvent({ type: "released", body });
      }
    }
  }

  /** World point → the body's local (unit-area, centroid-relative) frame. */
  private toLocal(body: Body, x: number, y: number): Vec2 {
    const dx = (x - body.x) / this.S;
    const dy = (y - body.y) / this.S;
    const c = Math.cos(-body.angle);
    const s = Math.sin(-body.angle);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }

  /**
   * Tear a whole card along the line through `o` (local, card-centred) with
   * normal `n`. Each half becomes an independent body; whoever held the card
   * keeps the half their anchor sits on. With no holders (keyboard), the halves
   * part along the normal.
   */
  private tear(
    body: Body,
    o: Vec2,
    n: Vec2,
    holders: Holder[] | null,
    now = this.time,
  ): void {
    const card = body.card;
    // Convert body-local (centroid-relative; 0 for whole) to card-local.
    const oc = { x: o.x + body.cx, y: o.y + body.cy };
    for (const m of card.materials) {
      m.uniforms.u_lineO.value.set(oc.x, oc.y);
      m.uniforms.u_lineN.value.set(n.x, n.y);
      m.uniforms.u_torn.value = 1;
    }
    const polys = [clipRect(card.hw, card.hh, oc, n, -1), clipRect(card.hw, card.hh, oc, n, 1)];
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    const tilt = THREE.MathUtils.degToRad(TEAR_TILT_DEG);
    const halves: Body[] = [];
    polys.forEach((poly, side) => {
      const c = poly.centroid;
      const group = new THREE.Group();
      group.scale.setScalar(this.S);
      const mesh = card.meshes[side];
      mesh.position.set(-c.x, -c.y, 0);
      group.add(mesh);
      const outline = this.makeOutline(
        poly.points.map((p) => ({ x: p.x - c.x, y: p.y - c.y })),
      );
      group.add(outline);
      const sign = side === 0 ? -1 : 1;
      const half: Body = {
        id: this.nextId++,
        card,
        kind: "half",
        group,
        outline,
        x: body.x + (c.x * cos - c.y * sin) * this.S,
        y: body.y + (c.x * sin + c.y * cos) * this.S,
        z: body.z,
        restZ: body.restZ,
        angle: body.angle,
        restAngle: body.angle + sign * tilt,
        vx: body.vx,
        vy: body.vy,
        vang: sign * TEAR_SPIN,
        cx: c.x,
        cy: c.y,
        r0: poly.radius,
        holders: [],
        anchors: new Map(),
        driftAngle: Math.random() * Math.PI * 2,
        driftPhase: Math.random() * Math.PI * 2,
        opacity: body.opacity,
        fading: false,
        alive: true,
      };
      halves.push(half);
      this.root.add(group);
      this.sync(half);
    });
    // Hand over the holders: each keeps the half its anchor is on.
    for (const slot of body.holders) {
      const a = body.anchors.get(slot)!;
      const ac = { x: a.x + body.cx, y: a.y + body.cy };
      const sideOf = (ac.x - oc.x) * n.x + (ac.y - oc.y) * n.y >= 0 ? 1 : 0;
      const half = halves[sideOf];
      half.holders.push(slot);
      half.anchors.set(slot, { x: ac.x - half.cx, y: ac.y - half.cy });
      if (slot === KBD_SLOT) this.kbd.holding = half;
      const h = holders?.[slot];
      if (h) {
        half.vx = h.velX;
        half.vy = h.velY;
      }
    }
    // Free halves part along the normal, so a keyboard tear reads as a tear.
    const nw = { x: n.x * cos - n.y * sin, y: n.x * sin + n.y * cos };
    halves.forEach((half, side) => {
      if (half.holders.length) return;
      const sign = side === 0 ? -1 : 1;
      half.vx += sign * nw.x * TEAR_PART_SPEED;
      half.vy += sign * nw.y * TEAR_PART_SPEED;
    });

    body.alive = false;
    body.holders = [];
    this.root.remove(body.group);
    body.outline.geometry.dispose();
    this.bodies = this.bodies.filter((b) => b !== body);
    this.bodies.push(halves[0], halves[1]);
    card.whole = null;
    card.halves = [halves[0], halves[1]];
    card.tornAt = now;
    card.fadeStart = 0;
    if (this.focusId === body.id) {
      this.focusId = halves[0].id;
    }
    this.onEvent({ type: "torn", body: halves[0] });
  }

  /** Torn halves dim and the print quietly rejoins the drift, whole. */
  private reunite(now: number): void {
    for (const card of this.cards) {
      if (!card.halves) continue;
      const [a, b] = card.halves;
      if (!card.fadeStart) {
        const held = a.holders.length > 0 || b.holders.length > 0;
        if (!held && now - card.tornAt > REUNITE_MS) {
          card.fadeStart = now;
          a.fading = b.fading = true;
        }
        continue;
      }
      if (now - card.fadeStart < FADE_MS) continue;
      for (const half of [a, b]) {
        half.alive = false;
        this.root.remove(half.group);
        half.outline.geometry.dispose();
      }
      const refocus = this.focusId === a.id || this.focusId === b.id;
      this.bodies = this.bodies.filter((x) => x !== a && x !== b);
      this.spawnWhole(card);
      if (refocus) this.focusId = card.whole!.id;
    }
  }

  /* ---- push ------------------------------------------------------------- */

  private push(x: number, y: number, now: number): void {
    // One wave per cooldown, whichever source asks (the camera path has its
    // own per-hand cooldown too).
    if (now - this.lastPush < PUSH_COOLDOWN_MS) return;
    this.lastPush = now;
    this.waves.push({
      x,
      y,
      t0: now,
      radius: PUSH_RADIUS_FRAC * Math.max(this.vw, this.vh),
      front: -1,
    });
    this.onEvent({ type: "pushed" });
  }

  private sweepWaves(): void {
    const now = this.time;
    for (const w of this.waves) {
      const front = w.radius * Math.min(1, (now - w.t0) / PUSH_WAVE_MS);
      for (const body of this.bodies) {
        if (!body.alive || body.holders.length) continue;
        const dx = body.x - w.x;
        const dy = body.y - w.y;
        const d = Math.hypot(dx, dy);
        if (d <= w.front || d > front) continue;
        const f = 1 - (d / w.radius) * (d / w.radius);
        const strength = PUSH_IMPULSE * f * f;
        const inv = d > 1e-4 ? 1 / d : 0;
        body.vx += (d > 1e-4 ? dx * inv : Math.cos(body.driftAngle)) * strength;
        body.vy += (d > 1e-4 ? dy * inv : Math.sin(body.driftAngle)) * strength;
        body.vang += (Math.random() * 2 - 1) * PUSH_SPIN * f;
      }
      w.front = front;
    }
    this.waves = this.waves.filter((w) => w.front < w.radius);
  }

  /* ---- physics ------------------------------------------------------------ */

  private step(dt: number, holders: Holder[]): void {
    this.sweepWaves();
    const bodies = this.bodies;
    const halfW = this.vw / 2;
    const halfH = this.vh / 2;
    const t = this.time / 1000;

    for (const body of bodies) {
      if (!body.alive) continue;
      const r = body.r0 * this.S;

      if (body.holders.length) {
        this.follow(body, holders, dt);
      } else {
        // Drift: a slow wandering target velocity the card relaxes toward.
        let dvx = 0;
        let dvy = 0;
        if (!this.reducedMotion) {
          body.driftAngle +=
            Math.sin(t * Math.PI * 2 * DRIFT_WANDER_HZ + body.driftPhase) * dt * 0.6;
          dvx = Math.cos(body.driftAngle) * DRIFT_SPEED;
          dvy = Math.sin(body.driftAngle) * DRIFT_SPEED;
        }
        const damp = 1 - Math.exp(-LINEAR_DAMPING * dt);
        body.vx += (dvx - body.vx) * damp;
        body.vy += (dvy - body.vy) * damp;

        // Soft walls (critically damped).
        const bx = halfW - r * WALL_INSET;
        const by = halfH - r * WALL_INSET;
        const cw = 2 * Math.sqrt(WALL_STIFFNESS);
        if (body.x > bx) body.vx += (-WALL_STIFFNESS * (body.x - bx) - cw * Math.max(0, body.vx)) * dt;
        if (body.x < -bx) body.vx += (-WALL_STIFFNESS * (body.x + bx) - cw * Math.min(0, body.vx)) * dt;
        if (body.y > by) body.vy += (-WALL_STIFFNESS * (body.y - by) - cw * Math.max(0, body.vy)) * dt;
        if (body.y < -by) body.vy += (-WALL_STIFFNESS * (body.y + by) - cw * Math.min(0, body.vy)) * dt;

        // Tilt relaxes to the card's rest angle.
        body.vang += (-ANGLE_SPRING * (body.angle - body.restAngle) - ANGULAR_DAMPING * body.vang) * dt;
      }
    }

    // Light card–card repulsion so they never stack.
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = (a.r0 + b.r0) * this.S * REPULSION_RANGE;
        if (d >= minD || d < 1e-4) continue;
        const f = REPULSION_STIFFNESS * (minD - d) * dt;
        const nx = dx / d;
        const ny = dy / d;
        if (!a.holders.length) {
          a.vx -= nx * f;
          a.vy -= ny * f;
        }
        if (!b.holders.length) {
          b.vx += nx * f;
          b.vy += ny * f;
        }
      }
    }

    for (const body of bodies) {
      if (!body.alive) continue;
      if (!body.holders.length) {
        const sp = Math.hypot(body.vx, body.vy);
        if (sp > MAX_SPEED) {
          body.vx *= MAX_SPEED / sp;
          body.vy *= MAX_SPEED / sp;
        }
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angle += body.vang * dt;
      }
      const targetZ = body.holders.length ? HELD_Z : body.restZ;
      body.z += (targetZ - body.z) * (1 - Math.exp(-dt / 0.12));
    }
  }

  /** A held body follows its hand(s) with a critically damped spring. */
  private follow(body: Body, holders: Holder[], dt: number): void {
    const k = 1 - Math.exp(-dt / HOLD_LAG_S);
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    let tx: number;
    let ty: number;
    let targetAngle = body.angle;

    if (body.holders.length === 1) {
      const h = holders[body.holders[0]];
      const a = body.anchors.get(h.slot)!;
      tx = h.holdX - (a.x * cos - a.y * sin) * this.S;
      ty = h.holdY - (a.x * sin + a.y * cos) * this.S;
      // The tilt keeps settling toward rest, gently, while held.
      body.vang += (-ANGLE_SPRING * (body.angle - body.restAngle) - ANGULAR_DAMPING * body.vang) * dt;
      targetAngle = body.angle + body.vang * dt;
    } else {
      const ha = holders[body.holders[0]];
      const hb = holders[body.holders[1]];
      const aa = body.anchors.get(ha.slot)!;
      const ab = body.anchors.get(hb.slot)!;
      // The card turns with the axis between the two hands.
      // Two anchors at the same spot (a planted pointer anchor) define no
      // axis: keep the card's angle rather than snap it to the drag.
      if (Math.hypot(ab.x - aa.x, ab.y - aa.y) > 0.02) {
        const handAxis = Math.atan2(hb.holdY - ha.holdY, hb.holdX - ha.holdX);
        const anchorAxis = Math.atan2(ab.y - aa.y, ab.x - aa.x);
        let desired = handAxis - anchorAxis;
        // shortest arc from the current angle
        desired = body.angle + Math.atan2(Math.sin(desired - body.angle), Math.cos(desired - body.angle));
        targetAngle = body.angle + (desired - body.angle) * k;
      }
      const c2 = Math.cos(targetAngle);
      const s2 = Math.sin(targetAngle);
      const mx = { x: (aa.x + ab.x) / 2, y: (aa.y + ab.y) / 2 };
      const hx = (ha.holdX + hb.holdX) / 2;
      const hy = (ha.holdY + hb.holdY) / 2;
      tx = hx - (mx.x * c2 - mx.y * s2) * this.S;
      ty = hy - (mx.x * s2 + mx.y * c2) * this.S;
      body.vang = (targetAngle - body.angle) / dt;
    }

    const nx = body.x + (tx - body.x) * k;
    const ny = body.y + (ty - body.y) * k;
    body.vx = (nx - body.x) / dt;
    body.vy = (ny - body.y) / dt;
    body.x = nx;
    body.y = ny;
    body.angle = targetAngle;
  }
}
