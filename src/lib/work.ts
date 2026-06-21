// Selected work — the full-width rows. Order is the display order.
// `gen` rows host the live WebGL aura (variant: clean amber vs dusty ember).
// `web` rows show a still media plate (or a real site preview) and link out /
// route internally. No stock imagery anywhere — gen rows render Alberto's own
// shader live, and the one preview is a capture of his actual shipped site.

import type { StaticImageData } from "next/image";
import viniMontarello from "@/assets/work/vini-montarello.webp";

export type WorkVariant = "amber" | "ember";

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

export const WORK: Work[] = [
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
  {
    id: "liminal-field",
    index: "02",
    title: "Liminal Field",
    meta: "installation · led · 2025",
    type: "gen",
    variant: "amber",
  },
  {
    id: "aura-loops",
    index: "03",
    title: "Aura Loops",
    meta: "generative · touchdesigner · 2024",
    type: "gen",
    variant: "ember",
  },
  {
    id: "studio-next",
    index: "04",
    title: "Studio — next",
    meta: "web · soon",
    type: "web",
    href: "#work",
    external: false,
    mediaGradient: "linear-gradient(135deg,#101520,#0a0c10 55%,#141b22)",
  },
];
