import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { VortexCamera } from './VortexCamera.jsx';
import { VortexLighting } from './VortexLighting.jsx';
import { VortexLayout } from './VortexLayout.jsx';
import { GalleryScene } from './GalleryScene.jsx';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useReducedMotion } from '../utils/reducedMotion.js';

export function VortexScene({
  copy,
  phase,
  selectedCardId,
  onCardSelect,
  onCarouselImageClick,
  onSelectionComplete,
  onReturnComplete,
  galleryBackground,
  galleryImages,
  carouselImages,
  setCarouselImages,
}) {
  const { postProcessing } = SCENE_CONFIG;
  const reduceMotion = useReducedMotion();
  const [contextLost, setContextLost] = useState(false);

  // Detect WebGL up front so an unsupported browser gets a message instead of a
  // silent black canvas.
  const webglSupported = useMemo(() => {
    if (typeof document === 'undefined') return true;
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      return false;
    }
  }, []);

  const FALLBACK_STYLE = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '2rem',
    background: '#000',
    color: 'rgba(255,255,255,0.72)',
    font: "600 0.78rem/1.6 'Inter', sans-serif",
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    zIndex: 3,
  };

  if (!webglSupported) {
    return (
      <div style={FALLBACK_STYLE}>
        {copy.noWebgl}
      </div>
    );
  }

  return (
    <>
    <Canvas
      // Match the site canvas (Field.tsx). Uncapped, r3f defaults to [1, 2],
      // so a 2x display rendered 4x the pixels of the heaviest scene here.
      dpr={[1, 1.5]}
      gl={{
        antialias: SCENE_CONFIG.renderer.antialias,
        toneMapping: THREE[SCENE_CONFIG.renderer.toneMapping],
        toneMappingExposure: SCENE_CONFIG.renderer.toneMappingExposure,
      }}
      camera={{
        fov: SCENE_CONFIG.camera.fov,
        near: SCENE_CONFIG.camera.near,
        far: SCENE_CONFIG.camera.far,
        position: SCENE_CONFIG.camera.position,
      }}
      style={{
        background: SCENE_CONFIG.renderer.backgroundColor,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
      onCreated={({ gl }) => {
        // Without preventDefault the browser drops the context permanently (frozen
        // black canvas); with it the GPU can restore, and we surface a message
        // meanwhile instead of leaving a dead canvas with no feedback.
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setContextLost(true); }, false);
        canvas.addEventListener('webglcontextrestored', () => setContextLost(false), false);
      }}
    >
      {SCENE_CONFIG.renderer.fog.enabled && (
        <fog
          attach="fog"
          args={[
            SCENE_CONFIG.renderer.fog.color,
            SCENE_CONFIG.renderer.fog.near,
            SCENE_CONFIG.renderer.fog.far,
          ]}
        />
      )}

      <VortexCamera phase={phase} />
      <VortexLighting />

      <Suspense fallback={null}>
        <VortexLayout
          phase={phase}
          selectedCardId={selectedCardId}
          onCardSelect={onCardSelect}
          onCarouselImageClick={onCarouselImageClick}
          onSelectionComplete={onSelectionComplete}
          onReturnComplete={onReturnComplete}
          carouselImages={carouselImages}
          setCarouselImages={setCarouselImages}
        />
        <GalleryScene
          phase={phase}
          backgroundImage={galleryBackground}
          floatingImages={galleryImages}
        />
      </Suspense>

      {/* Composer defaults are multisampling=8 + HalfFloat render targets —
          hundreds of MB of buffers for a Bloom and a Vignette, neither of which
          benefits from MSAA. Raise multisampling to 2 if card edges look
          stepped; it still costs a quarter of the default. */}
      {postProcessing.enabled && (
        <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>
          <Bloom
            mipmapBlur
            luminanceThreshold={postProcessing.bloom.threshold}
            luminanceSmoothing={0.9}
            intensity={reduceMotion ? 0 : postProcessing.bloom.strength}
            radius={postProcessing.bloom.radius}
          />
          <Vignette
            offset={postProcessing.vignette.offset}
            darkness={postProcessing.vignette.darkness}
          />
        </EffectComposer>
      )}
    </Canvas>
    {contextLost && (
      <div style={FALLBACK_STYLE}>
        {copy.contextLost}
      </div>
    )}
    </>
  );
}
