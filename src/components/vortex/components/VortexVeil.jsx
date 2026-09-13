"use client";

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";

// One look for every wait on this route — the dynamic() chunk (client.tsx) and
// then the textures (below): the site's mono tag, dim, on black, the same as
// the (immersive) loading.tsx fallback. Inline styles on purpose: the vortex
// has no stylesheet of its own yet (its rules live in globals.css, owned by
// the chrome package).
export const VEIL_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 5,
  display: "grid",
  placeItems: "center",
  background: "#000",
  color: "#e8e4dd",
  fontFamily: "var(--mono)",
  fontSize: "0.72rem",
  letterSpacing: "0.24em",
  textTransform: "lowercase",
  opacity: 0.5,
  pointerEvents: "none",
};

/** The dynamic() chunk fallback: the same veil before any texture exists. */
export function VortexChunkVeil({ label }) {
  return (
    <div style={VEIL_STYLE} aria-busy="true">
      {label}
    </div>
  );
}

/**
 * The texture veil. Drei's <Loader> came back for every later batch — the two
 * outer rings now load on idle (VortexLayout) — so this one lifts once the
 * first batch has landed and never returns. A revisit with the textures
 * still cached never raises `active`, so it never shows at all.
 */
export function VortexVeil({ copy }) {
  const { active, progress } = useProgress();
  const seen = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (active) seen.current = true;
    else if (seen.current) setDone(true);
  }, [active]);

  if (done || !active) return null;
  return (
    <div style={VEIL_STYLE} aria-busy="true">
      {copy.loading.replace("{p}", progress.toFixed(0))}
    </div>
  );
}
