import React, { useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { VortexCard } from './VortexCard.jsx';
import { getClampedSize } from '../utils/cardUtils.js';

// ── Single floating card with bob and label ──────────────────────
function FloatingCard({ imageData, finalPosition, rotation, index, isSelected }) {
  const groupRef   = useRef();
  const matRef     = useRef();
  const flyInDone  = useRef(false);
  const timeRef    = useRef(0);
  const { gallery } = SCENE_CONFIG;
  const { camera, size } = useThree();

  const { width: cardWidth, height: cardHeight } = getClampedSize(
    imageData.w / imageData.h, 
    SCENE_CONFIG.cards.baseWidth * 1.15, 
    SCENE_CONFIG.cards
  );

  // Stable random bob params per card
  const bob = useMemo(() => ({
    speed:     0.28 + Math.random() * 0.25,
    offset:    Math.random() * Math.PI * 2,
    amplitude: 0.08 + Math.random() * 0.06,
  }), []);

  // HUD anchor state
  const hudAnchor = useRef({ 
    active: false, 
    progress: 0, 
    startPos: new THREE.Vector3(), 
    startQuat: new THREE.Quaternion() 
  });

  // ── Set start position (underground) ────────────────────────
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(finalPosition[0], gallery.elevationStart, finalPosition[2]);
    groupRef.current.scale.set(0.8, 0.8, 0.8);
    flyInDone.current = false;
  }, [finalPosition, gallery.elevationStart]);

  // ── Elevation and Resolution animations ──────────────────────
  useEffect(() => {
    if (!groupRef.current) return;

    const delay = gallery.staggerDelay * index + 0.1;
    const tweens = [];

    tweens.push(
      gsap.to(groupRef.current.position, {
        x: finalPosition[0],
        y: finalPosition[1],
        z: finalPosition[2],
        duration: gallery.elevationDuration,
        delay,
        ease: 'power3.out',
        onComplete: () => { 
          flyInDone.current = true; 

          // Wait 1.2s -> Non-selected fly left, selected anchors HUD
          const resolveTween = gsap.delayedCall(1.2, () => {
            if (!groupRef.current) return;
            flyInDone.current = false; // Stop bobbing

            if (isSelected) {
              hudAnchor.current.startPos.copy(groupRef.current.position);
              hudAnchor.current.startQuat.copy(groupRef.current.quaternion);
              hudAnchor.current.active = true;

              gsap.to(hudAnchor.current, {
                progress: 1,
                duration: 0.8,
                ease: 'power3.inOut'
              });
              gsap.to(groupRef.current.scale, {
                x: 1.3, y: 1.3, z: 1.3, // Make HUD card a nice size
                duration: 0.8,
                ease: 'power3.inOut'
              });
            } else {
              // Unselected cards fly left and disappear
              gsap.to(groupRef.current.position, {
                x: groupRef.current.position.x - 20,
                duration: 0.7,
                ease: 'power3.in'
              });
              gsap.to(groupRef.current.rotation, {
                z: groupRef.current.rotation.z - 0.5,
                y: groupRef.current.rotation.y + 1,
                duration: 0.7,
                ease: 'power3.in'
              });
              if (matRef.current) {
                gsap.to(matRef.current, {
                  opacity: 0,
                  duration: 0.5,
                  delay: 0.2,
                  ease: 'power2.in'
                });
              }
            }
          });
          tweens.push(resolveTween);
        },
      }),
      gsap.to(groupRef.current.scale, {
        x: 1, y: 1, z: 1,
        duration: gallery.elevationDuration,
        delay,
        ease: 'back.out(1.2)',
      })
    );

    if (matRef.current) {
      matRef.current.opacity = 0;
      tweens.push(
        gsap.to(matRef.current, {
          opacity: 1,
          duration: 0.8,
          delay: delay + 0.1,
          ease: 'power2.out',
        })
      );
    }

    return () => tweens.forEach(t => t.kill());
  }, [finalPosition, isSelected, index, gallery, camera, size, cardWidth, cardHeight]);

  // ── Animations Update Frame ────────────────────────────────
  useFrame((state) => {
    if (!groupRef.current) return;

    if (hudAnchor.current.active && isSelected) {
      // Continuously calculate the top-left HUD position relative to camera
      const dist = 12; // Focus distance
      const fovRad = (camera.fov * Math.PI) / 180;
      const height = 2 * dist * Math.tan(fovRad / 2);
      const aspect = size.width / Math.max(size.height, 1);
      const width = height * aspect;

      // Position top-left with padding
      const padX = cardWidth * 1.3 * 0.5 + 1.0; 
      const padY = cardHeight * 1.3 * 0.5 + 1.0;
      const offset = new THREE.Vector3(-width / 2 + padX, height / 2 - padY, -dist);
      
      // Rotate offset by camera rotation and add camera position
      offset.applyQuaternion(camera.quaternion);
      const targetPos = camera.position.clone().add(offset);
      const targetQuat = camera.quaternion; // Flat to screen

      // Lerp/slerp from start position to the dynamic HUD target to handle the transition smoothly
      groupRef.current.position.copy(hudAnchor.current.startPos).lerp(targetPos, hudAnchor.current.progress);
      groupRef.current.quaternion.copy(hudAnchor.current.startQuat).slerp(targetQuat, hudAnchor.current.progress);
      return; // Skip bobbing
    }

    // Bobbing for non-HUD state
    if (flyInDone.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y =
        finalPosition[1] + Math.sin(t * bob.speed + bob.offset) * (bob.amplitude * 0.7);
    }
  });

  return (
    <group ref={groupRef} position={finalPosition} rotation={rotation}>
      <VortexCard
        imageData={imageData}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        ringRadius={10}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        phase="gallery"
        materialRef={matRef}
      />

      {/* Simplified Side Label (keep it clean) */}
      <Html
        center
        position={[cardWidth / 2 + 0.4, 0, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        zIndexRange={[100, 200]}
      >
        <div style={{
          color:          'rgba(255,255,255,0.7)',
          fontSize:       '8px',
          fontFamily:     "'Inter', sans-serif",
          fontWeight:     600,
          letterSpacing:  '0.1em',
          textTransform:  'uppercase',
          background:     'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(5px)',
          padding:        '3px 8px',
          borderRadius:   '2px',
          borderLeft:     '1px solid rgba(255,255,255,0.2)',
          whiteSpace:     'nowrap',
        }}>
          {`IMG #${index + 1}`}
        </div>
      </Html>
    </group>
  );
}

// ── Frustum half-extents at a world-Z plane ───────────────────────
function frustumHalfExtents(camZ, fovDeg, aspect, planeZ) {
  const dist  = Math.abs(camZ - planeZ);
  const halfH = dist * Math.tan((fovDeg * Math.PI) / 360); // fov/2 in radians
  return { halfW: halfH * aspect, halfH };
}

// ── Deterministic grid fallback ───────────────────────────────────
function gridSlots(count, safeHW, safeHH) {
  const aspectRatio = safeHW / Math.max(safeHH, 0.001);
  const cols        = Math.max(1, Math.ceil(Math.sqrt(count * aspectRatio)));
  const rows        = Math.ceil(count / cols);
  const slots       = [];

  for (let r = 0; r < rows; r++) {
    const firstIdx = r * cols;
    const rowCount = Math.min(cols, count - firstIdx);
    const y        = rows > 1 ? safeHH - (r / (rows - 1)) * safeHH * 2 : 0;
    // Center incomplete last row within the safe width
    const rowHW    = rowCount > 1 ? safeHW * rowCount / cols : 0;

    for (let c = 0; c < rowCount; c++) {
      const idx = firstIdx + c;
      const x   = rowCount > 1 ? -rowHW + (c / (rowCount - 1)) * rowHW * 2 : 0;
      const z   = ((idx % 3) - 1) * 0.35;
      slots.push([x, y, z]);
    }
  }

  return slots;
}

// ── Slot Generator: random with deterministic grid fallback ────────
function generateSlots(count, aspect) {
  const { camera, gallery, cards } = SCENE_CONFIG;

  // Compute visible world-space area at Z=0 for the gallery camera
  const { halfW, halfH } = frustumHalfExtents(
    gallery.cameraPosition[2], camera.fov, aspect, 0
  );

  // Rotated card footprint using average dimensions and max Z-rotation
  const scale  = 1.15;   // FloatingCard renders at baseWidth * 1.15
  const avgW   = ((cards.minWidth  + cards.maxWidth)  / 2) * scale;
  const avgH   = ((cards.minHeight + cards.maxHeight) / 2) * scale;
  const maxRot = 0.25;   // max |rotZ| used when building layouts
  const sinR   = Math.abs(Math.sin(maxRot));
  const cosR   = Math.abs(Math.cos(maxRot));
  const footW  = avgW * cosR + avgH * sinR;
  const footH  = avgW * sinR + avgH * cosR;

  // Safe center region: every card stays fully within the frustum
  const INSET  = 0.05;   // additional 5% margin from screen edges
  const safeHW = Math.max(0.1, halfW * (1 - INSET) - footW / 2);
  const safeHH = Math.max(0.1, halfH * (1 - INSET) - footH / 2);

  // Minimum center-to-center gap (footprint diagonal × 0.6 avoids visual overlap
  // for cards at any relative angle without being overly conservative)
  const minDist = Math.sqrt(footW * footW + footH * footH) * 0.6;
  const minDistSq = minDist * minDist;

  const MAX_ATTEMPTS = 300;
  const placed = [];

  for (let i = 0; i < count; i++) {
    let found = false;

    for (let a = 0; a < MAX_ATTEMPTS; a++) {
      const x  = (Math.random() - 0.5) * 2 * safeHW;
      const y  = (Math.random() - 0.5) * 2 * safeHH;
      const z  = (Math.random() - 0.5) * 1.5;
      const ok = placed.every(s => {
        const dx = x - s[0], dy = y - s[1];
        return dx * dx + dy * dy >= minDistSq;
      });

      if (ok) {
        placed.push([x, y, z]);
        found = true;
        break;
      }
    }

    if (!found) {
      // Random placement exhausted — switch to guaranteed grid for all cards
      return gridSlots(count, safeHW, safeHH);
    }
  }

  return placed;
}

// ── GalleryScene ─────────────────────────────────────────────────
export function GalleryScene({ phase, backgroundImage, floatingImages }) {
  const { gallery } = SCENE_CONFIG;
  const { size }    = useThree();
  const safeImages  = floatingImages ?? [];
  const cardCount   = safeImages.length || 8;

  // Recompute layout when card count or canvas aspect ratio changes
  const layouts = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const slots  = generateSlots(cardCount, aspect);

    return slots.map((pos) => ({
      position: pos,
      rotation: [
        (Math.random() - 0.5) * 0.35,  // tilt X
        (Math.random() - 0.5) * 0.50,  // tilt Y
        (Math.random() - 0.5) * 0.25,  // tilt Z
      ],
    }));
  }, [cardCount, size.width, size.height]);

  const isVisible = phase === 'gallery' || phase === 'enteringGallery';
  if (!isVisible || safeImages.length === 0) return null;

  return (
    <group name="GalleryScene">
      {phase === 'gallery' && safeImages.map((img, i) => (
        <FloatingCard
          key={img.id || `gfloat-${i}`}
          imageData={img}
          finalPosition={layouts[i % layouts.length]?.position || [0,0,0]}
          rotation={layouts[i % layouts.length]?.rotation || [0,0,0]}
          index={i}
          isSelected={img.id === backgroundImage?.id}
        />
      ))}
    </group>
  );
}
