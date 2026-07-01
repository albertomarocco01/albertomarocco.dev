import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config.js';
import { VortexCamera } from './VortexCamera.jsx';
import { VortexLighting } from './VortexLighting.jsx';
import { VortexLayout } from './VortexLayout.jsx';
import { GalleryScene } from './GalleryScene.jsx';
import { GalleryTransitionScene } from './GalleryTransitionScene.jsx';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export function VortexScene({
  phase,
  selectedCardId,
  onCardSelect,
  onCarouselImageClick,
  onSelectionComplete,
  onReturnComplete,
  onEnteringGalleryComplete,
  galleryBackground,
  galleryImages,
  carouselImages,
  setCarouselImages,
  autoSelectImageId,
}) {
  const { postProcessing } = SCENE_CONFIG;

  return (
    <Canvas
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
          autoSelectImageId={autoSelectImageId}
        />
        <GalleryTransitionScene
          phase={phase}
          images={carouselImages}
          selectedImage={galleryBackground}
          onComplete={onEnteringGalleryComplete}
        />
        <GalleryScene
          phase={phase}
          backgroundImage={galleryBackground}
          floatingImages={galleryImages}
        />
      </Suspense>

      {postProcessing.enabled && (
        <EffectComposer>
          <Bloom
            mipmapBlur
            luminanceThreshold={postProcessing.bloom.threshold}
            luminanceSmoothing={0.9}
            intensity={postProcessing.bloom.strength}
            radius={postProcessing.bloom.radius}
          />
          <Vignette
            offset={postProcessing.vignette.offset}
            darkness={postProcessing.vignette.darkness}
          />
        </EffectComposer>
      )}
    </Canvas>
  );
}
