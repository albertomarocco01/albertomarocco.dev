"use client";

import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { setExciteRect, clearExcite } from "@/components/canvas/excite";

/**
 * The teasers' bubble-field excitation — DOM half. Renders nothing; delegated
 * listeners (one set on document, same stance as Cursor's hover detection)
 * catch hover AND keyboard focus on any `.teaser`, project the label's screen
 * rect into the field's space (excite.ts) and let Aura's physics do the rest.
 * pointerover also fires on a touch tap, which is exactly the "tap-focus"
 * story touch gets. Mounted only on the home (inside Teasers), removed with
 * it. Under reduced motion the field doesn't exist — nothing to excite.
 */
export function TeaserFX() {
  const { reducedMotion } = useApp();

  useEffect(() => {
    if (reducedMotion) return;

    const aim = (t: EventTarget | null) => {
      const teaser = t instanceof Element ? t.closest<HTMLElement>(".teaser") : null;
      if (!teaser) return null;
      const label =
        teaser.querySelector<HTMLElement>(".teaser-label") ?? teaser;
      setExciteRect(label.getBoundingClientRect());
      return teaser;
    };
    // Leaving one teaser for another lands as the next enter — the shared
    // slot just retargets and the centre lerps over (Aura).
    const leave = (e: { target: EventTarget | null; relatedTarget?: EventTarget | null }) => {
      const teaser =
        e.target instanceof Element ? e.target.closest(".teaser") : null;
      if (!teaser) return;
      const to = e.relatedTarget;
      if (to instanceof Node && teaser.contains(to)) return; // still inside
      clearExcite();
    };
    const onOver = (e: PointerEvent) => aim(e.target);
    const onFocus = (e: FocusEvent) => aim(e.target);

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", leave, { passive: true });
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", leave);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", leave);
      clearExcite();
    };
  }, [reducedMotion]);

  return null;
}
