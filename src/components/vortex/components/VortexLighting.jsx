import React from 'react';
import { SCENE_CONFIG } from '../config/scene.config.js';

/**
 * Purely presentational lighting component rendering ambient, directional,
 * and point lights according to scene configuration.
 */
export function VortexLighting() {
  const { ambient, directional, pointLights } = SCENE_CONFIG.lighting;

  return (
    <>
      {/* Base Global Environment lighting */}
      <ambientLight 
        color={ambient.color} 
        intensity={ambient.intensity} 
      />
      
      {/* Primary key lighting casting standard PBR directional shadows */}
      <directionalLight 
        color={directional.color} 
        intensity={directional.intensity} 
        position={directional.position}
        castShadow={directional.castShadow}
        shadow-mapSize-width={directional.shadowMapSize}
        shadow-mapSize-height={directional.shadowMapSize}
        shadow-bias={directional.shadowBias}
      />

      {/* Stylistic glow/mood point-lights loaded dynamically through config setup */}
      {pointLights && pointLights.map((light, index) => (
        <pointLight
          key={light.id || index}
          color={light.color}
          intensity={light.intensity}
          position={light.position}
          distance={light.distance}
          decay={light.decay}
        />
      ))}
    </>
  );
}
