"use client";

import dynamic from "next/dynamic";
import type { VortexCopy } from "./copy";

// The vortex is browser-only (WebGL, postprocessing, GSAP-driven three refs).
// ssr:false keeps the whole tree — three/r3f/drei/postprocessing — off the
// server and out of every shared chunk. Next 16 forbids ssr:false inside a
// Server Component, so this dynamic() lives here, in a 'use client' file.
const VortexExperience = dynamic(
  () =>
    import("@/components/vortex/VortexExperience").then(
      (m) => m.VortexExperience,
    ),
  { ssr: false },
);

// `.vortex-immersive` restores a normal cursor over the site-wide `body { cursor:
// none }` (this route has no custom Cursor) and owns the viewport. The immersive
// route group inherits no site chrome — no topbar, no footer, no loader veil.
export function VortexClient({ copy }: { copy: VortexCopy }) {
  return (
    <div className="vortex-immersive">
      <VortexExperience copy={copy} exitHref="/graphic-designs" />
    </div>
  );
}
