import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { buildCurvedCardGeometry, calculateBendStrength } from '../utils/curvedCardGeometry.js';
import { useReducedMotion } from '../utils/reducedMotion.js';

// three calls `object.raycast(raycaster, intersects)` unconditionally — it never
// checks `object.visible`, so a hidden card keeps swallowing pointer events. A
// no-op raycast is the way to actually take a mesh out of hit-testing (and it
// must be a function: `raycast={null}` would throw inside the raycaster).
const NO_RAYCAST = () => null;

// Inline cursor override on the canvas — '' clears it, so the wrapper's
// `.vortex-immersive { cursor: auto }` shows through again.
const setCanvasCursor = (canvas, value) => {
  canvas.style.cursor = value;
};

/**
 * VortexCard — renders one image card.
 * Supports phase-aware interactions: hover only in "idle", click triggers selection.
 * Material is transparent to allow animated fade out.
 *
 * `interactive` is owned by the parent, which is the only one that knows whether
 * this card's group is on screen right now: the vortex rings are interactive in
 * 'idle', the carousel ring in 'carousel'. `phase` alone can't answer that — a
 * vortex card is still passed phase='carousel' while its whole group is hidden.
 */
export function VortexCard({
  imageData,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  ringRadius,
  cardWidth,
  cardHeight,
  phase,
  interactive = false,
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
    // Mipmaps back on. The cards are minified 3-5x for most of the vortex, and
    // sampling a full-res texture at that ratio is what produced the shimmer on
    // rotation as well as a cache-thrashing read pattern. The +33% memory this
    // costs is paid for several times over by the sources now being capped at
    // 640px (see data/images.js) — 99MB of texels down to ~44MB with mipmaps.
    // three clamps anisotropy to the hardware maximum.
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    texture.generateMipmaps = true;
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

  // Hand-built geometry isn't owned by any loader cache, so nothing else will
  // free its VBOs. Same pattern as Aura.tsx.
  useEffect(() => () => geometry.dispose(), [geometry]);

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
  const reduceMotion = useReducedMotion();

  // Hover cursor goes on the canvas itself, NOT document.body: `.vortex-immersive
  // { cursor: auto }` is an ancestor with its own specified value, so the canvas
  // inherits `auto` from it and never sees an inline override set on <body>.
  const { gl } = useThree();

  useFrame((_, delta) => {
    if (!animGroupRefUsed.current || !floating.enabled || reduceMotion) return;
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
      setCanvasCursor(gl.domElement, '');
    };
  }, [gl]);

  const handlePointerOver = useCallback((e) => {
    // Touch fires pointerover with no matching pointerout → cards would stick at
    // hover scale. Skip hover entirely for touch; the click still fires.
    if (e.pointerType === 'touch') return;
    // Hover feedback only on clickable cards, matching handleClick.
    if (!interactive) return;

    e.stopPropagation();
    setCanvasCursor(gl.domElement, 'pointer');
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
  }, [interactive, hover, gl]);

  // Never phase-gated: this must ALWAYS be able to undo a hover.
  const resetHover = useCallback(() => {
    setCanvasCursor(gl.domElement, '');
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
  }, [hover, gl]);

  const handlePointerOut = useCallback(() => resetHover(), [resetHover]);

  // Losing interactivity mid-hover means the mesh stops hit-testing, so no
  // pointerout will ever arrive — without this the card stays lifted and the
  // cursor stays a pointer for the rest of the session.
  useEffect(() => {
    if (interactive) return;
    resetHover();
  }, [interactive, resetHover]);

  const handleClick = (e) => {
    if (!interactive || !onCardClick) return;
    e.stopPropagation();
    onCardClick();
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
            raycast={interactive ? THREE.Mesh.prototype.raycast : NO_RAYCAST}
            geometry={geometry}
          >
            <meshStandardMaterial
              ref={materialRef}
              map={texture}
              roughness={SCENE_CONFIG.cards.material.roughness}
              metalness={SCENE_CONFIG.cards.material.metalness}
              envMapIntensity={SCENE_CONFIG.cards.material.envMapIntensity}
              emissiveIntensity={SCENE_CONFIG.cards.material.emissiveIntensity}
              emissive="#ffffff"
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
