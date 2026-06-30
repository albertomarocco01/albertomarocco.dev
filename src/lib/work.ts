// Work, grouped into sections. Each section renders its own label + rows; the
// open-one-at-a-time state stays global across all of them (see WorkRows).
// `gen` rows host the live WebGL aura, each in its own colour family (amber /
// teal / violet — the same domain-warped smoke, different tints). `web` rows
// show a still media plate (or a real site preview) and link out / route
// internally. No stock imagery anywhere — gen rows render Alberto's own shader
// live, and the one preview is a capture of his actual shipped site.

import type { StaticImageData } from "next/image";
import viniMontarello from "@/assets/work/vini-montarello.webp";

// Mirrors the keys of VARIANT_PALETTE in src/components/canvas/aura-material.ts
// (kept as a plain union here so this data module never imports three).
export type WorkVariant = "amber" | "ember" | "teal" | "violet";

// Translatable copy (description, cue) lives in the dictionary, keyed by `id`
// (see src/lib/i18n.ts). This file stays structural and language-neutral.
export interface Work {
  id: string;
  index: string;
  title: string;
  meta: string;
  type: "web" | "gen";
  /** present on `gen` rows — selects the shader colour family */
  variant?: WorkVariant;
  /** present on `web` rows — destination */
  href?: string;
  /** open in a new tab (external) */
  external?: boolean;
  /** CSS background for the still media plate on `web` rows (fallback) */
  mediaGradient?: string;
  /** optimized site preview on `web` rows — shown via next/image, not a plate */
  image?: StaticImageData;
  /** alt text for the preview image */
  imageAlt?: string;
}

export interface WorkSection {
  /** section id — also the i18n key for its label (see dict.work.sections) */
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
        meta: "web · 2025",
        type: "web",
        href: "https://vinimontarello.it",
        external: true,
        mediaGradient: "linear-gradient(135deg,#1a1410,#0e0c0a 55%,#241a12)",
        image: viniMontarello,
        imageAlt:
          "Vini Montarello homepage — vineyards in the Monferrato hills behind the winery's wordmark",
      },
    ],
  },
  {
    id: "graphic",
    items: [
      {
        id: "merge-graphic-designs",
        index: "01",
        title: "Merge — Graphic Designs",
        meta: "graphic · 2025",
        type: "web",
        href: "/graphic-designs",
        external: false,
        mediaGradient: "linear-gradient(135deg,#161020,#0b0a10 55%,#1d1424)",
      },
    ],
  },
  {
    id: "experiments",
    items: [
      {
        id: "liminal-field",
        index: "01",
        title: "Liminal Field",
        meta: "installation · led · 2025",
        type: "gen",
        variant: "amber",
      },
      {
        id: "aura-loops",
        index: "02",
        title: "Aura Loops",
        meta: "generative · touchdesigner · 2024",
        type: "gen",
        variant: "teal",
      },
      {
        id: "studio-next",
        index: "03",
        title: "Studio — next",
        meta: "web · soon",
        type: "gen",
        variant: "violet",
      },
    ],
  },
];

/** Flat list of every work, in display order — for any consumer that needs it. */
export const WORK: Work[] = WORK_SECTIONS.flatMap((s) => s.items);
