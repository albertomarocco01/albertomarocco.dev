"use client";

import { useApp } from "@/components/providers/AppProvider";

/**
 * Entrance gate. A single lowercase CTA wakes the field. On enter the
 * orchestrated entrance (Shell) lifts + fades the gate out, blooms the white
 * field, and rises the home in. GSAP owns the fade-out, so we no longer toggle
 * a `.gone` opacity class here — only `aria-hidden`/pointer state. Skipped under
 * reduced motion (also hidden via CSS for the no-JS path).
 */
export function Gate() {
  const { entered, enter, reducedMotion } = useApp();
  if (reducedMotion) return null;

  return (
    <div className="gate" aria-hidden={entered}>
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
