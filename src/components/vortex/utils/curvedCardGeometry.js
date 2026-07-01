/**
 * Utility for generating curved card geometry.
 */

/**
 * Calculates the bend strength from typical configuration parameters.
 * @param {number} curvatureAngle - Total arc angle in degrees the card spans.
 * @param {number} cardWidth - Width of the card in world units.
 * @param {number} ringRadius - Radius of the ring in world units.
 * @returns {number} The calculated bend strength.
 */
export function calculateBendStrength(curvatureAngle, cardWidth, ringRadius) {
  const curvatureRad = curvatureAngle * (Math.PI / 180);
  return (curvatureRad * ringRadius) / cardWidth;
}

/**
 * Generates the geometry buffers (positions, normals, uvs, indices) for a curved card.
 * Can be directly assigned to a THREE.BufferGeometry's attributes.
 * 
 * @param {Object} params
 * @param {number} params.width - Card width
 * @param {number} params.height - Card height
 * @param {number} params.ringRadius - Radius of the ring
 * @param {number} [params.bendStrength=1.0] - Bend multiplier (1 = follows ring exactly, 0 = flat)
 * @param {number} [params.widthSegments=14] - Number of horizontal subdivisions
 * @param {number} [params.heightSegments=1] - Number of vertical subdivisions
 * @returns {Object} { positions: Float32Array, normals: Float32Array, uvs: Float32Array, indices: Uint16Array|Uint32Array }
 */
export function buildCurvedCardGeometry({
  width,
  height,
  ringRadius,
  bendStrength = 1.0,
  widthSegments = 14,
  heightSegments = 1
}) {
  const widthHalf = width / 2;
  const heightHalf = height / 2;

  const gridX = Math.max(1, Math.floor(widthSegments));
  const gridY = Math.max(1, Math.floor(heightSegments));
  
  const gridX1 = gridX + 1;
  const gridY1 = gridY + 1;

  const segmentWidth = width / gridX;
  const segmentHeight = height / gridY;

  const vertexCount = gridX1 * gridY1;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  const effectiveRadius = bendStrength === 0 ? Infinity : ringRadius / bendStrength;

  let vertexIndex = 0;

  for (let iy = 0; iy < gridY1; iy++) {
    const y = heightHalf - iy * segmentHeight;
    // v is flipped so that v=1 at the top, matching Three.js convention
    const v = 1 - (iy / gridY);

    for (let ix = 0; ix < gridX1; ix++) {
      const xFlat = ix * segmentWidth - widthHalf;
      const u = ix / gridX;

      let pos_x, pos_z, norm_x, norm_z;

      if (bendStrength === 0) {
        // Flat card
        pos_x = xFlat;
        pos_z = 0;
        norm_x = 0;
        norm_z = 1;
      } else {
        // Curved card (wrapping around effective cylinder)
        const alpha = xFlat / effectiveRadius;
        
        // Tangential displacement
        pos_x = effectiveRadius * Math.sin(alpha);
        // Depth displacement (curving backward toward ring center, negative Z)
        pos_z = effectiveRadius * (Math.cos(alpha) - 1);
        
        // Analytical normal pointing outward from cylinder
        norm_x = Math.sin(alpha);
        norm_z = Math.cos(alpha);
      }

      positions[vertexIndex * 3] = pos_x;
      positions[vertexIndex * 3 + 1] = y;
      positions[vertexIndex * 3 + 2] = pos_z;

      normals[vertexIndex * 3] = norm_x;
      normals[vertexIndex * 3 + 1] = 0;
      normals[vertexIndex * 3 + 2] = norm_z;

      uvs[vertexIndex * 2] = u;
      uvs[vertexIndex * 2 + 1] = v;

      vertexIndex++;
    }
  }

  // Generate indices
  const indexCount = gridX * gridY * 6;
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  let indexOffset = 0;

  for (let iy = 0; iy < gridY; iy++) {
    for (let ix = 0; ix < gridX; ix++) {
      const a = ix + gridX1 * iy;             // TL
      const b = (ix + 1) + gridX1 * iy;       // TR
      const c = ix + gridX1 * (iy + 1);       // BL
      const d = (ix + 1) + gridX1 * (iy + 1); // BR

      // Counter-clockwise front-facing (+Z) triangles: [a,c,b] and [c,d,b]
      indices[indexOffset]     = a;
      indices[indexOffset + 1] = c;
      indices[indexOffset + 2] = b;

      indices[indexOffset + 3] = c;
      indices[indexOffset + 4] = d;
      indices[indexOffset + 5] = b;

      indexOffset += 6;
    }
  }

  return { positions, normals, uvs, indices };
}

/**
 * Validates the angular footprint of cards placed on a ring to ensure no overlap.
 * @param {Object} params
 * @param {number} params.numCards - Number of cards on the ring
 * @param {number} params.cardWidth - Width of a single card
 * @param {number} params.ringRadius - Radius of the ring
 * @param {number} [params.bendStrength=1.0] - Exact bend strength multiplier used
 * @returns {Object} Metric data concerning gaps and potential overlap.
 */
export function validateCardLayout({ numCards, cardWidth, ringRadius, bendStrength = 1.0 }) {
  let angularSpanPerCardRad;

  if (bendStrength === 0) {
    // If completely flat, angular span is just the chord span
    angularSpanPerCardRad = 2 * Math.asin(cardWidth / (2 * ringRadius));
  } else {
    // Accurate angular footprint of the curved card as seen from ring center
    const effectiveRadius = ringRadius / bendStrength;
    const alphaEdge = (cardWidth / 2) / effectiveRadius;
    const worldRadial = ringRadius + effectiveRadius * (Math.cos(alphaEdge) - 1);
    const worldTangential = effectiveRadius * Math.sin(alphaEdge);
    angularSpanPerCardRad = 2 * Math.atan2(worldTangential, worldRadial);
  }

  const angularSpanPerCardDeg = angularSpanPerCardRad * (180 / Math.PI);
  
  const totalArcSpanRad = numCards * angularSpanPerCardRad;
  const totalArcSpanDeg = totalArcSpanRad * (180 / Math.PI);
  
  const fullCircleRad = 2 * Math.PI;
  const isValid = totalArcSpanRad <= fullCircleRad;
  
  const angularStepRad = fullCircleRad / numCards;
  const gapRad = angularStepRad - angularSpanPerCardRad;
  const gapDegrees = gapRad * (180 / Math.PI);
  const gapWorldUnits = gapRad * ringRadius;
  
  let overFlowPercentage = 0;
  if (!isValid) {
    overFlowPercentage = ((totalArcSpanRad - fullCircleRad) / fullCircleRad) * 100;
    console.warn(
      `[CurvedCardGeometry] Card overlap detected!\n` +
      `Total arc span: ${totalArcSpanDeg.toFixed(1)}° (exceeds 360° by ${overFlowPercentage.toFixed(1)}%)\n` +
      `Gap is negative: ${gapDegrees.toFixed(1)}° (${gapWorldUnits.toFixed(2)} wu)\n` +
      `Consider adjusting numCards, cardWidth, ringRadius, or bendStrength.`
    );
  }
  
  return {
    isValid,
    gapDegrees,
    gapWorldUnits,
    totalArcSpanDegrees: totalArcSpanDeg,
    overFlowPercentage
  };
}
