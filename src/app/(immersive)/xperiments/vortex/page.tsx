import type { Metadata } from "next";
import { VortexClient } from "./client";

export const metadata: Metadata = {
  title: "Image Vortex — Merge",
  description:
    "An interactive 3D vortex of selected graphic work — pick a card, spin the carousel, open the gallery. Runs entirely in your browser.",
  alternates: { canonical: "/xperiments/vortex" },
};

export default function VortexPage() {
  return <VortexClient />;
}
