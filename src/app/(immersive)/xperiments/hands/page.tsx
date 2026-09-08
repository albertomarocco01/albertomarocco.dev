import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { HANDS_COPY } from "./copy";
import { HandsClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const copy = HANDS_COPY[await getLocale()];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: "/xperiments/hands" },
  };
}

// The demo tree is client-only (`ssr: false`, see client.tsx), so the locale is
// resolved here — the last server component on the route — and its copy handed
// down as one prop. Same arrangement as the sibling Tarassaco / Vortex demos.
export default async function HandsPage() {
  return <HandsClient copy={HANDS_COPY[await getLocale()]} />;
}
