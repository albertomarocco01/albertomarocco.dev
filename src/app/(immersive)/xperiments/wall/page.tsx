import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { WALL_COPY } from "./copy";
import { WallClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const copy = WALL_COPY[await getLocale()];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: "/xperiments/wall" },
  };
}

// The demo tree is client-only (`ssr: false`, see client.tsx), so the locale is
// resolved here — the last server component on the route — and its copy handed
// down as one prop. Same arrangement as the sibling Tarassaco / Vortex demos.
export default async function WallPage() {
  return <WallClient copy={WALL_COPY[await getLocale()]} />;
}
