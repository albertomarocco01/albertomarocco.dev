import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { CAMERA, PRESETS, type CameraPreset } from "../wall.config";
import type { WallBus } from "./wall-bus";

const DEG = Math.PI / 180;
const ACTION = CameraControlsImpl.ACTION;

/**
 * Limits and input map. A module-scope helper so nothing writes to a hook's or
 * a prop's fields from inside a component (the React compiler rules), and so
 * the whole input contract of the piece reads in one block.
 *
 * Orbit and dolly only — no truck. The three presets are compositions; letting
 * the wall slide off-centre would turn a rendering into a viewer.
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
  c.mouseButtons.wheel = ACTION.DOLLY;
  c.touches.one = ACTION.TOUCH_ROTATE;
  c.touches.two = ACTION.TOUCH_DOLLY;
  c.touches.three = ACTION.NONE;
}

/**
 * Frame a preset. The two wide views are pushed back on a narrower viewport —
 * a 6 m wall does not fit a phone held upright at 7 m — by stretching the
 * camera's offset from its target, which keeps the angle and only changes the
 * distance. `camera.aspect` is read off the instance rather than through React,
 * so a resize never yanks a visitor who has orbited away from a preset.
 */
function applyPreset(c: CameraControlsImpl, preset: CameraPreset, animate: boolean): void {
  const camera = c.camera;
  const aspect = "aspect" in camera ? camera.aspect : CAMERA.fitAspect;
  const [px, py, pz] = preset.position;
  const [tx, ty, tz] = preset.target;
  const base = Math.hypot(px - tx, py - ty, pz - tz);
  // …but never past the dolly limit. On a phone held upright the whole wall
  // simply cannot fit a 45° frame from anywhere in the room, and a camera 24 m
  // back to make it fit would leave the wall a chip in a field of black. At the
  // limit it fills the width with its outer edges just cropped, which is the
  // better of the two portraits.
  const fit = preset.fit
    ? Math.min(Math.max(1, CAMERA.fitAspect / aspect), CAMERA.maxDistance / base)
    : 1;
  void c.setLookAt(
    tx + (px - tx) * fit,
    ty + (py - ty) * fit,
    tz + (pz - tz) * fit,
    tx,
    ty,
    tz,
    animate,
  );
}

/**
 * The camera: three presets, a damped orbit inside architectural limits, and —
 * once the room has been left alone for a while — a drift of a few degrees so
 * the wall keeps catching the light instead of freezing into a screenshot.
 *
 * The drift never fights the visitor: any input stamps the bus, which drops it
 * and restarts the idle count. Under reduced motion there is no drift at all
 * and the presets cut rather than fly.
 */
export function CameraRig({
  preset,
  presetNonce,
  reduced,
  bus,
}: {
  preset: number;
  presetNonce: number;
  reduced: boolean;
  bus: WallBus;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const ref = useRef<CameraControlsImpl | null>(null);
  const first = useRef(true);
  // read inside the framing effect, never a dependency of it: an OS "reduce
  // motion" flip must not yank a visitor back to the preset they orbited away from
  const reducedRef = useRef(reduced);
  const idle = useRef(0);
  const drifting = useRef(false);
  const driftT = useRef(0);
  const driftAz = useRef(0);
  const driftPolar = useRef(0);
  const seenWake = useRef(0);

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
  // demand frameloop, where no frame runs on its own.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return; // `attach` already framed PRESETS[0]
    }
    const c = ref.current;
    if (!c) return;
    idle.current = 0;
    drifting.current = false;
    applyPreset(c, PRESETS[preset], !reducedRef.current);
    invalidate();
  }, [preset, presetNonce, invalidate]);

  const wake = useCallback(() => bus.wake(), [bus]);

  useFrame((state, delta) => {
    const c = ref.current;
    if (!c) return;
    bus.setDistance(c.distance);
    if (reduced) return;

    const wokeAt = bus.lastWake();
    if (wokeAt !== seenWake.current) {
      seenWake.current = wokeAt;
      idle.current = 0;
      drifting.current = false;
    }

    const dt = Math.min(delta, 0.1);
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
