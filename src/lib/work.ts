// Work, grouped into sections — one section per route (/websites, /xperiments).
// A page asks WorkRows for its section by id; open-one-at-a-time state is per
// rendered list.
// `gen` rows host the live WebGL aura, each in its own colour family (amber /
// teal / violet — the same domain-warped smoke, different tints). `web` rows
// show a real site preview and link out. No stock imagery anywhere — gen rows
// render Alberto's own shader live, and the previews are captures of his
// actual shipped sites.

import type { StaticImageData } from "next/image";
import viniMontarello from "@/assets/work/vini-montarello.webp";
import torettoBlend from "@/assets/work/toretto-blend.webp";

// Mirrors the keys of VARIANT_PALETTE in src/components/canvas/aura-material.ts
// (kept as a plain union here so this data module never imports three).
export type WorkVariant = "amber" | "ember" | "teal" | "violet";

// Translatable copy (meta line, description, cue, image alt) lives in the
// dictionary, keyed by `id` (see src/lib/i18n.ts). This file stays structural
// and language-neutral — only ids, indices, project names and colours.
export interface Work {
  id: string;
  index: string;
  title: string;
  type: "web" | "gen";
  /** present on `gen` rows — selects the shader colour family */
  variant?: WorkVariant;
  /** present on `web` rows — destination */
  href?: string;
  /** open in a new tab (external) */
  external?: boolean;
  /** the site preview on `web` rows (a static import: next/image knows its
   *  size, the URL is content-hashed) */
  image?: StaticImageData;
}

export interface WorkSection {
  /** section id — the route that renders the section asks WorkRows for it by this id */
  id: string;
  items: Work[];
}

export const WORK_SECTIONS: WorkSection[] = [
  {
    id: "websites",
    items: [
      {
        id: "vini-montarello",
        index: "01",
        title: "Vini Montarello",
        type: "web",
        href: "https://vinimontarello.it",
        external: true,
        image: viniMontarello,
      },
      {
        id: "toretto-blend",
        index: "02",
        title: "Toretto Blend",
        type: "web",
        href: "https://www.torettoblend.com",
        external: true,
        image: torettoBlend,
      },
    ],
  },
  // No `graphic` section: its only row was a self-link to /graphic-designs, which
  // is now a first-class route in the topbar and a home teaser; its dictionary
  // entry went with it (round 3, audit I9).
  {
    id: "experiments",
    items: [
      {
        id: "liminal-field",
        index: "01",
        title: "Liminal Field",
        type: "gen",
        variant: "amber",
      },
      {
        id: "aura-loops",
        index: "02",
        title: "Aura Loops",
        type: "gen",
        variant: "teal",
      },
      {
        id: "studio-next",
        index: "03",
        title: "Studio — next",
        type: "gen",
        variant: "violet",
      },
    ],
  },
];
