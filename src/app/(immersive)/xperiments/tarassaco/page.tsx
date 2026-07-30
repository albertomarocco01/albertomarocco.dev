import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { TARASSACO_COPY } from "./copy";
import { TarassacoClient } from "./client";

export async function generateMetadata(): Promise<Metadata> {
  const copy = TARASSACO_COPY[await getLocale()];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: "/xperiments/tarassaco" },
  };
}

// The demo tree is client-only (`ssr: false`, see client.tsx), so the locale is
// resolved here — the last server component on the route — and its copy handed
// down as one prop.
export default async function TarassacoPage() {
  return <TarassacoClient copy={TARASSACO_COPY[await getLocale()]} />;
}
