/**
 * Small 2D helpers for the tear: clip a rectangle with a half-plane and take
 * the centroid / bounding radius of what is left. Everything is in a card's
 * local, unit-area coordinates (origin at the centre).
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Polygon {
  points: Vec2[];
  centroid: Vec2;
  /** farthest vertex from the centroid */
  radius: number;
  area: number;
}

/**
 * Keep the part of the rectangle (half extents hw, hh) where
 * `sign · dot(p − o, n) ≥ 0`. Sutherland–Hodgman against one edge.
 */
export function clipRect(
  hw: number,
  hh: number,
  o: Vec2,
  n: Vec2,
  sign: 1 | -1,
): Polygon {
  const rect: Vec2[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  const side = (p: Vec2) => sign * ((p.x - o.x) * n.x + (p.y - o.y) * n.y);
  const out: Vec2[] = [];
  for (let i = 0; i < rect.length; i++) {
    const a = rect[i];
    const b = rect[(i + 1) % rect.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return polygonStats(out);
}

export function polygonStats(points: Vec2[]): Polygon {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  area *= 0.5;
  const centroid =
    Math.abs(area) < 1e-9
      ? { x: 0, y: 0 }
      : { x: cx / (6 * area), y: cy / (6 * area) };
  let radius = 0;
  for (const p of points) {
    radius = Math.max(radius, Math.hypot(p.x - centroid.x, p.y - centroid.y));
  }
  return { points, centroid, radius, area: Math.abs(area) };
}

/** Full extent of a w × h rectangle projected onto the unit axis `a`. */
export function extentAlong(w: number, h: number, a: Vec2): number {
  return w * Math.abs(a.x) + h * Math.abs(a.y);
}
