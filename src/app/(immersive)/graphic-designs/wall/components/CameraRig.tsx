import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import * as THREE from "three";
import { CAMERA, PRESETS, TOUR, WALL, type CameraPreset, type TourStation } from "../wall.config";
import type { WallBus } from "./wall-bus";

const DEG = Math.PI / 180;
const ACTION = CameraControlsImpl.ACTION;
const target = new THREE.Vector3();
const eye = new THREE.Vector3();

/** where the tour's label stands: right of the wall, at eye height, a step from its edge */
const LABEL_POINT = new THREE.Vector3(WALL.width / 2 + TOUR.labelGap, CAMERA.eye, 0);
/** the wall as a box — for "how close am I" and "is it in the way" */
const WALL_BOX = new THREE.Box3(
  new THREE.Vector3(-WALL.width / 2, WALL.riserHeight, -WALL.bodyDepth),
  new THREE.Vector3(WALL.width / 2, WALL.riserHeight + WALL.height, WALL.faceOffset),
);
const sight = new THREE.Ray();
const hit = new THREE.Vector3();
const ndc = new THREE.Vector3();

/**
 * The site's signature easing, `cubic-bezier(0.22, 1, 0.36, 1)`, as a plain
 * function for the tour's flights. Newton–Raphson with a bisection fallback,
 * the way browsers evaluate a CSS cubic-bezier. `src/lib/motion.ts` has the
 * same function, but importing it would pull GSAP into this chunk for one
 * curve.
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-5) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-5) {
      if (sampleX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}
const fieldEase = cubicBezier(0.22, 1, 0.36, 1);

/** A flight in progress: from where the camera was to a station, over `TOUR.flightSeconds`. */
interface Flight {
  readonly fromEye: THREE.Vector3;
  readonly fromTarget: THREE.Vector3;
  readonly toEye: THREE.Vector3;
  readonly toTarget: THREE.Vector3;
  station: number;
  t: number;
}
/** closer than this to a station's pose, in metres, counts as already there */
const ALREADY_THERE = 0.01;

/**
 * Limits and input map. A module-scope helper so nothing writes to a hook's or
 * a prop's fields from inside a component (the React compiler rules), and so
 * the whole input contract of the piece reads in one block.
 *
 * Orbit and dolly only — no truck. The presets are compositions; letting the
 * wall slide off-centre would turn a rendering into a viewer. The azimuth is
 * free: the back of the wall is part of the piece.
 */
function configureControls(c: CameraControlsImpl): void {
  c.minPolarAngle = CAMERA.minPolar * DEG;
  c.maxPolarAngle = CAMERA.maxPolar * DEG;
  c.minAzimuthAngle = -CAMERA.azimuthLimit * DEG;
  c.maxAzimuthAngle = CAMERA.azimuthLimit * DEG;
  c.minDistance = CAMERA.minDistance;
  c.maxDistance = CAMERA.maxDistance;
  c.smoothTime = CAMERA.smoothTime;
  c.draggingSmoothTime = CAMERA.draggingSmoothTime;
  c.dollySpeed = CAMERA.dollySpeed;
  c.mouseButtons.left = ACTION.ROTATE;
  c.mouseButtons.middle = ACTION.DOLLY;
  c.mouseButtons.right = ACTION.NONE;
  c.touches.three = ACTION.NONE;
  setTouring(c, false);
}

/**
 * Inside the tour the wheel and a finger belong to the tour — they step
 * between stations — so the controls give them up. A mouse drag still orbits:
 * looking around a station is part of it.
 */
function setTouring(c: CameraControlsImpl, touring: boolean): void {
  c.mouseButtons.wheel = touring ? ACTION.NONE : ACTION.DOLLY;
  c.touches.one = touring ? ACTION.NONE : ACTION.TOUCH_ROTATE;
  c.touches.two = touring ? ACTION.NONE : ACTION.TOUCH_DOLLY;
}

/**
 * Keep the eye above the floor. A fixed 100° polar limit is fine at 7 m, but
 * at 20 m it puts the camera under the ground plane, which is single-sided
 * and vanishes. So the limit is the smaller of the configured one and the
 * angle at which the eye would reach `floorClearance` at the current distance;
 * camera-controls only clamps when asked, so an out-of-range polar is nudged
 * back with its own damping.
 */
function clampPolarToFloor(c: CameraControlsImpl, animate: boolean): void {
  const ty = c.getTarget(target).y;
  const cos = THREE.MathUtils.clamp((CAMERA.floorClearance - ty) / c.distance, -1, 1);
  const max = Math.min(CAMERA.maxPolar * DEG, Math.acos(cos));
  c.maxPolarAngle = max;
  if (c.polarAngle > max + 1e-4) void c.rotatePolarTo(max, animate);
}

/**
 * The pose a preset or a station resolves to on this viewport. The wide views
 * are pushed back on a narrower one — a 6 m wall does not fit a phone held
 * upright at 7 m — by stretching the camera's offset from its target, which
 * keeps the angle and only changes the distance. `camera.aspect` is read off
 * the instance rather than through React, so a resize never yanks a visitor
 * who has orbited away from a preset.
 */
