"use client";

import { useApp } from "@/components/providers/AppProvider";

/**
 * Entrance gate. A single lowercase CTA wakes the field. On enter the gate
 * fades and the canvas does its brief amber wash (see Field). Skipped under
 * reduced motion (also hidden via CSS for the no-JS path).
 */
export function Gate() {
  const { entered, enter, reducedMotion } = useApp();
  if (reducedMotion) return null;

  return (
    <div className={`gate${entered ? " gone" : ""}`} aria-hidden={entered}>
      <div className="g-eyebrow">
        full-stack developer &amp; creative technologist based in Turin
      </div>
      <div className="g-name">
        Alberto Marocco<em>.dev</em>
      </div>
      <button className="g-enter" type="button" onClick={enter}>
        enter the field ✲
      </button>
    </div>
  );
}
