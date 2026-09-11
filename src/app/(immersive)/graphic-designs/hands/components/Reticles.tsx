import { useEffect, useRef } from "react";

/**
 * Two small mono rings, one per hand, at the index fingertips. The frame loop
 * positions them (transform) and toggles `is-on` / `is-pinch`; the CSS does
 * the contraction. That is the only feedback: no skeleton, no video.
 */
export function Reticles({ register }: { register: (els: (HTMLDivElement | null)[]) => void }) {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  useEffect(() => {
    register([a.current, b.current]);
    return () => register([null, null]);
  }, [register]);
  return (
    <div className="hands-reticles" aria-hidden="true">
      <div ref={a} className="hands-reticle" />
      <div ref={b} className="hands-reticle" />
    </div>
  );
}