function fitPose(
  c: CameraControlsImpl,
  pose: Pick<CameraPreset, "position" | "target" | "fit">,
): readonly [number, number, number, number, number, number] {
  const camera = c.camera;
  const aspect = "aspect" in camera ? camera.aspect : CAMERA.fitAspect;
  const [px, py, pz] = pose.position;
  const [tx, ty, tz] = pose.target;
  const base = Math.hypot(px - tx, py - ty, pz - tz);
  // …but never past the dolly limit. On a phone held upright the whole wall
  // simply cannot fit a 45° frame from anywhere in the room, and a camera 24 m
  // back to make it fit would leave the wall a chip in a field of black. At the
  // limit it fills the width with its outer edges just cropped, which is the
  // better of the two portraits.
  const fit = pose.fit
    ? Math.min(Math.max(1, CAMERA.fitAspect / aspect), CAMERA.maxDistance / base)
    : 1;
  return [tx + (px - tx) * fit, ty + (py - ty) * fit, tz + (pz - tz) * fit, tx, ty, tz];
}

/** Frame a preset through the controls' own damping (or cut). */
function applyPreset(c: CameraControlsImpl, preset: CameraPreset, animate: boolean): void {
  const [px, py, pz, tx, ty, tz] = fitPose(c, preset);
  void c.setLookAt(px, py, pz, tx, ty, tz, animate);
}

/**
 * Fly to a tour station: `TOUR.flightSeconds` on the signature ease, from
 * wherever the camera is — a step taken mid-flight simply starts a new flight
 * from the current pose. The tween is the rig's own rather than the controls'
 * damping, because the brief asks for a duration and a curve, and SmoothDamp
 * has neither. `animate` false (reduced motion, a CPU rasteriser) cuts.
 * Returns whether a flight was started; when the camera already stands on the
 * pose (the tour opened from the front preset) there is nothing to fly and
 * the station counts as reached at once.
 */
function flyTo(
  c: CameraControlsImpl,
  station: number,
  pose: TourStation,
  animate: boolean,
  flight: { current: Flight | null },
): boolean {
  const [px, py, pz, tx, ty, tz] = fitPose(c, pose);
  const f = flight.current ?? {
    fromEye: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toEye: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    station,
    t: 0,
  };
  c.getPosition(f.fromEye);
  c.getTarget(f.fromTarget);
  f.toEye.set(px, py, pz);
  f.toTarget.set(tx, ty, tz);
  const there =
    f.fromEye.distanceTo(f.toEye) < ALREADY_THERE && f.fromTarget.distanceTo(f.toTarget) < ALREADY_THERE;
  if (!animate || there) {
    flight.current = null;
    void c.setLookAt(px, py, pz, tx, ty, tz, false);
    return false;
  }
  f.station = station;
  f.t = 0;
  flight.current = f;
  return true;
}

/**
 * The camera: four presets, a damped orbit that goes right round the wall, a
 * keyboard walk, the tour's flights, and — once the room has been left alone
 * for a while — a drift of a few degrees so the wall keeps catching the light
 * instead of freezing into a screenshot.
 *
 * The drift never fights the visitor: any input stamps the bus, which drops it
 * and restarts the idle count, a held walk key holds the count at zero, and
 * the tour holds it there for as long as it runs. Under reduced motion there
 * is no drift at all, the presets and the stations cut rather than fly, and
 * the walk moves without a damping tail.
 *
 * The rig also places the tour's entry label: a DOM button that stands at a
 * point in the room, projected every frame and written through the bus.
 */
