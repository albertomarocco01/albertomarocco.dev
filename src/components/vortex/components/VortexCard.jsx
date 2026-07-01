import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { buildCurvedCardGeometry, calculateBendStrength } from '../utils/curvedCardGeometry.js';

/**
 * VortexCard — renders one image card.
 * Supports phase-aware interactions: hover only in "idle", click triggers selection.
 * Material is transparent to allow animated fade out.
 */
export function VortexCard({
  imageData,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  ringRadius,
  cardWidth,
  cardHeight,
  phase,
  onCardClick,
  // Refs exposed to parent for animation control
  outerGroupRef,    // Controls world position/rotation
  animGroupRef,     // Controls floating offset
  meshRef: externalMeshRef,
  materialRef: externalMaterialRef,
}) {
  const internalMeshRef = useRef();
  const internalMaterialRef = useRef();
  const internalAnimGroupRef = useRef();

  const meshRef = externalMeshRef || internalMeshRef;
  const materialRef = externalMaterialRef || internalMaterialRef;
  const animGroupRefUsed = animGroupRef || internalAnimGroupRef;

  // ── Load image texture ─────────────────────────────────────────
  const texture = useLoader(THREE.TextureLoader, imageData.url);
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }, [texture]);

  // ── Curved geometry ────────────────────────────────────────────
  const geometry = useMemo(() => {
    const { curvatureAngle, curvatureSegments } = SCENE_CONFIG.cards;
    const bendStrength = calculateBendStrength(curvatureAngle, cardWidth, ringRadius);

    const { positions, normals, uvs, indices } = buildCurvedCardGeometry({
      width: cardWidth,
      height: cardHeight,
      ringRadius,
      bendStrength,
      widthSegments: curvatureSegments,
      heightSegments: 1,
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(
      indices instanceof Uint32Array
        ? new THREE.Uint32BufferAttribute(indices, 1)
        : new THREE.Uint16BufferAttribute(indices, 1)
    );
    geo.computeBoundingSphere();
    return geo;
  }, [ringRadius, cardWidth, cardHeight]);

  // ── Modulo Jitter (Floating Continuo) ───────────────────────────
  const { floating } = SCENE_CONFIG.cards;

  const idleParams = useMemo(() => ({
    phaseY: Math.random() * Math.PI * 2,
    phaseZ: Math.random() * Math.PI * 2,
    freqY: floating.frequencyY.min + Math.random() * (floating.frequencyY.max - floating.frequencyY.min),
    freqZ: floating.frequencyZ.min + Math.random() * (floating.frequencyZ.max - floating.frequencyZ.min),
  }), []);

  const localTimeRef = useRef(0);
  const hoverGroupRef = useRef();

  useFrame((_, delta) => {
    if (!animGroupRefUsed.current || !floating.enabled) return;
    // Solo floating attivo durante idle
    if (phase !== 'idle') return;

    localTimeRef.current += delta;
    const t = localTimeRef.current;

    animGroupRefUsed.current.position.y =
      Math.sin(t * idleParams.freqY + idleParams.phaseY) * floating.amplitudeY;
    animGroupRefUsed.current.position.z =
      Math.sin(t * idleParams.freqZ + idleParams.phaseZ) * floating.amplitudeZ;
  });

  // ── Hover ──────────────────────────────────────────────────────
  const { hover } = SCENE_CONFIG.cards;

  // ── Cursor Cleanup ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  const handlePointerOver = useCallback((e) => {
    if (phase !== 'idle' && phase !== 'gallery') return;
    
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (!hoverGroupRef.current) return;
    
    gsap.killTweensOf(hoverGroupRef.current.scale);
    gsap.killTweensOf(hoverGroupRef.current.position);
    
    gsap.to(hoverGroupRef.current.scale, {
      x: hover.scaleMultiplier, 
      y: hover.scaleMultiplier, 
      z: hover.scaleMultiplier,
      duration: hover.duration, 
      ease: hover.ease,
    });
    gsap.to(hoverGroupRef.current.position, {
      z: hover.liftZ, 
      duration: hover.duration, 
      ease: hover.ease,
    });
  }, [phase, hover]);

  const handlePointerOut = useCallback((e) => {
    // We don't check phase here to ensure we ALWAYS clean up if we leave
    document.body.style.cursor = 'auto';
    if (!hoverGroupRef.current) return;
    
    gsap.killTweensOf(hoverGroupRef.current.scale);
    gsap.killTweensOf(hoverGroupRef.current.position);
    
    gsap.to(hoverGroupRef.current.scale, {
      x: 1, y: 1, z: 1, 
      duration: hover.duration, 
      ease: hover.ease,
    });
    gsap.to(hoverGroupRef.current.position, {
      z: 0, 
      duration: hover.duration, 
      ease: hover.ease,
    });
  }, [hover]);

  // Only bind click if NOT in gallery phase
  const handleClick = (e) => {
    if (phase === 'gallery') return; 
    if (onCardClick) {
      e.stopPropagation();
      onCardClick();
    }
  };

  return (
    <group 
      ref={outerGroupRef} 
      position={position} 
      rotation={rotation}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group ref={animGroupRefUsed}>
        <group ref={hoverGroupRef}>
          <mesh
            ref={meshRef}
            onClick={handleClick}
            geometry={geometry}
          >
            <meshStandardMaterial
              ref={materialRef}
              map={texture}
              roughness={SCENE_CONFIG.cards.material.roughness}
              metalness={SCENE_CONFIG.cards.material.metalness}
              envMapIntensity={SCENE_CONFIG.cards.material.envMapIntensity}
              emissiveIntensity={SCENE_CONFIG.cards.material.emissiveIntensity}
              emissive={new THREE.Color('#ffffff')}
              side={THREE.DoubleSide}
              transparent={true}
              opacity={1}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
