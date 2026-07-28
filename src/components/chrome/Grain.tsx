// Fixed full-screen grain. The noise is a 180×180 SVG tile rasterised once by
// the CSS engine and repeated (see `.grain` in globals.css) — as a viewport-sized
// inline <svg> the feTurbulence was evaluated over every pixel on screen, and
// re-evaluated whenever the viewport changed (mobile URL bar retracting).
// `stitchTiles="stitch"` makes the tile seams invisible.
export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}