export function CameraRig({
  preset,
  presetNonce,
  tour,
  reduced,
  bus,
}: {
  preset: number;
  presetNonce: number;
  /** the tour station in view, or null when the tour is closed */
  tour: number | null;
  reduced: boolean;
  bus: WallBus;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const ref = useRef<CameraControlsImpl | null>(null);
  // read inside the framing effects, never a dependency of them: an OS "reduce
  // motion" flip must not yank a visitor back to the pose they orbited away from
  const reducedRef = useRef(reduced);
  const idle = useRef(0);
  const drifting = useRef(false);
  const driftT = useRef(0);
  const driftAz = useRef(0);
  const driftPolar = useRef(0);
  const seenWake = useRef(0);
  const flight = useRef<Flight | null>(null);

  // The instance is configured and framed the moment it exists, so the first
  // painted frame is already the front preset — no flight in from three's default.
  const attach = useCallback((c: CameraControlsImpl | null) => {
    ref.current = c;
    if (!c) return;
    configureControls(c);
    applyPreset(c, PRESETS[0], false);
  }, []);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // Keyed on the nonce as well as the index, so choosing the view you are
  // already on re-frames the room. `invalidate` is what makes that land on the
  // demand frameloop, where no frame runs on its own. The mount is skipped on
  // the nonce itself rather than a "first run" flag: StrictMode runs the
  // effect twice at mount, and a flag consumed by the first run let the
  // second one fly the camera to the pose it was already standing on.
  useEffect(() => {
    if (presetNonce === 0) return; // `attach` already framed PRESETS[0]
    const c = ref.current;
    if (!c) return;
    idle.current = 0;
    drifting.current = false;
    flight.current = null; // a preset chosen mid-flight takes over
    applyPreset(c, PRESETS[preset], !reducedRef.current);
    invalidate();
  }, [preset, presetNonce, invalidate]);

  // The tour: a station flies the camera there; closing it hands the wheel
  // and the finger back to the controls and leaves the camera where it is.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    setTouring(c, tour !== null);
    if (tour === null) {
      flight.current = null;
      return;
    }
    idle.current = 0;
    drifting.current = false;
    if (!flyTo(c, tour, TOUR.stations[tour], !reducedRef.current, flight)) bus.settle(tour);
    invalidate();
  }, [tour, invalidate, bus]);

  const wake = useCallback(() => bus.wake(), [bus]);

  useFrame((state, delta) => {
    const c = ref.current;
    if (!c) return;
    bus.setDistance(c.distance);
    const dt = Math.min(delta, 0.1);
    const touring = tour !== null;

    // a flight to a station: the rig's own tween, written to the controls
    // without a transition so their damping adds no lag on top of the curve
    const f = flight.current;
    if (f) {
      f.t = Math.min(1, f.t + dt / TOUR.flightSeconds);
      const k = fieldEase(f.t);
      eye.lerpVectors(f.fromEye, f.toEye, k);
      target.lerpVectors(f.fromTarget, f.toTarget, k);
      void c.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, false);
      if (f.t >= 1) {
        flight.current = null;
        bus.settle(f.station);
      }
      invalidate();
    }

    // the walk: held keys, applied through the controls' own damping so a
    // release glides to a stop instead of cutting
    const walk = bus.walk();
    const walking = walk.orbit !== 0 || walk.dolly !== 0;
    if (walking) {
      if (walk.orbit !== 0) void c.rotate(walk.orbit * CAMERA.walkDegrees * DEG * dt, 0, !reduced);
      if (walk.dolly !== 0) void c.dolly(walk.dolly * CAMERA.walkRate * dt * c.distance, !reduced);
      idle.current = 0;
      drifting.current = false;
      invalidate(); // on the demand loop, the next step needs a frame of its own
    }

    clampPolarToFloor(c, !reduced);

    // The tour's label, a DOM element standing at a point in the room. The
    // camera's matrices are refreshed first: the controls moved it this frame
    // and a cut on the demand loop gets no second frame to catch up in.
    c.getPosition(eye);
    let visible = !touring && WALL_BOX.distanceToPoint(eye) >= TOUR.labelHideWithin;
    if (state.size.width <= TOUR.labelDockBelowPx) {
      // a phone: the point beside the wall is off-screen at the framed
      // presets, so the label docks under the wall (wall.css) instead
      bus.dockLabel(visible);
    } else {
      const camera = state.camera;
      if (visible) {
        // hidden when the wall itself is in the line of sight
        sight.origin.copy(eye);
        sight.direction.subVectors(LABEL_POINT, eye).normalize();
        const blocked = sight.intersectBox(WALL_BOX, hit);
        if (blocked && hit.distanceToSquared(eye) < LABEL_POINT.distanceToSquared(eye)) visible = false;
      }
      if (visible) {
        camera.updateMatrixWorld();
        ndc.copy(LABEL_POINT).project(camera);
        if (ndc.z > 1) visible = false; // behind the camera
      }
      bus.placeLabel(
        ((ndc.x + 1) / 2) * state.size.width,
        ((1 - ndc.y) / 2) * state.size.height,
        visible,
      );
    }

    if (reduced) return;

    const wokeAt = bus.lastWake();
    if (wokeAt !== seenWake.current) {
      seenWake.current = wokeAt;
      idle.current = 0;
      drifting.current = false;
    }
    if (walking || touring) return; // no drift under a hand, none on a station

    idle.current += dt;
    if (idle.current < CAMERA.idleSeconds) return;

    if (!drifting.current) {
      drifting.current = true;
      driftT.current = 0;
      driftAz.current = c.azimuthAngle;
      driftPolar.current = c.polarAngle;
    }
    driftT.current += dt;
    const t = driftT.current;
    // eased in, so the drift starts from stillness rather than stepping into it
    const amp = Math.min(1, t / CAMERA.driftEase) * CAMERA.driftDegrees * DEG;
    const az = driftAz.current + amp * Math.sin((2 * Math.PI * t) / CAMERA.driftPeriod);
    const polar =
      driftPolar.current +
      amp * CAMERA.driftPolarRatio * Math.sin((2 * Math.PI * t) / CAMERA.driftPolarPeriod);
    // no transition: the sine is already the smoothing, and the damping would
    // only add a lag that makes the two periods beat against each other
    void c.rotateTo(az, polar, false);
  });

  return <CameraControls ref={attach} makeDefault onControlStart={wake} onControl={wake} />;
}
