"use client";

import dynamic from "next/dynamic";
import { VortexChunkVeil } from "@/components/vortex/components/VortexVeil.jsx";
import { LOADER_TAG } from "@/lib/boundary-copy";
import { useLocale } from "@/lib/use-locale";
import type { VortexCopy } from "./copy";

// While the three/r3f chunk downloads there used to be a black div; this is the
// same veil the textures get afterwards, with the site's loading tag. The
// `loading` component gets no props, so it reads the locale off <html lang>.
function ChunkVeil() {
  return <VortexChunkVeil label={LOADER_TAG[useLocale()]} />;
}

// The vortex is browser-only (WebGL, postprocessing, GSAP-driven three refs).
// ssr:false keeps the whole tree — three/r3f/drei/postprocessing — off the
// server and out of every shared chunk. Next 16 forbids ssr:false inside a
// Server Component, so this dynamic() lives here, in a 'use client' file.
const VortexExperience = dynamic(
  () =>
    import("@/components/vortex/VortexExperience").then(
      (m) => m.VortexExperience,
    ),
  { ssr: false, loading: ChunkVeil },
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
