import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { DARKROOM_COPY } from "./copy";
import { DarkroomClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const copy = DARKROOM_COPY[await getLocale()];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: "/xperiments/darkroom" },
  };
}

// The demo tree is client-only (`ssr: false`, see client.tsx), so the locale is
// resolved here — the last server component on the route — and its copy handed
// down as one prop. Same arrangement as the sibling Tarassaco / Vortex demos.
export default async function DarkroomPage() {
  return <DarkroomClient copy={DARKROOM_COPY[await getLocale()]} />;
}
