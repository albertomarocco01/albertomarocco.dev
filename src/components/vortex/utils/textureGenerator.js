import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/scene.config.js';

const textureCache = new Map();

/**
 * Generates a CanvasTexture for a given category card.
 * Memoized — each category is only generated once.
 */
export function generateCardTexture(
  category,
  width = SCENE_CONFIG.cards.texture.width,
  height = SCENE_CONFIG.cards.texture.height
) {
  if (textureCache.has(category.id)) {
    return textureCache.get(category.id);
  }

  const { logoScale, logoY } = SCENE_CONFIG.cards.texture;
  const labelConfig = SCENE_CONFIG.cards.label;
  const idTagConfig = SCENE_CONFIG.cards.idTag;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Background fill
  ctx.fillStyle = category.color;
  ctx.fillRect(0, 0, width, height);

  // Subtle gradient overlay for depth
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255,255,255,0.08)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Dashed inner border
  const inset = 12;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  ctx.setLineDash([]);

  // 3. Zigzag icon
  const iconW = width * logoScale;
  const iconH = iconW * 0.35;
  const centerX = width / 2;
  const centerY = height * logoY;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  const startX = centerX - iconW / 2;
  const endX = centerX + iconW / 2;
  const topY = centerY - iconH / 2;
  const botY = centerY + iconH / 2;
  const segW = iconW / 3;

  ctx.moveTo(startX, topY);
  ctx.bezierCurveTo(startX + segW * 0.5, topY, startX + segW * 0.5, botY, startX + segW, botY);
  ctx.bezierCurveTo(startX + segW * 1.5, botY, startX + segW * 1.5, topY, startX + segW * 2, topY);
  ctx.bezierCurveTo(startX + segW * 2.5, topY, startX + segW * 2.5, botY, endX, botY);
  ctx.stroke();

  // 4. Category name
  ctx.font = `${labelConfig.fontWeight} ${labelConfig.fontSize}px ${labelConfig.fontFamily}`;
  ctx.fillStyle = labelConfig.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (labelConfig.shadowBlur > 0) {
    ctx.shadowColor = labelConfig.shadowColor;
    ctx.shadowBlur = labelConfig.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
  }

  const nameY = centerY + iconH / 2 + 20;
  ctx.fillText(category.name, centerX, nameY, width - 40);

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // 5. Module ID label (bottom-left)
  ctx.font = `${idTagConfig.fontWeight} ${idTagConfig.fontSize}px ${idTagConfig.fontFamily}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(category.id, idTagConfig.paddingLeft, height - 16);

  // Convert to texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  textureCache.set(category.id, texture);
  return texture;
}

/**
 * Clears the texture cache — useful for hot-reload.
 */
export function clearTextureCache() {
  for (const texture of textureCache.values()) {
    texture.dispose();
  }
  textureCache.clear();
}
