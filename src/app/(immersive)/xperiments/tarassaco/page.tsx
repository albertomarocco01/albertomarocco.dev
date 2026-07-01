import type { Metadata } from "next";
import { TarassacoClient } from "./client";

export const metadata: Metadata = {
  title: "Tarassaco — Dandelion Wind",
  description:
    "Blow into your microphone to scatter the text like dandelion seeds. An interactive editorial experiment that runs entirely in your browser — nothing is recorded or sent anywhere.",
  alternates: { canonical: "/xperiments/tarassaco" },
};

export default function TarassacoPage() {
  return <TarassacoClient />;
}
