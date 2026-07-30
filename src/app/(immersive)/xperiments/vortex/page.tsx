import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { VORTEX_COPY } from "./copy";
import { VortexClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const copy = VORTEX_COPY[await getLocale()];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: "/xperiments/vortex" },
  };
}

// The vortex tree is client-only (`ssr: false`, see client.tsx), so the locale is
// resolved here — the last server component on the route — and its copy handed
// down as one prop.
export default async function VortexPage() {
  return <VortexClient copy={VORTEX_COPY[await getLocale()]} />;
}
