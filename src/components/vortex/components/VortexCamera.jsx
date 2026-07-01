import React, { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { SCENE_CONFIG } from '../config/scene.config.js';

/**
 * VortexCamera — controls camera position, breathing animation, and phase-based transitions.
 * In "carousel" phase, camera smoothly animates to the carousel position defined in config.
 */
export function VortexCamera({ phase }) {
  const { camera } = useThree();

  const baseTarget = useMemo(() => new THREE.Vector3(...SCENE_CONFIG.camera.target), []);
  const basePosition = useMemo(() => new THREE.Vector3(...SCENE_CONFIG.camera.position), []);

  // Track the active target for phase transitions
  const currentTarget = useRef(new THREE.Vector3(...SCENE_CONFIG.camera.target));
  const currentRollAngle = useRef(SCENE_CONFIG.camera.rollAngle || 0);
  const breathingCtx = useRef(null);

  useEffect(() => {
    const { fov, near, far, breathing } = SCENE_CONFIG.camera;

    camera.fov = fov;
    camera.near = near;
    camera.far = far;
    camera.position.copy(basePosition);
    camera.lookAt(baseTarget);
    camera.updateProjectionMatrix();

    // Setup GSAP breathing animation
    if (breathing.enabled) {
      breathingCtx.current = gsap.context(() => {
        gsap.to(camera.position, {
          x: basePosition.x + breathing.xAmplitude,
          duration: 1 / (breathing.xSpeed * 2),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
        gsap.to(camera.position, {
          y: basePosition.y + breathing.yAmplitude,
          duration: 1 / (breathing.ySpeed * 2),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
        gsap.to(camera.position, {
          z: basePosition.z + breathing.zAmplitude,
          duration: 1 / (breathing.zSpeed * 2),
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
      });
    }

    return () => {
      if (breathingCtx.current) gsap.killTweensOf(camera.position);
    };
  }, [camera, basePosition, baseTarget]);

  // ── Phase-based camera transitions ──
  useEffect(() => {
    const carouselCfg = SCENE_CONFIG.carousel;

    if (phase === 'selecting' || phase === 'carousel' || phase === 'gallery') {
      // Stop breathing for smooth transition without snapping back!
      if (breathingCtx.current) {
        gsap.killTweensOf(camera.position);
        breathingCtx.current = null;
      }

      const activeCfg = phase === 'gallery' ? SCENE_CONFIG.gallery : SCENE_CONFIG.carousel;

      // Animate camera to phase-specific position
      gsap.to(camera.position, {
        x: activeCfg.cameraPosition[0],
        y: activeCfg.cameraPosition[1],
        z: activeCfg.cameraPosition[2],
        duration: activeCfg.cameraDuration || SCENE_CONFIG.carousel.cameraDuration,
        ease: activeCfg.cameraEase || SCENE_CONFIG.carousel.cameraEase,
      });

      // Animate target
      gsap.to(currentTarget.current, {
        x: activeCfg.cameraTarget[0],
        y: activeCfg.cameraTarget[1],
        z: activeCfg.cameraTarget[2],
        duration: activeCfg.cameraDuration || SCENE_CONFIG.carousel.cameraDuration,
        ease: activeCfg.cameraEase || SCENE_CONFIG.carousel.cameraEase,
      });

      // Animate roll angle
      gsap.to(currentRollAngle, {
        current: activeCfg.cameraRollAngle || 0,
        duration: activeCfg.cameraDuration || SCENE_CONFIG.carousel.cameraDuration,
        ease: activeCfg.cameraEase || SCENE_CONFIG.carousel.cameraEase,
      });

    } else if (phase === 'returning' || phase === 'idle') {
      // Animate back to vortex position
      gsap.to(camera.position, {
        x: basePosition.x,
        y: basePosition.y,
        z: basePosition.z,
        duration: SCENE_CONFIG.returnToVortex?.fadeInVortex || 1.0,
        ease: SCENE_CONFIG.returnToVortex?.ease || 'power2.inOut',
        onComplete: () => {
          // Restart breathing
          const { breathing } = SCENE_CONFIG.camera;
          if (breathing.enabled && phase === 'idle') {
            breathingCtx.current = gsap.context(() => {
              gsap.to(camera.position, {
                x: basePosition.x + breathing.xAmplitude,
                duration: 1 / (breathing.xSpeed * 2),
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1
              });
              gsap.to(camera.position, {
                y: basePosition.y + breathing.yAmplitude,
                duration: 1 / (breathing.ySpeed * 2),
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1
              });
              gsap.to(camera.position, {
                z: basePosition.z + breathing.zAmplitude,
                duration: 1 / (breathing.zSpeed * 2),
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1
              });
            });
          }
        },
      });

      // Animate target back
      gsap.to(currentTarget.current, {
        x: baseTarget.x,
        y: baseTarget.y,
        z: baseTarget.z,
        duration: SCENE_CONFIG.returnToVortex?.fadeInVortex || 1.0,
        ease: SCENE_CONFIG.returnToVortex?.ease || 'power2.inOut',
      });

      // Animate roll angle back
      gsap.to(currentRollAngle, {
        current: SCENE_CONFIG.camera.rollAngle || 0,
        duration: SCENE_CONFIG.returnToVortex?.fadeInVortex || 1.0,
        ease: SCENE_CONFIG.returnToVortex?.ease || 'power2.inOut',
      });
    }
  }, [phase, camera, basePosition, baseTarget]);

  // Continuous lookAt with rolling
  useFrame(() => {
    camera.lookAt(currentTarget.current);
    if (currentRollAngle.current) {
      camera.rotateZ(currentRollAngle.current * (Math.PI / 180));
    }
  });

  return null;
}
