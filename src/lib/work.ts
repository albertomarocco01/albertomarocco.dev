// Selected work — the full-width rows. Order is the display order.
// `gen` rows host the live WebGL aura (variant: clean amber vs dusty ember).
// `web` rows show a still media plate and link out / route internally.
// No stock imagery anywhere — gen rows render Alberto's own shader live.

export type WorkVariant = "amber" | "ember";

export interface Work {
  id: string;
  index: string;
  title: string;
  meta: string;
  description: string;
  cue: string;
  type: "web" | "gen";
  /** present on `gen` rows — selects the shader colour family */
  variant?: WorkVariant;
  /** present on `web` rows — destination */
  href?: string;
  /** open in a new tab (external) */
  external?: boolean;
  /** CSS background for the still media plate on `web` rows */
  mediaGradient?: string;
}

export const WORK: Work[] = [
  {
    id: "vini-montarello",
    index: "01",
    title: "Vini Montarello",
    meta: "web · 2025",
    description:
      "Winery brand & e-commerce. Full-stack build, slow scroll, product as ritual.",
    cue: "view live ↗",
    type: "web",
    href: "https://vinimontarello.it",
    external: true,
    mediaGradient: "linear-gradient(135deg,#1a1410,#0e0c0a 55%,#241a12)",
  },
  {
    id: "liminal-field",
    index: "02",
    title: "Liminal Field",
    meta: "installation · led · 2025",
    description:
      "Real-time generative loop for a 6×3m LED wall — domain-warped noise field, painted live by the shared WebGL canvas.",
    cue: "live · webgl",
    type: "gen",
    variant: "amber",
  },
  {
    id: "aura-loops",
    index: "03",
    title: "Aura Loops",
    meta: "generative · touchdesigner · 2024",
    description:
      "Seamless ambient loops, prototyped in shader and finished in TouchDesigner for the install.",
    cue: "live · webgl",
    type: "gen",
    variant: "ember",
  },
  {
    id: "studio-next",
    index: "04",
    title: "Studio — next",
    meta: "web · soon",
    description:
      "Physics-based web experience, in progress — Next.js + React Three Fiber.",
    cue: "coming soon",
    type: "web",
    href: "#work",
    external: false,
    mediaGradient: "linear-gradient(135deg,#101520,#0a0c10 55%,#141b22)",
  },
];

// Slow mono marquee — real info only (discipline · location · availability).
export const TICKER_ITEMS = [
  "generative visuals",
  "full-stack web",
  "led walls",
  "webgl / webgpu",
  "touchdesigner",
  "based in turin",
  "available 2026",
];
