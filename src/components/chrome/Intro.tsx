"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";
import { registerGsap, FIELD_EASE } from "@/lib/motion";

// Persist "this visitor has seen the intro" for a year, mirroring the locale
// cookie write (LocaleToggle). Kept at module scope so the document side effect
// stays out of the component body. Read server-side in layout.tsx.
function persistIntroSeen() {
  document.cookie = "intro-seen=1; path=/; max-age=31536000; samesite=lax";
}

const HOLD = 0.9; // s — the loading beat (kept short to bound first-visit LCP)
const FADE = 0.7; // s — crossfade out onto the live field

/**
 * First-visit loading screen: a full-viewport opaque void panel with the mono
 * eyebrow and the Fraunces name (amber period, matching the hero/OG), plus a
 * thin amber hairline that fills as a quiet progress cue. Auto-plays — no
 * interaction. Holds ~{@link HOLD}s, then GSAP crossfades it out on the
 * signature `field` ease, revealing the home where the retuned bubble field is
 * already alive (the energetic burst settling into the constant drift). On
 * complete it goes inert (pointer-events:none + visibility:hidden) so it traps
 * no focus, and writes the `intro-seen` cookie so later loads skip it.
 *
 * Rendered only on a first visit (cookie absent — layout gates it) and never
 * under reduced motion (early return below: AppProvider already marks the intro
 * done, so the home shows instantly with no shader/cursor).
 */
export function Intro({ eyebrow }: { eyebrow: string }) {
  const { reducedMotion, markIntroDone } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) return;
      registerGsap();
      const root = rootRef.current;
      const line = lineRef.current;
      if (!root || !line) return;

      gsap
        .timeline()
        .fromTo(
          line,
          { scaleX: 0 },
          { scaleX: 1, duration: HOLD, ease: FIELD_EASE },
        )
        .to(root, {
          opacity: 0,
          duration: FADE,
          ease: FIELD_EASE,
          // Flip introDone as the crossfade BEGINS so the Shell entrance (topbar
          // fade) reveals concurrently with the loader dissolving — rather than
          // the topbar showing through the fading veil and then snapping/re-fading.
          onStart: markIntroDone,
          onComplete: () => {
            root.style.visibility = "hidden";
            root.style.pointerEvents = "none";
            persistIntroSeen();
          },
        });
    },
    { dependencies: [reducedMotion] },
  );

  // Reduced motion never shows the loader (home is already marked done).
  if (reducedMotion) return null;

  return (
    <div className="intro" ref={rootRef} aria-hidden="true">
      <p className="intro-eyebrow">{eyebrow}</p>
      <p className="intro-name">
        Alberto Marocco<span className="intro-dot">.</span>
      </p>
      <span className="intro-line" ref={lineRef} />
    </div>
  );
}
