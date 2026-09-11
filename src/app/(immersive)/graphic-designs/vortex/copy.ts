import type { Locale } from "@/lib/dictionary";

/**
 * All translatable text for the Image Vortex demo, keyed by locale. Same
 * arrangement as the sibling Tarassaco demo: the tree that renders it is
 * client-only (`ssr: false`), so `page.tsx` resolves the locale and hands these
 * strings down as one prop. Typing both entries as `VortexCopy` keeps EN/IT
 * parity compiler-enforced.
 *
 * "Image Vortex" is the piece's title and stays as-is in both locales; the two
 * phase names ("carousel"/"gallery" → "carosello"/"gallery") are the labels on
 * the step-back button, so they do get translated.
 */
export interface VortexCopy {
  metaTitle: string;
  metaDescription: string;
  /** aria-label describing the interaction on the canvas wrapper */
  aria: string;
  /** idle-scene hint, bottom-center — keeps its English voice in both locales, like the title */
  pickHint: string;
  exit: string;
  /** step-back button, labelled with the phase it returns to */
  backToCarousel: string;
  backToVortex: string;
  /** drei's texture-loading overlay — `{p}` is substituted with the percentage */
  loading: string;
  noWebgl: string;
  contextLost: string;
  /**
   * Mystic one-liners for the gallery: one is drawn at random when a carousel
   * image is picked and fades in beside the docked HUD card. The piece keeps
   * its English voice in both locales, like the title and the idle hint.
   */
  captions: readonly string[];
}

/** Shared by both locales — the gallery speaks English everywhere. */
const CAPTIONS: readonly string[] = [
  "a door opens where you look",
  "still water remembers every light",
  "the signal was always here",
  "some thresholds only open once",
  "what surfaces was never lost",
  "the quiet between frames is listening",
  "you did not choose alone",
  "memory develops in the dark",
  "the current carried this to you",
  "seen once, it stays lit",
  "the dark kept this one for you",
  "stillness is a kind of arrival",
  "light rests where you stopped",
  "every crossing leaves a glow",
];

const en: VortexCopy = {
  metaTitle: "Image Vortex — Merge",
  metaDescription:
    "An interactive 3D vortex of selected graphic work — pick a card, spin the carousel, open the gallery. Runs entirely in your browser.",
  aria: "Image Vortex — interactive 3D gallery. Enter opens the carousel, arrow keys browse it, Escape exits.",
  pickHint: "pick a card",
  exit: "✕ exit the demo",
  backToCarousel: "← carousel",
  backToVortex: "← vortex",
  loading: "Loading {p}%",
  noWebgl: "This experience needs WebGL, which your browser doesn’t support.",
  contextLost:
    "Graphics paused — the WebGL context was lost. Reload the page to continue.",
  captions: CAPTIONS,
};

const it: VortexCopy = {
  metaTitle: "Image Vortex — Merge",
  metaDescription:
    "Un vortice 3D interattivo di lavori grafici selezionati — scegli una carta, fai girare il carosello, apri la gallery. Gira tutto nel tuo browser.",
  aria: "Image Vortex — gallery 3D interattiva. Invio apre il carosello, le frecce lo sfogliano, Esc esce.",
  pickHint: "pick a card",
  exit: "✕ esci dalla demo",
  backToCarousel: "← carosello",
  backToVortex: "← vortice",
  loading: "Caricamento {p}%",
  noWebgl:
    "Questa esperienza ha bisogno di WebGL, che il tuo browser non supporta.",
  contextLost:
    "Grafica in pausa — il contesto WebGL è stato perso. Ricarica la pagina per continuare.",
  captions: CAPTIONS,
};

export const VORTEX_COPY: Record<Locale, VortexCopy> = { en, it };
