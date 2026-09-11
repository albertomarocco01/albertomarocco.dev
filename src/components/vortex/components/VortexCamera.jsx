import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { useReducedMotion } from '../utils/reducedMotion.js';

/**
 * VortexCamera — controls camera position, breathing animation, and phase-based transitions.
 * In "carousel" phase, camera smoothly animates to the carousel position defined in config.
 */
export function VortexCamera({ phase }) {
  const { camera } = useThree();
  const reduceMotion = useReducedMotion();

  const baseTarget = useMemo(() => new THREE.Vector3(...SCENE_CONFIG.camera.target), []);
  const basePosition = useMemo(() => new THREE.Vector3(...SCENE_CONFIG.camera.position), []);

  // Track the active target for phase transitions
  const currentTarget = useRef(new THREE.Vector3(...SCENE_CONFIG.camera.target));
  const currentRollAngle = useRef(SCENE_CONFIG.camera.rollAngle || 0);
  const breathingOn = useRef(false);
  const mounted = useRef(true);

  // Start the slow idle "breathing" drift — 3 infinite yoyo tweens on the camera
  // position. Guarded (breathingOn) so it can never stack a second set over a
  // live one. (Replaces the old gsap.context() whose revert() was never called.)
  const startBreathing = useCallback(() => {
    const { breathing } = SCENE_CONFIG.camera;
    if (!breathing.enabled || reduceMotion || breathingOn.current) return;
    breathingOn.current = true;
    gsap.to(camera.position, { x: basePosition.x + breathing.xAmplitude, duration: 1 / (breathing.xSpeed * 2), ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(camera.position, { y: basePosition.y + breathing.yAmplitude, duration: 1 / (breathing.ySpeed * 2), ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(camera.position, { z: basePosition.z + breathing.zAmplitude, duration: 1 / (breathing.zSpeed * 2), ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }, [camera, basePosition, reduceMotion]);

  // Kill every tween touching the camera position (breathing + transitions alike).
  const stopBreathing = useCallback(() => {
    breathingOn.current = false;
    gsap.killTweensOf(camera.position);
  }, [camera]);

  // ── Mount: set camera intrinsics + base position, then breathe ──
  useEffect(() => {
    mounted.current = true;
    const target = currentTarget.current;
    const { fov, near, far } = SCENE_CONFIG.camera;
    Object.assign(camera, { fov, near, far });
    camera.position.copy(basePosition);
    camera.lookAt(baseTarget);
    camera.updateProjectionMatrix();
    startBreathing();

    return () => {
      // Kill EVERYTHING this component ever tweened. Without this, exiting the
      // route during the ~2s return-to-idle window leaves the in-flight tween
      // alive — its onComplete then spawns infinite breathing tweens on a
      // detached camera (permanent GSAP ticker work + a retained camera).
      mounted.current = false;
      breathingOn.current = false;
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(target);
      gsap.killTweensOf(currentRollAngle);
    };
  }, [camera, basePosition, baseTarget, startBreathing]);

  // ── Phase-based camera transitions ──
  const initialPhase = useRef(true);
  useEffect(() => {
    // Skip the first run for the initial 'idle' phase: the mount effect already
    // placed the camera at base and started breathing. Re-running the idle branch
    // here would tween position onto itself for ~2s and double-start breathing
    // (6 concurrent infinite tweens fighting until the first selection).
    if (initialPhase.current) {
      initialPhase.current = false;
      if (phase === 'idle') return;
    }

    // Reduce motion collapses every camera move to a cut. Not skipped: the
    // return tween's onComplete is what restarts the idle breathing.
    const dur = (cfg) =>
      reduceMotion ? 0.01 : cfg.cameraDuration || SCENE_CONFIG.carousel.cameraDuration;
    const easeOf = (cfg) => cfg.cameraEase || SCENE_CONFIG.carousel.cameraEase;

    if (phase === 'selecting' || phase === 'carousel' || phase === 'gallery') {
      // Stop breathing (and kill any in-flight transition) so the new move
      // starts cleanly from the current position — no snapping back.
      stopBreathing();
      const cfg = phase === 'gallery' ? SCENE_CONFIG.gallery : SCENE_CONFIG.carousel;
      gsap.to(camera.position, { x: cfg.cameraPosition[0], y: cfg.cameraPosition[1], z: cfg.cameraPosition[2], duration: dur(cfg), ease: easeOf(cfg) });
      gsap.to(currentTarget.current, { x: cfg.cameraTarget[0], y: cfg.cameraTarget[1], z: cfg.cameraTarget[2], duration: dur(cfg), ease: easeOf(cfg) });
      gsap.to(currentRollAngle, { current: cfg.cameraRollAngle || 0, duration: dur(cfg), ease: easeOf(cfg) });
    } else if (phase === 'returning' || phase === 'idle') {
      stopBreathing();
      const d = reduceMotion ? 0.01 : SCENE_CONFIG.returnToVortex?.fadeInVortex || 1.0;
      const e = SCENE_CONFIG.returnToVortex?.ease || 'power2.inOut';
      gsap.to(camera.position, {
        x: basePosition.x,
        y: basePosition.y,
        z: basePosition.z,
        duration: d,
        ease: e,
        // Guarded twice: cleanup nulls `mounted` and kills this tween before the
        // callback can fire, but keep the phase/mounted check as a belt-and-braces.
        onComplete: () => { if (mounted.current && phase === 'idle') startBreathing(); },
      });
      gsap.to(currentTarget.current, { x: baseTarget.x, y: baseTarget.y, z: baseTarget.z, duration: d, ease: e });
      gsap.to(currentRollAngle, { current: SCENE_CONFIG.camera.rollAngle || 0, duration: d, ease: e });
    }
  }, [phase, camera, basePosition, baseTarget, startBreathing, stopBreathing, reduceMotion]);

  // Continuous lookAt with rolling
  useFrame(() => {
    camera.lookAt(currentTarget.current);
    if (currentRollAngle.current) {
      camera.rotateZ(currentRollAngle.current * (Math.PI / 180));
    }
  });

  return null;
}
