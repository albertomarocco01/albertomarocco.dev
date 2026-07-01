/**
 * Utilities for card dimension calculations.
 */

/**
 * Calculates a width and height for a card given its image aspect ratio
 * and target base width, clamped to min/max bounds in the config.
 * 
 * @param {number} aspectRatio - W / H from the original image
 * @param {number} baseWidth - Target width before clamping
 * @param {object} config - SCENE_CONFIG.cards with minWidth, maxWidth, minHeight, maxHeight
 * @returns {object} { width, height }
 */
export function getClampedSize(aspectRatio, baseWidth, config) {
  const { minWidth, maxWidth, minHeight, maxHeight } = config;

  // 1. Start with the target width
  let width = baseWidth;
  let height = width / aspectRatio;

  // 2. Adjust for height bounds
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  } else if (height < minHeight) {
    height = minHeight;
    width = height * aspectRatio;
  }

  // 3. Adjust for width bounds (second pass, might shift height again but stays scaled)
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  } else if (width < minWidth) {
    width = minWidth;
    height = width / aspectRatio;
  }

  // 4. One final height check just in case (for extreme ratios)
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  } else if (height < minHeight) {
    height = minHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}
